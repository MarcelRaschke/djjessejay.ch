# PRITOM TAB10 Max – Root + Kali Linux Guide

> **Gerät:** PRITOM TAB10 Max | Build: TAB10 Max_14.0_US_20240607
> **Chipset:** Allwinner A133 (Quad-Core Cortex-A53 @ 1.6 GHz)
> **Ziel:** Root via Magisk → Kali Linux via Linux Deploy

---

## Warnung

- Bootloader-Unlock **löscht alle Daten** (Factory Reset)
- Kein offizieller Support von PRITOM
- Auf eigene Gefahr – Brick-Risiko existiert
- Methode basiert auf PRITOM P7 Community (gleicher A133 SoC)

---

## Phase 1 – Vorbereitung (auf dem Tablet)

### 1.1 Developer Options aktivieren
```
Einstellungen → Über das Tablet → Build-Nummer
→ 7x schnell tippen → Developer Options freigeschaltet
```

### 1.2 In Developer Options aktivieren
```
Einstellungen → Entwickleroptionen:
  ✓ USB-Debugging
  ✓ OEM-Entsperrung (OEM Unlocking)
```

### 1.3 ADB Tools auf PC installieren
```bash
# Ubuntu/Debian
sudo apt install android-tools-adb android-tools-fastboot

# Windows: Platform Tools von developer.android.com herunterladen

# Verbindung testen
adb devices
# Tablet muss "device" oder "unauthorized" zeigen → Verbindung auf Tablet bestätigen
```

---

## Phase 2 – Bootloader entsperren

```bash
# Tablet in Fastboot-Modus starten
adb reboot bootloader

# Warten bis "FASTBOOT" auf Display erscheint
fastboot devices

# Bootloader entsperren (Methode 1 – Standard)
fastboot flashing unlock

# Falls Methode 1 fehlschlägt → Methode 2
fastboot oem unlock

# Bestätigung auf Tablet: Volume Up → Unlock bestätigen
# Tablet startet neu → Factory Reset!
```

> **Nach dem Reset:** Developer Options erneut aktivieren + USB-Debugging einschalten

---

## Phase 3 – Boot Image extrahieren

Für Magisk muss das `boot.img` gepatcht werden.

### 3.1 Aktuelles Boot Image sichern
```bash
# Slot prüfen (A/B Partitionierung?)
fastboot getvar current-slot
# Wenn "a" oder "b" → A/B Gerät
# Wenn Fehler → Single-Slot

# Boot Partition dumpen (Single-Slot)
adb shell
su
dd if=/dev/block/by-name/boot of=/sdcard/boot.img
exit

# Boot Image auf PC ziehen
adb pull /sdcard/boot.img ./boot.img
```

### 3.2 Alternative – SP Flash Tool (Allwinner)
Falls `by-name/boot` nicht funktioniert:
```bash
# LiveSuit oder PhoenixSuit für Allwinner nutzen
# → Firmware entpacken → boot.img extrahieren
# Firmware-Dumps: suche "PRITOM TAB10 Max firmware" oder "A133 stock firmware"
```

---

## Phase 4 – Magisk Root

### 4.1 Magisk auf Tablet installieren
```bash
# Magisk APK herunterladen (aktuellste Version)
# https://github.com/topjohnwu/Magisk/releases
adb install Magisk-*.apk
```

### 4.2 Boot Image patchen
```
1. boot.img auf das Tablet kopieren:
   adb push boot.img /sdcard/boot.img

2. Magisk App öffnen
3. "Install" → "Select and Patch a File"
4. boot.img auswählen
5. Gepatchte Datei wird als /sdcard/Download/magisk_patched_*.img gespeichert

6. Gepatchte Datei auf PC ziehen:
   adb pull /sdcard/Download/magisk_patched_*.img ./magisk_boot.img
```

### 4.3 Gepatchtes Image flashen
```bash
# Tablet in Fastboot
adb reboot bootloader

# Gepatchtes boot.img flashen
fastboot flash boot magisk_boot.img

# Neustart
fastboot reboot

# Magisk App öffnen → "Zusätzliches Setup" → Neustart
# Root verifizieren:
adb shell
su
whoami
# → root
```

---

## Phase 5 – Kali Linux via Linux Deploy

### 5.1 Benötigte Apps installieren
```bash
# Über ADB oder F-Droid
adb install linux-deploy.apk    # Linux Deploy
adb install busybox.apk         # BusyBox (Voraussetzung)
```

Oder im Google Play Store / F-Droid:
- **Linux Deploy** – meefik
- **BusyBox** – Stephen (Stericson)

### 5.2 Linux Deploy konfigurieren
```
Linux Deploy öffnen → Einstellungen (Zahnrad):

Distribution:    Kali Linux
Version:         kali-rolling
Architektur:     arm64 (aarch64)
Installationstyp: Datei (empfohlen) oder Partition
Pfad:            /sdcard/linux.img
Image-Größe:     8192 MB (8 GB, mehr wenn SD-Karte vorhanden)
Benutzername:    kali (oder eigener Name)
Passwort:        [sicheres Passwort setzen]

Desktop-Umgebung:
  Desktop:       XFCE (leichtgewichtig, empfohlen)
  Grafik:        VNC
  VNC-Port:      5900
  SSH:           aktivieren, Port 22
```

### 5.3 Kali installieren
```
Linux Deploy → "Installieren" (Play-Button mit Down-Pfeil)
→ Läuft 10-20 Minuten (je nach Internetgeschwindigkeit)
→ Logs beobachten bis "deploy" erscheint
```

### 5.4 Kali starten
```
Linux Deploy → "Start"
→ Container läuft

VNC-Zugang:
  - VNC Viewer App installieren (RealVNC / bVNC)
  - Verbinden auf: 127.0.0.1:5900
  - Passwort: [oben gesetzt]
  → XFCE4 Desktop erscheint

SSH-Zugang:
  adb forward tcp:22 tcp:22
  ssh kali@localhost
```

---

## Phase 6 – Kali Pentesting Tools einrichten

Nach dem Start in der Kali Shell:

```bash
# System updaten
sudo apt update && sudo apt upgrade -y

# Kali Meta-Pakete (wähle nach Bedarf)
sudo apt install kali-tools-top10        # Top 10 Tools
sudo apt install kali-tools-wireless     # WiFi Tools
sudo apt install kali-linux-default      # Standard Kali Toolset

# Netzwerk-Tools
sudo apt install nmap masscan netdiscover

# Web-Testing
sudo apt install burpsuite zaproxy

# Passwort-Testing
sudo apt install hashcat john hydra

# Exploitation
sudo apt install metasploit-framework

# HexStrike AI Setup (aus kali-cloud)
# → Siehe kali-cloud/setup.sh
```

---

## Fehlerbehebung

### Fastboot erkennt Gerät nicht
```bash
# udev-Regel auf Linux setzen
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="1f3a", MODE="0666"' | sudo tee /etc/udev/rules.d/51-android.rules
sudo udevadm control --reload-rules

# Allwinner USB IDs: 1f3a:efe8 (FEL), 1f3a:1010 (Fastboot)
```

### OEM Unlock fehlt in Developer Options
```
→ SIM-Karte einlegen + Gerät aktivieren
→ Oder: Tablet auf Android-Werkseinstellungen zurücksetzen, dann erneut versuchen
```

### Linux Deploy startet nicht (Permission Denied)
```bash
# Root-Zugriff in Magisk für Linux Deploy erlauben:
Magisk → SuperUser → Linux Deploy → Allow
```

### VNC verbindet nicht
```bash
# In Kali prüfen:
ps aux | grep vnc
# VNC Server manuell starten:
vncserver :1 -geometry 1280x800 -depth 24
```

---

## Ressourcen

- [Linux Deploy GitHub](https://github.com/meefik/linuxdeploy)
- [Magisk GitHub](https://github.com/topjohnwu/Magisk)
- [linux-sunxi.org A133](https://linux-sunxi.org/A133)
- [PRITOM P7 XDA (gleicher Chip)](https://xdaforums.com/t/help-pritom-p7-allwinner-a133-stuck-on-boot-logo-after-gsi-flash.4706032/)
- [Kali Linux ARM](https://www.kali.org/docs/arm/)
