# Kennzeichnung KI-generierter Bilder

Quelle der Wahrheit ist `data/assets.json`. Prüfung: `npm run check:assets`.

## Regeln

1. Jedes KI-generierte Bild trägt auf der Seite eine sichtbare Beschriftung mit dem Text aus `ai.label` ("KI-generiert"), zum Beispiel als `figcaption` im selben `figure`.
2. Der Alt-Text kommt aus dem Feld `alt`. Er beschreibt das Bild, nicht den Entstehungsweg.
3. Die WebP-Dateien tragen XMP-Metadaten mit `Iptc4xmpExt:DigitalSourceType = trainedAlgorithmicMedia` (IPTC-Vokabular für KI-erzeugte Medien). Das ist maschinenlesbar, geht aber bei erneuter Kodierung durch Dritte verloren. Die sichtbare Beschriftung ersetzt es nicht.
4. Generierte Bilder sind kein Beleg für Biografie, Termine oder Zugehörigkeiten (`CLAUDE.md`, Abschnitt Authority). `ai.evidence` bleibt `false`. Konzeptgrafiken dürfen nicht wie Terminankündigungen wirken.
5. Rechte: Mit `rights.status` = `unklaert` ist die Anzeige auf der eigenen Seite erlaubt, sofern Kennzeichnung und Alt-Text vorliegen. Weitergabe (Presskit, `og:image`, Downloads) setzt `geklaert` und einen eingetragenen `holder` voraus (siehe `presskit/README.md`).
6. Status `hold`: Die Datei wird nicht eingecheckt, weil das Repository öffentlich ist und das Deployment das Root-Verzeichnis veröffentlicht. `planned_path` ist reserviert. Liegt dort trotzdem eine Datei, schlägt die Prüfung fehl.
7. `ai.generator` nennt die verwendeten Werkzeuge als Liste. Deren Nutzungsbedingungen entscheiden mit über die Weitergabe. `ai.generator_basis` vermerkt, woher die Zuordnung stammt. `ai.other_tools` führt weitere genannte Werkzeuge, deren Rolle (Bild, Prompt, Text, Code) noch offen ist; sie gehören erst in `generator`, wenn feststeht, dass sie das Bild erzeugt haben.
8. `ai.status` = `unverified` heisst: Herkunft nicht dokumentiert. Vor einer Herkunftsangabe auf der Seite klären und auf `ai-generated` setzen oder die Notiz begründet belassen.

## Neues Bild aufnehmen

1. Original nicht einchecken. Als WebP (Qualität etwa 90) nach `assets/img/<kategorie>/<id>.webp` schreiben, mit XMP wie in Regel 3.
2. Eintrag in `data/assets.json` anlegen: `alt`, `role`, `status`, `ai`, `rights`, `source.upload` und `source.sha256` des Originals sowie `bytes` und `sha256` der eingecheckten Datei.
3. `npm run check:assets` ausführen. Fehler brechen ab, Warnungen (Datei über 200 KB) sind Hinweise auf das Performance-Budget.

Kategorien unter `assets/img/`: `brand`, `portrait`, `social`, `credits`, `lab`, `reference`.
