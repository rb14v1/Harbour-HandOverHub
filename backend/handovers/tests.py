from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings
from openai import AuthenticationError, NotFoundError, RateLimitError

from . import ai

VALID = {
    "AZURE_OPENAI_API_KEY": "test-key",
    "AZURE_OPENAI_ENDPOINT": "https://example.openai.azure.com",
    "AZURE_OPENAI_API_VERSION": "2025-04-01-preview",
    "AZURE_OPENAI_DEPLOYMENT": "gpt-5.6-sol",
}
HANDOVER = {"employee_name": "A", "project_title": "P", "work_description": "W", "priority": "High"}


def _error(cls):
    request = MagicMock()
    response = MagicMock(status_code=400, headers={}, request=request)
    return cls(message="x", response=response, body=None)


class AISummaryTests(SimpleTestCase):
    @override_settings(AZURE_OPENAI_API_KEY="", AZURE_OPENAI_DEPLOYMENT="")
    def test_missing_settings_raise_config_error(self):
        with self.assertRaises(ai.AIConfigError) as ctx:
            ai.generate_summary(HANDOVER)
        self.assertIn("AZURE_OPENAI_API_KEY", str(ctx.exception))
        self.assertIn("AZURE_OPENAI_DEPLOYMENT", str(ctx.exception))

    @override_settings(**{**VALID, "AZURE_OPENAI_API_KEY": "your_key_here"})
    def test_placeholder_key_counts_as_missing(self):
        with self.assertRaises(ai.AIConfigError):
            ai.generate_summary(HANDOVER)

    @override_settings(**VALID)
    @patch("handovers.ai.AzureOpenAI")
    def test_uses_deployment_as_model(self, client_cls):
        client = client_cls.return_value
        client.responses.create.return_value = MagicMock(output_text="1. Concise Work Summary")
        self.assertEqual(ai.generate_summary(HANDOVER), "1. Concise Work Summary")
        self.assertEqual(client.responses.create.call_args.kwargs["model"], "gpt-5.6-sol")

    @override_settings(**VALID)
    @patch("handovers.ai.AzureOpenAI")
    def test_error_mapping_does_not_leak_secrets(self, client_cls):
        cases = [
            (AuthenticationError, "authentication failed"),
            (NotFoundError, "deployment not found"),
            (RateLimitError, "quota or rate limit"),
        ]
        for error_cls, expected in cases:
            client_cls.return_value.responses.create.side_effect = _error(error_cls)
            with self.assertRaises(ai.AIServiceError) as ctx:
                ai.generate_summary(HANDOVER)
            self.assertIn(expected, str(ctx.exception).lower())
            self.assertNotIn("test-key", str(ctx.exception))
