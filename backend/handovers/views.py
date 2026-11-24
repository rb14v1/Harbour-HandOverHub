import re

from bson import ObjectId
from bson.errors import InvalidId
from rest_framework import status as http
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import db
from .ai import AIConfigError, AIServiceError, generate_summary

FIELDS = [
    "employee_name",
    "recipient_name",
    "department",
    "project_title",
    "work_description",
    "completed_tasks",
    "pending_tasks",
    "blockers",
    "important_notes",
    "priority",
    "deadline",
]
REQUIRED = ["employee_name", "recipient_name", "project_title", "work_description", "priority"]
PRIORITIES = ("Low", "Medium", "High")
STATUSES = ("Pending", "In Progress", "Completed")


def _object_id(value):
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def _clean(data):
    return {field: str(data.get(field) or "").strip() for field in FIELDS}


def _validate(data):
    missing = [field for field in REQUIRED if not data[field]]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    if data["priority"] not in PRIORITIES:
        return "Priority must be Low, Medium or High."
    return None


@api_view(["GET", "POST"])
def handovers(request):
    collection = db.get_collection()

    if request.method == "POST":
        data = _clean(request.data)
        error = _validate(data)
        if error:
            return Response({"error": error}, status=http.HTTP_400_BAD_REQUEST)
        stamp = db.now()
        doc = {**data, "status": "Pending", "created_at": stamp, "updated_at": stamp}
        collection.insert_one(doc)
        return Response(db.serialize(doc), status=http.HTTP_201_CREATED)

    query = {}
    text = request.query_params.get("q", "").strip()
    if text:
        pattern = {"$regex": re.escape(text), "$options": "i"}
        query["$or"] = [{"employee_name": pattern}, {"project_title": pattern}]
    priority = request.query_params.get("priority", "")
    if priority in PRIORITIES:
        query["priority"] = priority
    status_filter = request.query_params.get("status", "")
    if status_filter in STATUSES:
        query["status"] = status_filter

    docs = collection.find(query).sort("created_at", -1)
    return Response([db.serialize(doc) for doc in docs])


@api_view(["GET", "PATCH", "DELETE"])
def handover_detail(request, id):
    oid = _object_id(id)
    if oid is None:
        return Response({"error": "Invalid handover id."}, status=http.HTTP_400_BAD_REQUEST)
    collection = db.get_collection()

    if request.method == "DELETE":
        if collection.delete_one({"_id": oid}).deleted_count == 0:
            return Response({"error": "Handover not found."}, status=http.HTTP_404_NOT_FOUND)
        return Response(status=http.HTTP_204_NO_CONTENT)

    if request.method == "PATCH":
        new_status = request.data.get("status")
        if new_status not in STATUSES:
            return Response(
                {"error": "Status must be Pending, In Progress or Completed."},
                status=http.HTTP_400_BAD_REQUEST,
            )
        collection.update_one({"_id": oid}, {"$set": {"status": new_status, "updated_at": db.now()}})

    doc = collection.find_one({"_id": oid})
    if doc is None:
        return Response({"error": "Handover not found."}, status=http.HTTP_404_NOT_FOUND)
    return Response(db.serialize(doc))


@api_view(["POST"])
def handover_summary(request, id):
    oid = _object_id(id)
    if oid is None:
        return Response({"error": "Invalid handover id."}, status=http.HTTP_400_BAD_REQUEST)
    doc = db.get_collection().find_one({"_id": oid})
    if doc is None:
        return Response({"error": "Handover not found."}, status=http.HTTP_404_NOT_FOUND)

    try:
        summary = generate_summary(db.serialize(doc))
    except AIConfigError as exc:
        return Response({"error": str(exc)}, status=http.HTTP_503_SERVICE_UNAVAILABLE)
    except AIServiceError as exc:
        return Response({"error": str(exc)}, status=http.HTTP_502_BAD_GATEWAY)
    except Exception:
        return Response({"error": "AI summary failed unexpectedly. Check the backend log."}, status=http.HTTP_502_BAD_GATEWAY)
    return Response({"summary": summary})


@api_view(["GET"])
def dashboard(request):
    collection = db.get_collection()
    by_status = {s: collection.count_documents({"status": s}) for s in STATUSES}
    recent = collection.find({}).sort("created_at", -1).limit(5)
    return Response(
        {
            "total": collection.count_documents({}),
            "by_status": by_status,
            "high_priority_open": collection.count_documents(
                {"priority": "High", "status": {"$ne": "Completed"}}
            ),
            "recent": [db.serialize(doc) for doc in recent],
        }
    )
