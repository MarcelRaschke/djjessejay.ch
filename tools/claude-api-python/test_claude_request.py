import unittest
from types import SimpleNamespace

from claude_request import MODEL, ask


def text(value):
    return SimpleNamespace(type="text", text=value)


def response(content, stop_reason="end_turn", stop_details=None):
    return SimpleNamespace(
        content=content,
        stop_reason=stop_reason,
        stop_details=stop_details,
    )


class FakeMessages:
    def __init__(self, result):
        self.result = result
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self.result


class FakeClient:
    def __init__(self, result):
        self.messages = FakeMessages(result)


class AskTests(unittest.TestCase):
    def test_sends_model_thinking_and_effort(self):
        client = FakeClient(response([text("Paris")]))
        self.assertEqual(ask(client, "Capital of France?"), "Paris")

        call = client.messages.calls[0]
        self.assertEqual(call["model"], MODEL)
        self.assertEqual(call["thinking"], {"type": "adaptive"})
        self.assertEqual(call["output_config"], {"effort": "high"})
        self.assertEqual(
            call["messages"],
            [{"role": "user", "content": "Capital of France?"}],
        )

    def test_joins_only_text_blocks(self):
        thinking = SimpleNamespace(type="thinking", thinking="...")
        client = FakeClient(response([thinking, text("Hallo "), text("Welt")]))
        self.assertEqual(ask(client, "x"), "Hallo Welt")

    def test_refusal_raises_with_category(self):
        details = SimpleNamespace(category="cyber", explanation="x")
        client = FakeClient(
            response([], stop_reason="refusal", stop_details=details)
        )
        with self.assertRaisesRegex(RuntimeError, "cyber"):
            ask(client, "x")

    def test_refusal_without_details_raises(self):
        client = FakeClient(response([], stop_reason="refusal"))
        with self.assertRaisesRegex(RuntimeError, "unbekannt"):
            ask(client, "x")

    def test_truncated_response_raises(self):
        client = FakeClient(response([text("halb")], stop_reason="max_tokens"))
        with self.assertRaisesRegex(RuntimeError, "abgeschnitten"):
            ask(client, "x")

    def test_context_window_exceeded_raises(self):
        client = FakeClient(
            response(
                [text("halb")],
                stop_reason="model_context_window_exceeded",
            )
        )
        with self.assertRaisesRegex(RuntimeError, "Kontextfenster"):
            ask(client, "x")


if __name__ == "__main__":
    unittest.main()
