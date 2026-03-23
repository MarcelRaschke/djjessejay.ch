# =============================================================================
# ADB + Fastboot Setup fuer Windows Server 2022
# PRITOM TAB10 Max (Allwinner A133)
# Als Administrator ausfuehren!
# =============================================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

function Write-Green { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Yellow { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Cyan { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Red { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }

Write-Cyan "================================================"
Write-Cyan " ADB/Fastboot Setup - Windows Server 2022"
Write-Cyan " PRITOM TAB10 Max (Allwinner A133)"
Write-Cyan "================================================"
Write-Host ""

# ---- Verzeichnis ----
$ToolsDir = "C:\Android\platform-tools"
$TempDir  = "$env:TEMP\adb-setup"

New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null
New-Item -ItemType Directory -Force -Path $TempDir  | Out-Null

# ---- Platform Tools herunterladen ----
Write-Green "Android Platform Tools werden heruntergeladen..."
$PlatformToolsUrl = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
$ZipPath = "$TempDir\platform-tools.zip"

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $PlatformToolsUrl -OutFile $ZipPath -UseBasicParsing
    Write-Green "Download abgeschlossen."
} catch {
    Write-Red "Download fehlgeschlagen: $_"
    Write-Yellow "Manuell herunterladen: https://developer.android.com/tools/releases/platform-tools"
    exit 1
}

# ---- Entpacken ----
Write-Green "Entpacke Platform Tools..."
Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force
Copy-Item "$TempDir\platform-tools\*" -Destination $ToolsDir -Recurse -Force

# ---- PATH setzen ----
Write-Green "Setze PATH-Variable..."
$CurrentPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
if ($CurrentPath -notlike "*$ToolsDir*") {
    [System.Environment]::SetEnvironmentVariable(
        "Path",
        "$CurrentPath;$ToolsDir",
        "Machine"
    )
    Write-Green "PATH aktualisiert: $ToolsDir"
} else {
    Write-Yellow "PATH bereits gesetzt."
}

# PATH fuer aktuelle Session aktualisieren
$env:Path += ";$ToolsDir"

# ---- Version pruefen ----
Write-Green "Version pruefen..."
try {
    $AdbVersion = & "$ToolsDir\adb.exe" version 2>&1
    Write-Green "ADB: $($AdbVersion[0])"
} catch {
    Write-Red "ADB ausfuehren fehlgeschlagen."
}

# ---- Allwinner USB Treiber Hinweis ----
Write-Host ""
Write-Yellow "================================================"
Write-Yellow " WICHTIG: USB-Treiber fuer Allwinner A133"
Write-Yellow "================================================"
Write-Host @"
Das PRITOM TAB10 Max nutzt einen Allwinner A133 Chip.
Windows Server 2022 erkennt das Geraet moeglicherweise
nicht automatisch.

Wenn 'adb devices' das Tablet nicht zeigt:

Option 1 - Universal ADB Driver:
  → https://adb.clockworkmod.com/
  → UniversalAdbDriverSetup.msi herunterladen + installieren

Option 2 - Allwinner USB Driver (manuell):
  → Im Geraete-Manager das unbekannte Geraet suchen
  → Rechtsklick → Treiber aktualisieren
  → Manuell suchen → Pfad zu entpackten Treibern

Option 3 - Google USB Driver:
  → Geraete-Manager → Manuell →
  → android_winusb.inf aus Platform Tools extras\google\usb_driver\

"@ -ForegroundColor Yellow

# ---- Cleanup ----
Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue

# ---- Abschluss ----
Write-Host ""
Write-Green "================================================"
Write-Green " Setup abgeschlossen!"
Write-Green "================================================"
Write-Host ""
Write-Cyan "Naechste Schritte:"
Write-Host "  1. Tablet per USB anschliessen"
Write-Host "  2. Neues PowerShell-Fenster oeffnen (PATH neu laden)"
Write-Host "  3. adb devices"
Write-Host "     → Tablet muss 'device' oder 'unauthorized' zeigen"
Write-Host "  4. Bei 'unauthorized': Auf Tablet USB-Debugging bestaetigen"
Write-Host ""
Write-Host "Tools in: $ToolsDir"
