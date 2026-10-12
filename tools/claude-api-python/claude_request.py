"""Referenz: eine einzelne Anfrage an die Claude Messages API.

Verwendet das offizielle Python-SDK. Credentials kommen aus der
Umgebung (ANTHROPIC_API_KEY oder ein `ant auth login`-Profil),
nie aus dem Quellcode.
"""

import logging
import sys

import anthropic

MODEL = "claude-opus-5-5"

log = logging.getLogger("claude_request")


def ask(
    client: anthropic.Anthropic,
    prompt: str,
    *,
    max_tokens: int = 16000,
    effort: str = "high",
) -> str:
    """Sendet einen Prompt und liefert den Text der Antwort.

    Wirft RuntimeError bei refusal und bei abgeschnittener Antwort,
    damit kein unvollständiger Text stillschweigend weiterverarbeitet
    wird.
    """
    response = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        thinking={"type": "adaptive"},
        output_config={"effort": effort},
        messages=[{"role": "user", "content": prompt}],
    )

    if response.stop_reason == "refusal":
        details = response.stop_details
        category = details.category if details else None
        raise RuntimeError(
            f"Anfrage abgelehnt (Kategorie: {category or 'unbekannt'})"
        )
    if response.stop_reason == "max_tokens":
        raise RuntimeError(
            "Antwort abgeschnitten: max_tokens erhöhen oder streamen"
        )

    # Inhaltsblöcke können thinking und tool_use enthalten,
    # nur text-Blöcke zählen hier.
    return "".join(
        block.text for block in response.content if block.type == "text"
    )


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    client = anthropic.Anthropic()

    try:
        print(ask(client, "What is the capital of France?"))
    except anthropic.RateLimitError as e:
        log.error(
            "Rate limit (request-id %s), retry-after: %s",
            e._request_id,
            e.response.headers.get("retry-after", "unbekannt"),
        )
        return 1
    except anthropic.APIStatusError as e:
        # BadRequestError, AuthenticationError, NotFoundError, 5xx usw.
        log.error(
            "API-Fehler %s (request-id %s): %s",
            e.status_code,
            e._request_id,
            e.message,
        )
        return 1
    except anthropic.APIConnectionError as e:
        # Schließt APITimeoutError ein.
        log.error("Netzwerkfehler: %s", e)
        return 1
    except RuntimeError as e:
        log.error("%s", e)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
