---
name: idea-catcher
description: Kreative Ideen für DJ Jesse Jay festhalten und organisieren — Set-Konzepte, Show-Themen, Kollaborationsideen, Musik-Entdeckungen, technische Verbesserungen. Ideen werden kategorisiert und in einer Ideen-Datei gespeichert. Trigger: "idee festhalten", "idee notieren", "kreative idee", "set-konzept", "show-thema", "idee speichern".
argument-hint: <idee beschreiben>
allowed-tools: Read, Edit, Write, Bash(cat /home/user/djjessejay.ch/.claude/ideas.md), Bash(date +%Y-%m-%d)
---

# Idea Catcher: Ideen festhalten

**Neue Idee:** $ARGUMENTS

---

## Schritt 1: Idee klassifizieren

| Kategorie | Beispiele |
|-----------|-----------|
| 🎵 **Set-Konzept** | Thematischer Set, Jahrzehnte-Reise, Album-Tribute |
| 📻 **Radio-Show** | Neues Format, Gast-DJ, Themensendung für LoRa |
| 🎨 **Website** | Neues Feature, Design-Idee, Content-Idee |
| 🤝 **Kollabo** | Andere DJs, Labels, Venues, Fotografen |
| 🎧 **Musik** | Track-Fund, neues Genre, Artist entdeckt |
| 🔧 **Technik** | Neues Equipment, Setup-Verbesserung |
| 📱 **Marketing** | Social-Media-Idee, Promo-Konzept |

---

## Schritt 2: Idee strukturieren

Aus `$ARGUMENTS` folgendes extrahieren:

```
Titel: [kurzer Name der Idee]
Kategorie: [aus Tabelle oben]
Beschreibung: [die Idee ausformuliert]
Warum interessant: [Mehrwert/Potenzial]
Nächster Schritt: [konkrete erste Aktion]
Priorität: Hoch / Mittel / Niedrig
```

---

## Schritt 3: Speichern

Idee-Datei lesen (falls vorhanden):
```bash
cat /home/user/djjessejay.ch/.claude/ideas.md 2>/dev/null || echo "Datei existiert noch nicht"
```

Idee anhängen in `/home/user/djjessejay.ch/.claude/ideas.md`:

```markdown
## [Datum] — [Titel] ([Kategorie])

[Beschreibung]

**Warum interessant:** [Potenzial]
**Nächster Schritt:** [Aktion]
**Priorität:** [Hoch/Mittel/Niedrig]
**Status:** 💡 Neu

---
```

---

## Schritt 4: Bestätigung

```
✅ Idee gespeichert: "[Titel]"
📁 Datei: /home/user/djjessejay.ch/.claude/ideas.md
🏷️ Kategorie: [Kategorie]
⭐ Priorität: [Priorität]

Nächster Schritt: [konkrete Aktion]

Weitere Ideen? Einfach beschreiben oder /idea-catcher [idee] eingeben.
```
