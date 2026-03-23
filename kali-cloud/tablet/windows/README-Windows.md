# Windows Server 2022 – ADB Setup & Root Guide

## Voraussetzungen

- Windows Server 2022 (als Administrator)
- PowerShell 5.1+ (bereits enthalten)
- USB-Kabel mit Datenuebertragung (nicht nur Ladekabel!)
- PRITOM TAB10 Max mit aktiviertem USB-Debugging

---

## Schritt 1 – ADB Tools installieren

**PowerShell als Administrator oeffnen:**
```
Win + X → Windows PowerShell (Administrator)
```

**Script ausfuehren:**
```powershell
# Execution Policy temporaer erlauben
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# ADB Setup starten
.\setup-adb-windows.ps1
```

Dies installiert Android Platform Tools nach `C:\Android\platform-tools\`.

---

## Schritt 2 – USB-Treiber (wichtig fuer Allwinner!)

Das PRITOM TAB10 Max wird von Windows oft **nicht automatisch erkannt**.

### Universal ADB Driver (empfohlen)
1. Herunterladen: https://adb.clockworkmod.com/
2. `UniversalAdbDriverSetup.msi` installieren
3. Tablet anschliessen + neu erkennen lassen

### Manuelle Pruefung
```
Geraete-Manager (devmgmt.msc) oeffnen
→ "Andere Geraete" oder unbekanntes USB-Geraet suchen
→ Rechtsklick → Treiber aktualisieren
```

---

## Schritt 3 – Verbindung testen

**Neues PowerShell-Fenster oeffnen** (wichtig damit PATH neu geladen wird):

```powershell
adb devices
```

Erwartete Ausgabe:
```
List of devices attached
XXXXXXXXXX      device
```

Wenn `unauthorized`: Auf dem Tablet USB-Debugging-Anfrage bestaetigen.

---

## Schritt 4 – Bootloader entsperren + Root

```powershell
# Script ausfuehren (als Administrator)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\unlock-and-root.ps1
```

Das Script fuehrt durch:
- Geraetepruefung
- boot.img Sicherung
- Fastboot-Modus
- Bootloader-Unlock
- Anleitung fuer Magisk-Root

---

## Schritt 5 – Magisk Root (nach Bootloader-Unlock)

```powershell
# Magisk APK herunterladen
$MagiskUrl = "https://github.com/topjohnwu/Magisk/releases/latest/download/Magisk.apk"
Invoke-WebRequest -Uri $MagiskUrl -OutFile "C:\Android\Magisk.apk" -UseBasicParsing

# Auf Tablet installieren
adb install C:\Android\Magisk.apk
```

Dann auf dem Tablet:
```
Magisk App oeffnen
→ Install → Direct Install (Recommended)
→ Tablet startet neu
→ Root aktiv!
```

---

## Schritt 6 – Linux Deploy + VNC

Nach dem Root auf dem Tablet:

### Apps installieren (via ADB)
```powershell
# BusyBox (Voraussetzung)
adb install busybox.apk

# Linux Deploy
adb install linux-deploy.apk
```

Oder direkt im Play Store / F-Droid:
- **Linux Deploy** (von meefik)
- **BusyBox** (fuer Root-Operationen)
- **bVNC Free** (VNC Viewer fuer den Desktop)

### Linux Deploy Konfiguration
```
Distribution:    Kali Linux
Version:         kali-rolling
Architektur:     arm64
Image-Groesse:   8192 MB
Desktop:         XFCE
VNC-Port:        5900
```

### VNC vom PC aus verbinden
```powershell
# Port weiterleiten
adb forward tcp:5900 tcp:5900

# Dann mit beliebigem VNC Viewer verbinden:
# Host: localhost:5900
```

**VNC Viewer fuer Windows:** [RealVNC Viewer](https://www.realvnc.com/de/connect/download/viewer/)

---

## Haeufige Fehler

| Fehler | Loesung |
|--------|---------|
| `adb devices` zeigt nichts | USB-Treiber neu installieren, anderen USB-Port |
| `unauthorized` | USB-Debugging auf Tablet bestaetigen |
| `fastboot devices` leer | Allwinner Fastboot-Treiber fehlt → Geraete-Manager |
| `flashing unlock FAILED` | `fastboot oem unlock` versuchen |
| OEM Unlocking fehlt in Einstellungen | SIM oder Internet-Verbindung benoetigt |

---

## Tools Uebersicht

| Pfad | Inhalt |
|------|--------|
| `C:\Android\platform-tools\` | adb.exe, fastboot.exe |
| `C:\Android\pritom-root\` | boot.img Backup, Geraeteinfos |
| `C:\Android\Magisk.apk` | Magisk fuer Root |
