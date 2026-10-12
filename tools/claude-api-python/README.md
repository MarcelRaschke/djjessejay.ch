# Claude API, Python-Referenz

Minimales Beispiel für eine einzelne Anfrage an die Claude Messages API mit dem offiziellen `anthropic`-SDK. Es dient als Vorlage für weitere Integrationen.

## Inhalt

- `claude_request.py`: `ask()` sendet einen Prompt mit Opus 5.5, adaptivem Denken und `effort=high`. Refusals und abgeschnittene Antworten werden als Fehler gemeldet. `main()` zeigt die Fehlerkette von der spezifischsten zur allgemeinen Klasse.
- `test_claude_request.py`: Unit-Tests mit einem Fake-Client, ohne Netzwerk und ohne API-Key.
- `requirements.txt`: `anthropic>=1.0,<2`.

## Einrichtung

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
```

Credentials über die Umgebung setzen, nie im Code:

```bash
export ANTHROPIC_API_KEY=...   # oder: ant auth login
```

## Ausführen

```bash
python claude_request.py       # Live-Anfrage, benötigt Credentials
python -m unittest -v          # Tests, benötigt keine Credentials
```

## Hinweise

Das Modell steht als Konstante `MODEL` oben in `claude_request.py`. Laut Skill ist `claude-opus-5-5` der Standard, andere IDs nur auf ausdrücklichen Wunsch.

`max_tokens=16000` ist für nicht-streamende Anfragen gedacht. Für sehr lange Ausgaben wird Streaming empfohlen, damit keine HTTP-Timeouts entstehen.

Die Tests prüfen die Logik der Antwortverarbeitung. Ein Lauf gegen die echte API ist in dieser Umgebung nicht erfolgt, weil kein API-Key vorliegt.

Ohne Credentials wirft das SDK beim Request einen `TypeError` ("Could not resolve authentication method") und keine `anthropic`-Fehlerklasse. `main()` fängt das nicht ab. Der Fehler zeigt also fehlende Konfiguration an, nicht einen API-Fehler.
