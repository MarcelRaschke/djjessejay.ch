---
name: wizard-architect
description: Booking-Wizard und interaktive Formulare für djjessejay.ch entwerfen und implementieren — mehrstufiges Booking-Formular, FAQ-Chatbot, Set-Konfigurationsassistent, Event-Typ-Auswahl. Trigger: "wizard erstellen", "booking wizard", "mehrstufiges formular", "interaktiver assistent", "chatbot für website", "booking assistent".
argument-hint: <wizard-typ: booking | faq | set-konfigurator | event-typ>
allowed-tools: Read, Edit, Bash(grep -n "form\|contact\|submit\|wizard" /home/user/djjessejay.ch/index.html), Bash(grep -c "function" /home/user/djjessejay.ch/index.html)
---

# Wizard Architect: Interaktive Formulare für djjessejay.ch

**Wizard-Typ:** $ARGUMENTS

---

## Verfügbare Wizard-Typen

| Typ | Beschreibung | Komplexität |
|-----|-------------|------------|
| `booking` | Mehrstufiges Booking-Formular | ⭐⭐⭐ |
| `faq` | Interaktiver FAQ-Chatbot | ⭐⭐ |
| `set-konfigurator` | Set-Länge/Genre/Ausstattung konfigurieren | ⭐⭐⭐ |
| `event-typ` | Event-Typ → Preis-Schätzung | ⭐⭐ |

---

## Schritt 1: Aktuelles Formular analysieren

```bash
grep -n "form\|contact\|submit\|input\|textarea" /home/user/djjessejay.ch/index.html | head -30
```

---

## Wizard-Design: Booking (3 Schritte)

### HTML-Struktur (in index.html einbauen)

```html
<!-- Booking Wizard -->
<div id="booking-wizard" class="max-w-lg mx-auto">
  <!-- Progress Bar -->
  <div class="flex mb-8">
    <div class="step-indicator active" data-step="1">1 Event-Typ</div>
    <div class="step-indicator" data-step="2">2 Details</div>
    <div class="step-indicator" data-step="3">3 Kontakt</div>
  </div>

  <!-- Schritt 1: Event-Typ -->
  <div class="wizard-step" id="step-1">
    <h3>Was für ein Event planst du?</h3>
    <div class="grid grid-cols-2 gap-4">
      <button class="event-type-btn" data-type="club">🎵 Club / Bar</button>
      <button class="event-type-btn" data-type="private">🏠 Private Party</button>
      <button class="event-type-btn" data-type="corporate">💼 Firmen-Event</button>
      <button class="event-type-btn" data-type="wedding">💍 Hochzeit</button>
    </div>
  </div>

  <!-- Schritt 2: Details -->
  <div class="wizard-step hidden" id="step-2">
    <h3>Event-Details</h3>
    <input type="date" id="event-date" placeholder="Datum">
    <input type="time" id="event-time" placeholder="Beginn">
    <input type="number" id="set-duration" placeholder="Set-Dauer (Stunden)" min="1" max="8">
    <input type="text" id="venue" placeholder="Venue / Ort">
    <!-- Preis-Schätzung live aktualisieren -->
    <div id="price-estimate" class="text-cyan-400">
      Geschätztes Honorar: CHF <span id="price-value">---</span>
    </div>
  </div>

  <!-- Schritt 3: Kontakt -->
  <div class="wizard-step hidden" id="step-3">
    <h3>Kontaktdaten</h3>
    <input type="text" id="contact-name" placeholder="Name">
    <input type="email" id="contact-email" placeholder="Email">
    <textarea id="message" placeholder="Zusätzliche Infos..."></textarea>
    <button id="submit-booking" class="bg-cyan-500 text-white px-6 py-3 rounded">
      Anfrage senden
    </button>
  </div>
</div>
```

### JavaScript-Logik

```javascript
// Wizard Navigation
document.querySelectorAll('.event-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedEventType = btn.dataset.type;
        showStep(2);
        updatePriceEstimate();
    });
});

function updatePriceEstimate() {
    const basePrice = { club: 400, private: 500, corporate: 700, wedding: 900 };
    const duration = parseInt(document.getElementById('set-duration').value) || 2;
    const base = basePrice[selectedEventType] || 400;
    const total = base + (duration - 2) * 100;
    document.getElementById('price-value').textContent = total;
}

function showStep(stepNum) {
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
    document.getElementById('step-' + stepNum).classList.remove('hidden');
}
```

---

## Schritt 2: In index.html integrieren

Bestehenden Kontaktbereich finden:
```bash
grep -n "contact\|kontakt\|booking" /home/user/djjessejay.ch/index.html | head -10
```

Wizard an passender Stelle einfügen.

Soll ich den Wizard-Code direkt in die index.html einbauen?
