---
name: performance-audit
description: Performance-Analyse für djjessejay.ch — Asset-Größen, Tailwind-Optimierung, Ladezeiten, ungenutzte CSS-Klassen, externe Ressourcen. Nutzen wenn der User "Performance", "langsam", "Ladezeit", "Optimierung", "Bundle-Größe", "Tailwind purge" oder "schneller machen" sagt.
---

# Performance-Audit: djjessejay.ch

## 1. Asset-Inventur

Analysiere alle Asset-Größen und prüfe ob sie optimal sind:

```bash
# Dateigrößen aller Assets
du -sh /home/user/djjessejay.ch/*.html /home/user/djjessejay.ch/*.css /home/user/djjessejay.ch/*.js 2>/dev/null || true
du -sh /home/user/djjessejay.ch/img/* 2>/dev/null | sort -rh | head -20 || echo "Kein img/-Ordner"
```

Bewertung:
- HTML > 100KB: Prüfen ob JS/CSS ausgelagert werden kann
- CSS > 50KB: Tailwind möglicherweise nicht gecached
- Bilder > 200KB: Komprimierung empfehlen
- JS > 50KB: Code-Splitting prüfen

## 2. Externe Ressourcen

Prüfe alle `<link>` und `<script src=...>` auf externe CDNs:

```bash
grep -n 'src="https\|href="https' /home/user/djjessejay.ch/index.html | head -30
```

Bewertung:
- Tailwind CDN: Sollte durch Build-Step ersetzt werden (spart 90%+ CSS)
- Google Fonts: Erwäge `font-display: swap` + Preconnect
- Externe Scripts: Prüfe ob `defer` oder `async` gesetzt ist

## 3. Tailwind-Optimierung

```bash
# Zähle unique Tailwind-Klassen
grep -oE 'class="[^"]*"' /home/user/djjessejay.ch/index.html | grep -oE '[a-z]+-[a-z0-9:-]+' | sort -u | wc -l
# Zeige die häufigsten Klassen
grep -oE 'class="[^"]*"' /home/user/djjessejay.ch/index.html | grep -oE '[a-z]+-[a-z0-9:-]+' | sort | uniq -c | sort -rn | head -20
```

Wenn Tailwind via CDN geladen wird: Empfehle Tailwind CLI Build-Prozess der nur verwendete Klassen beinhaltet.

## 4. Bilder-Optimierung

```bash
# Prüfe Bildformate (WebP ist moderner als JPG/PNG)
ls /home/user/djjessejay.ch/img/ 2>/dev/null | grep -E '\.(jpg|jpeg|png)$' | wc -l || echo "Kein img/-Ordner"
ls /home/user/djjessejay.ch/img/ 2>/dev/null | grep -E '\.webp$' | wc -l || echo "0 WebP"
```

Empfehlung: JPG/PNG → WebP konvertieren spart 25-35% Dateigröße

## 5. GitHub Actions Build

```bash
cat /home/user/djjessejay.ch/.github/workflows/deploy.yml 2>/dev/null || echo "Kein deploy.yml gefunden"
```

Prüfe ob der Build-Prozess Optimierungen durchführt (Minifikation, Komprimierung, Cache-Headers).

## 6. Inline-JS Analyse

```bash
# Prüfe ob JS-Events inline oder als addEventListener definiert sind
grep -c 'onclick\|onload\|onchange' /home/user/djjessejay.ch/index.html
grep -c 'addEventListener' /home/user/djjessejay.ch/index.html
# Zeile Script-Blöcke
grep -n '<script' /home/user/djjessejay.ch/index.html
```

Inline `onclick=` Events sollten zu `addEventListener` migriert werden (Performance + CSP-Kompatibilität).

---

## Audit-Report erstellen

Erstelle nach der Analyse einen strukturierten Bericht:

```
## Performance-Audit: djjessejay.ch
**Datum:** [heute]  **Gesamt-Score:** [Gut/Mittel/Verbesserungsbedarf]

### Kritische Probleme (sofort beheben)
- [ ] [Problem] — Auswirkung: [X]

### Empfehlungen (mittelfristig)
- [ ] [Empfehlung] — Mögliche Verbesserung: [X%]

### Gut (keine Aktion nötig)
- [Was bereits optimal ist]

### Nächste Schritte
1. [Konkrete Handlung]
```

Sei konkret mit Zahlen. Schreibe keine allgemeinen Performance-Ratschläge die nicht auf djjessejay.ch zutreffen.
