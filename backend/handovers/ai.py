from django.conf import settings
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    AzureOpenAI,
    NotFoundError,
    RateLimitError,
)

PLACEHOLDER_VALUES = {"your_key_here", "your_deployment_name", "https://your-resource.openai.azure.com"}

SYSTEM_PROMPT = """You prepare work handover briefings for employees.
Using only the handover details provided, write these six sections, using the headings exactly as shown:
1. Concise Work Summary
2. Completed Work
3. Pending Tasks
4. Identified Blockers
5. Recommended Next Actions
6. Important Information for the Receiving Employee
Use short bullet points. If a section has no information, write "None recorded". Do not invent facts."""

FIELD_LABELS = [
    ("employee_name", "Employee"),
    ("recipient_name", "Recipient"),
    ("department", "Department"),
    ("project_title", "Project"),
    ("status", "Status"),
    ("priority", "Priority"),
    ("deadline", "Deadline"),
    ("work_description", "Work description"),
    ("completed_tasks", "Completed tasks"),
    ("pending_tasks", "Pending tasks"),
    ("blockers", "Blockers"),
    ("important_notes", "Important notes"),
]


class AIConfigError(Exception):
    pass


class AIServiceError(Exception):
    pass


def _missing_settings():
    required = {
        "AZURE_OPENAI_API_KEY": settings.AZURE_OPENAI_API_KEY,
        "AZURE_OPENAI_ENDPOINT": settings.AZURE_OPENAI_ENDPOINT,
        "AZURE_OPENAI_API_VERSION": settings.AZURE_OPENAI_API_VERSION,
        "AZURE_OPENAI_DEPLOYMENT": settings.AZURE_OPENAI_DEPLOYMENT,
    }
    return [
        name
        for name, value in required.items()
        if not (value or "").strip() or value.strip() in PLACEHOLDER_VALUES
    ]


def generate_summary(handover):
    missing = _missing_settings()
    if missing:
        raise AIConfigError(
            "Azure OpenAI is not configured. Set these in backend/.env and restart the server: "
            + ", ".join(missing)
        )

    details = "\n".join(f"{label}: {handover.get(key) or 'Not provided'}" for key, label in FIELD_LABELS)
    client = AzureOpenAI(
        api_key=settings.AZURE_OPENAI_API_KEY.strip(),
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT.strip(),
        api_version=settings.AZURE_OPENAI_API_VERSION.strip(),
    )

    try:
        response = client.responses.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT.strip(),
            instructions=SYSTEM_PROMPT,
            input=details,
        )
    except AuthenticationError:
        raise AIServiceError("Azure authentication failed. Check AZURE_OPENAI_API_KEY in backend/.env.")
    except NotFoundError:
        raise AIServiceError(
            "Azure deployment not found. Check that AZURE_OPENAI_DEPLOYMENT matches the deployment name in Azure."
        )
    except RateLimitError:
        raise AIServiceError("Azure OpenAI quota or rate limit reached. Check quota in Azure or try again later.")
    except (APIConnectionError, APITimeoutError):
        raise AIServiceError("Could not reach the Azure OpenAI endpoint. Check AZURE_OPENAI_ENDPOINT and network access.")
    except APIStatusError as exc:
        raise AIServiceError(f"Azure OpenAI returned an error (HTTP {exc.status_code}).")

    return response.output_text
