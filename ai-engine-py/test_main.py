import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException

import main


class GeminiHardeningTests(unittest.TestCase):
    def test_extract_gemini_block_reason_from_prompt_feedback(self):
        payload = {
            "promptFeedback": {
                "blockReason": "SAFETY",
            }
        }

        self.assertEqual(
            main.extract_gemini_block_metadata(payload),
            {
                "message": "Gemini blocked the prompt: SAFETY",
                "failure_code": "gemini_prompt_safety",
                "failure_category": "safety",
            },
        )

    def test_extract_gemini_block_reason_from_candidate_finish_reason(self):
        payload = {
            "candidates": [
                {
                    "finishReason": "SAFETY",
                }
            ]
        }

        self.assertEqual(
            main.extract_gemini_block_metadata(payload),
            {
                "message": "Gemini stopped generation due to safety",
                "failure_code": "gemini_safety",
                "failure_category": "safety",
            },
        )

    def test_format_gemini_http_error_uses_structured_payload(self):
        response = Mock()
        response.status_code = 429
        response.text = '{"error":{"status":"RESOURCE_EXHAUSTED","message":"Rate limit exceeded"}}'
        response.json.return_value = {
            "error": {
                "status": "RESOURCE_EXHAUSTED",
                "message": "Rate limit exceeded",
            }
        }

        self.assertEqual(
            main.format_gemini_http_error(response),
            "Gemini request failed with status 429: RESOURCE_EXHAUSTED: Rate limit exceeded",
        )

    @patch("main.time.sleep", return_value=None)
    @patch("main.requests.post")
    def test_post_to_gemini_retries_transient_server_errors(self, mock_post, _mock_sleep):
        failure = Mock()
        failure.status_code = 503
        failure.text = "temporary upstream outage"
        failure.json.return_value = {"error": {"message": "temporary upstream outage"}}

        success = Mock()
        success.status_code = 200
        success.json.return_value = {"candidates": [{"content": {"parts": [{"text": "{}"}]}}]}

        mock_post.side_effect = [failure, success]

        response = main.post_to_gemini("prompt text")

        self.assertIs(response, success)
        self.assertEqual(mock_post.call_count, 2)

    @patch("main.time.sleep", return_value=None)
    @patch("main.requests.post")
    def test_post_to_gemini_raises_after_non_retryable_error(self, mock_post, _mock_sleep):
        response = Mock()
        response.status_code = 400
        response.text = '{"error":{"status":"INVALID_ARGUMENT","message":"Bad request"}}'
        response.json.return_value = {
            "error": {
                "status": "INVALID_ARGUMENT",
                "message": "Bad request",
            }
        }
        mock_post.return_value = response

        with self.assertRaises(HTTPException) as ctx:
            main.post_to_gemini("prompt text")

        self.assertEqual(ctx.exception.status_code, 502)
        self.assertEqual(ctx.exception.detail["failure_code"], "gemini_request_rejected")
        self.assertIn("INVALID_ARGUMENT", ctx.exception.detail["message"])


if __name__ == "__main__":
    unittest.main()
