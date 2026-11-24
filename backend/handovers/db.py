from datetime import datetime, timezone

from django.conf import settings
from pymongo import MongoClient

SAMPLES = [
    {
        "employee_name": "Priya Sharma",
        "recipient_name": "Rahul Verma",
        "department": "Engineering",
        "project_title": "Payments API Migration",
        "work_description": "Migrated checkout payment endpoints to the new gateway SDK and updated retry logic.",
        "completed_tasks": "Migrated card payments\nUpdated webhook signature checks",
        "pending_tasks": "Migrate refund endpoints\nLoad test at 3x peak traffic",
        "blockers": "Sandbox rate limits slow down integration tests",
        "important_notes": "Feature flag payments_v2 is off in production. Keep it off until refunds are migrated.",
        "priority": "High",
        "deadline": "2026-12-05",
        "status": "In Progress",
    },
    {
        "employee_name": "Daniel Okafor",
        "recipient_name": "Sophie Chen",
        "department": "Marketing",
        "project_title": "Q1 Campaign Launch",
        "work_description": "Prepared the Q1 campaign creative, audience segments and launch calendar.",
        "completed_tasks": "Creative briefs approved\nAudience segments built",
        "pending_tasks": "Final copy review with legal\nSchedule paid social ads",
        "blockers": "Legal review of claims is waiting on product data",
        "important_notes": "Budget is capped at 40k for the first two weeks.",
        "priority": "Medium",
        "deadline": "2026-12-20",
        "status": "Pending",
    },
    {
        "employee_name": "Aisha Khan",
        "recipient_name": "Liam Brown",
        "department": "Finance",
        "project_title": "Year-end Reconciliation",
        "work_description": "Reconciled vendor accounts and closed the monthly ledger for October.",
        "completed_tasks": "Vendor statements matched\nOctober ledger closed",
        "pending_tasks": "None",
        "blockers": "None",
        "important_notes": "Audit requests should go to the shared finance inbox.",
        "priority": "Low",
        "deadline": "2026-11-30",
        "status": "Completed",
    },
]

_client = None
_seeded = False


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_collection():
    global _client, _seeded
    if _client is None:
        _client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
    collection = _client[settings.MONGODB_DB]["handovers"]
    if not _seeded:
        if collection.estimated_document_count() == 0:
            stamp = now()
            collection.insert_many([{**s, "created_at": stamp, "updated_at": stamp} for s in SAMPLES])
        _seeded = True
    return collection


def serialize(doc):
    result = dict(doc)
    result["id"] = str(result.pop("_id"))
    for key in ("created_at", "updated_at"):
        if isinstance(result.get(key), datetime):
            result[key] = result[key].isoformat()
    return result
