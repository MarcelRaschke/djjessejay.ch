# JJ-AI — Besucher-Assistent

JJ-AI beantwortet Fragen zu DJ Jesse Jay, bereitet Booking-Anfragen als Mail-Entwurf vor und empfiehlt Sets aus dem öffentlichen SoundCloud-Archiv. Er läuft über den Express-Origin; der Browser sieht den API-Key nie.

## Aufbau

| Teil | Datei | Aufgabe |
| --- | --- | --- |
| Widget | `js/jj-ai.js`, `css/jj-ai.css` | Erscheint nur, wenn `GET /api/health` `jjAi: true` meldet. KI-Hinweis und Einwilligung vor dem ersten Senden, jede Antwort als „KI-generiert“ markiert, Ausgabe nur als Text. |
| Route | `server.js` → `POST /api/jj-ai/chat` | Rate-Limit `aiLimiter` (30 / 15 min pro Besucher; Schlüssel aus `CF-Connecting-IP`, nur vom lokalen cloudflared vertraut, `lib/client-key.js`), Validierung, Aufruf von Anthropic, `Cache-Control: no-store`. Inhalte werden nicht gespeichert oder geloggt, nur Fehlerklassen. |
| Logik | `lib/jj-ai.js` | Server-eigener System-Prompt je Modus (`ask`, `booking`, `mixes`), Grounding aus den kanonischen Quellen, Parsing der Antwort. |
| Wissen | `DJ_JESSE_JAY_CANONICAL_PROFILE.md`, `artist-profile.json`, `jj-ai/knowledge-context.json`, `AI_SYSTEM_PROMPT.md` | Werden beim Start geladen. Fehlt eine Quelle, bleibt JJ-AI aus. Der bürgerliche Name wird nicht in den Prompt übernommen. |
| Mix-Katalog | `jj-ai/mixes.json` | Einzige erlaubte Empfehlungen. Beschreibungen nur aus Website-Text; `claimId` verknüpft den Belegstatus aus `website/provenance.json`. Das Modell nennt nur `<mix id="…"/>`; der Server setzt die URL ein. Ein Test prüft, dass jede URL auf der Startseite verlinkt ist. |
| Belegstatus | `website/provenance.json` | Claims mit Status, Review-Stand und Quellenhinweis gehen in den Prompt (ohne den Claim zum bürgerlichen Namen). |

### Request

```json
POST /api/jj-ai/chat
{ "mode": "booking", "messages": [ { "role": "user", "content": "Clubnight am 14. März im Hive" } ] }
```

Regeln: Rollen abwechselnd ab `user`, letzte Nachricht `user`, höchstens 12 Nachrichten; Besucher-Nachrichten je 1500 Zeichen, Antworten je 4000 (der Server kürzt eigene Antworten auf diese Länge), zusammen 24000. Ein `system`-Feld des Clients wird ignoriert.

### Response

```json
{ "text": "…", "mixes": [ { "id": "…", "title": "…", "url": "https://soundcloud.com/…" } ],
  "bookingDraft": { "to": "info@djjessejay.ch", "subject": "Booking-Anfrage — DJ Jesse Jay", "body": "…" } | null,
  "generatedBy": "ai" }
```

Status: `400` ungültige Eingabe, `429` Rate-Limit, `502` Anthropic-Fehler, `503` JJ-AI aus.

## Einschalten (Go-live)

1. Origin auf den Stand von `main` bringen (`git pull`, `npm ci --omit=dev`).
2. Auf dem Origin setzen: `ANTHROPIC_API_KEY` (vorhanden) und `JJ_AI_ENABLED=1`, Dienst neu starten.
3. Lokal am Origin prüfen: `curl -s localhost:3000/api/health` → `"jjAi": true`.
4. Öffentlich prüfen: `curl -s https://djjessejay.ch/api/health` muss JSON liefern. Kommt eine Cloudflare-Access-Seite (403), fehlen dem Router-Worker die Secrets `ORIGIN_ACCESS_CLIENT_ID` / `ORIGIN_ACCESS_CLIENT_SECRET` oder er ist nicht neu deployt (`infra/cloudflare/wrangler.toml`, Schritte 2–5). Solange das so ist, bleibt das Widget unsichtbar.
5. Auf https://djjessejay.ch/ unten rechts „JJ-AI fragen“ öffnen und je Modus eine Nachricht testen.

Ausschalten: `JJ_AI_ENABLED` entfernen und neu starten. Das Widget verschwindet beim nächsten Seitenaufruf.

## Rechtliches

- KI-Transparenz (EU AI Act Art. 50): `eu-ai-act.html#jj-ai`
- Datenschutz (Übermittlung an Anthropic, USA; Löschung nach höchstens 30 Tagen laut Anthropic): `datenschutz.html#jj-ai`

Beide Seiten beschreiben JJ-AI als nur verfügbar, wenn eingeschaltet. Wer Modi, Datenflüsse oder Anbieter ändert, passt beide Seiten im selben PR an.

## Tests

`test/jj-ai.test.mjs`: Grounding ohne bürgerlichen Namen, Katalog-Abgleich mit `index.html`, Eingabevalidierung, Parsing, Route aus ohne `JJ_AI_ENABLED`, Route mit Fake-Anthropic (`ANTHROPIC_API_URL`), Client-`system` wird ignoriert.
