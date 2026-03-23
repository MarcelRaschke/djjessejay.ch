# =============================================================================
# Bootloader Unlock + Root Vorbereitung - PRITOM TAB10 Max
# Windows Server 2022 - Als Administrator ausfuehren
# =============================================================================

#Requires -RunAsAdministrator

$AdbDir = "C:\Android\platform-tools"
$adb     = "$AdbDir\adb.exe"
$fastboot = "$AdbDir\fastboot.exe"
$WorkDir = "C:\Android\pritom-root"

function Write-Green  { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Yellow { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Cyan   { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Red    { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }
function Pause-AndConfirm {
    param($msg)
    Write-Yellow $msg
    Write-Host "  Bestaetigen mit ENTER, Abbrechen mit STRG+C..."
    Read-Host
}

# Verzeichnis anlegen
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null

Write-Cyan "=============================================="
Write-Cyan " Bootloader Unlock + Root - PRITOM TAB10 Max"
Write-Cyan "=============================================="
Write-Host ""
Write-Yellow "WARNUNG: Dieser Prozess loescht ALLE Daten auf dem Tablet!"
Write-Yellow "Sichere wichtige Daten vorher auf PC oder Cloud!"
Write-Host ""
Pause-AndConfirm "Ich habe alle Daten gesichert und moechte fortfahren"

# ---- Schritt 1: ADB Verbindung pruefen ----
Write-Cyan "--- Schritt 1: ADB Verbindung pruefen ---"
Write-Host "Verbinde Tablet per USB..."
Write-Host ""

$devices = & $adb devices 2>&1
Write-Host $devices

if ($devices -notmatch "device|unauthorized") {
    Write-Red "Kein Tablet erkannt!"
    Write-Yellow "Pruefen:"
    Write-Yellow "  - USB-Debugging aktiviert? (Einstellungen → Entwickleroptionen)"
    Write-Yellow "  - Richtiger USB-Treiber installiert?"
    Write-Yellow "  - USB-Kabel unterstuetzt Datenuebertragung?"
    exit 1
}

if ($devices -match "unauthorized") {
    Write-Yellow "Tablet zeigt 'unauthorized' - USB-Debugging auf Tablet bestaetigen!"
    Write-Yellow "Auf Tablet: 'Always allow from this computer' anwaehlen"
    Pause-AndConfirm "USB-Debugging auf Tablet bestaetigt"
}

Write-Green "Tablet verbunden!"

# ---- Schritt 2: Geraeteinfos sichern ----
Write-Cyan "--- Schritt 2: Geraeteinfos auslesen ---"

$info = @{
    "Model"       = (& $adb shell getprop ro.product.model 2>&1).Trim()
    "Build"       = (& $adb shell getprop ro.build.display.id 2>&1).Trim()
    "Android"     = (& $adb shell getprop ro.build.version.release 2>&1).Trim()
    "Bootloader"  = (& $adb shell getprop ro.bootloader 2>&1).Trim()
    "Serial"      = (& $adb get-serialno 2>&1).Trim()
}

Write-Host ""
foreach ($key in $info.Keys) {
    Write-Host "  $key`: $($info[$key])"
}
Write-Host ""

# Info-Datei speichern
$info | ConvertTo-Json | Out-File "$WorkDir\device-info.json"
Write-Green "Geraeteinfos gespeichert: $WorkDir\device-info.json"

# ---- Schritt 3: Boot Image sichern ----
Write-Cyan "--- Schritt 3: Boot Image sichern ---"
Write-Host ""

Pause-AndConfirm "Boot Image wird vom Tablet gesichert (Root erforderlich fuer dd)"

Write-Yellow "Versuche boot.img zu lesen..."
# Versuche ohne Root via /proc/partitions
$partitions = & $adb shell "ls /dev/block/by-name/" 2>&1
if ($partitions -match "boot") {
    Write-Green "Boot-Partition gefunden!"
    & $adb shell "dd if=/dev/block/by-name/boot of=/sdcard/boot.img bs=4096" 2>&1
    & $adb pull /sdcard/boot.img "$WorkDir\boot.img"

    if (Test-Path "$WorkDir\boot.img") {
        $size = (Get-Item "$WorkDir\boot.img").Length / 1MB
        Write-Green "boot.img gesichert: $WorkDir\boot.img ($([math]::Round($size,1)) MB)"
    } else {
        Write-Red "boot.img konnte nicht extrahiert werden."
        Write-Yellow "Manuell: Magisk App → Select and Patch a File"
        Write-Yellow "         Dann boot.img auf SD-Karte und patchen"
    }
} else {
    Write-Yellow "by-name/boot nicht verfuegbar (Root benoetigt)"
    Write-Yellow ""
    Write-Yellow "Alternative: Magisk direkt nach Bootloader-Unlock patchen:"
    Write-Yellow "  1. Bootloader entsperren (Schritt 4)"
    Write-Yellow "  2. Magisk.apk installieren"
    Write-Yellow "  3. In Magisk: Install → Direct Install (empfohlen)"
}

# ---- Schritt 4: In Fastboot booten ----
Write-Cyan "--- Schritt 4: Bootloader entsperren ---"
Write-Host ""
Write-Yellow "LETZTER WARNHINWEIS: Alle Daten werden geloescht!"
Pause-AndConfirm "In Fastboot booten"

Write-Green "Starte Tablet in Fastboot-Modus..."
& $adb reboot bootloader

Write-Yellow "Warte auf Fastboot-Modus (15 Sekunden)..."
Start-Sleep -Seconds 15

# Fastboot Verbindung pruefen
$fbDevices = & $fastboot devices 2>&1
if ($fbDevices -match "fastboot") {
    Write-Green "Tablet im Fastboot-Modus erkannt!"
} else {
    Write-Yellow "Fastboot-Geraet nicht erkannt. Moeglicherweise anderer Treiber noetig."
    Write-Yellow "Druecke ENTER wenn Tablet 'FASTBOOT' auf Display zeigt..."
    Read-Host
}

# Fastboot Variablen lesen
Write-Cyan "Fastboot Geraeteinfos:"
& $fastboot getvar all 2>&1 | Select-String -Pattern "unlocked|product|version"

# Bootloader entsperren
Write-Host ""
Write-Yellow "Entsperre Bootloader (Methode 1: flashing unlock)..."
$unlockResult = & $fastboot flashing unlock 2>&1
Write-Host $unlockResult

if ($unlockResult -match "FAILED|error") {
    Write-Yellow "Methode 1 fehlgeschlagen, versuche Methode 2: oem unlock..."
    $unlockResult2 = & $fastboot oem unlock 2>&1
    Write-Host $unlockResult2
}

Write-Yellow "Auf dem Tablet: Volume Up druecken um Unlock zu bestaetigen!"
Pause-AndConfirm "Unlock auf Tablet bestaetigt"

Write-Yellow "Starte neu..."
& $fastboot reboot

Write-Host ""
Write-Green "============================================"
Write-Green " Bootloader entsperrt!"
Write-Green "============================================"
Write-Host ""
Write-Cyan "Naechste Schritte:"
Write-Host "  1. Tablet neu einrichten (Sprache, WLAN etc.)"
Write-Host "  2. Developer Options + USB-Debugging erneut aktivieren"
Write-Host "  3. Magisk.apk installieren:"
Write-Host "     adb install Magisk-*.apk"
Write-Host "  4. In Magisk: Install → Direct Install → Neustart"
Write-Host ""
Write-Host "Gesicherte Dateien: $WorkDir"
