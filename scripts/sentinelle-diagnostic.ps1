# scripts/sentinelle-diagnostic.ps1
# Diagnostic "Sentinelle" - lecture seule - ecrit 2 rapports dans .\logs\
# ASCII only to avoid encoding issues

$ErrorActionPreference = 'Stop'
$now = Get-Date
$projRoot = Resolve-Path "$PSScriptRoot\.."
$logsDir = Join-Path $projRoot "logs"
if (!(Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

# --- utils report ---
$sb = New-Object System.Text.StringBuilder
function W($s) { $null = $sb.AppendLine($s); Write-Host $s }
function Read-DotEnv($path){
  $map = @{}
  if (Test-Path $path) {
    foreach($line in Get-Content $path){
      if($line -match '^\s*#' -or $line.Trim() -eq ''){ continue }
      if($line -match '^\s*([^=\s]+)\s*=\s*(.*)\s*$'){
        $k=$matches[1]; $v=$matches[2]
        $map[$k]=$v
      }
    }
  }
  return $map
}
function Try-Invoke($url){
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 4
    return @{ ok = $true; code = $r.StatusCode; url = $url }
  } catch {
    return @{ ok = $false; code = 0; url = $url; error = $_.Exception.Message }
  }
}
function Count-Errors($paths){
  $count = 0
  foreach($p in $paths){
    if(Test-Path $p){
      try {
        $lines = Get-Content $p -Tail 1500 -ErrorAction SilentlyContinue
        $count += ($lines | Select-String -Pattern '(?i)\b(error|exception|unhandled|reject|fatal|traceback)\b' -AllMatches | Measure-Object).Count
      } catch {}
    }
  }
  return $count
}
function Has-Pattern($paths, $pattern){
  foreach($p in $paths){
    if(Test-Path $p){
      $lines = Get-Content $p -Tail 1500 -ErrorAction SilentlyContinue
      if($lines -match $pattern){ return $true }
    }
  }
  return $false
}
function File-RecentlyWritten($path, $minutes){
  if(!(Test-Path $path)) { return $false }
  $age = New-TimeSpan -Start (Get-Item $path).LastWriteTime -End $now
  return ($age.TotalMinutes -le $minutes)
}

# --- PM2 ---
$pm2Ok = $true
$pm2List = @()
try {
  $json = pm2 jlist 2>$null
  if([string]::IsNullOrWhiteSpace($json)){ $pm2Ok = $false }
  else { $pm2List = $json | ConvertFrom-Json }
} catch { $pm2Ok = $false }

$apps = @('api-backend','bot-discord','dashboard-client')
$pm2Status = @{}
foreach($a in $apps){
  $pm2Status[$a] = @{ found = $false; online = $false; uptimeMin = 0; restarts = $null; cpu = $null; mem = $null }
}
if($pm2Ok){
  foreach($p in $pm2List){
    $name = $p.name
    if($apps -contains $name){
      $pm2Status[$name].found = $true
      $pm2Status[$name].online = ($p.pm2_env.status -eq 'online')
      $pm2Status[$name].restarts = $p.pm2_env.restart_time
      $pm2Status[$name].cpu = $p.monit.cpu
      $pm2Status[$name].mem = $p.monit.memory
      try {
        if($p.pm2_env.pm_uptime){
          $epochMs = [double]$p.pm2_env.pm_uptime
          $dt = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$epochMs).LocalDateTime
          $pm2Status[$name].uptimeMin = [Math]::Round((New-TimeSpan -Start $dt -End $now).TotalMinutes,1)
        }
      } catch {}
    }
  }
}

# --- .env & ports ---
$envBackend   = Read-DotEnv (Join-Path $projRoot "api-backend\.env")
$envDashboard = Read-DotEnv (Join-Path $projRoot "dashboard-client\.env")
$envBot       = Read-DotEnv (Join-Path $projRoot "bot-discord\.env")

$backendPort   = if($envBackend.ContainsKey('PORT')){ [int]$envBackend['PORT'] } else { 3001 }
$dashboardPort = if($envDashboard.ContainsKey('PORT')){ [int]$envDashboard['PORT'] } else { 3000 }

# --- health checks HTTP ---
$healthBackend = Try-Invoke ("http://localhost:{0}/health" -f $backendPort)
if(-not $healthBackend.ok){ $healthBackend = Try-Invoke ("http://localhost:{0}/" -f $backendPort) }

$healthDashboard = Try-Invoke ("http://localhost:{0}/login" -f $dashboardPort)

# --- logs & indicateurs bot ---
$botOut = @(
  (Join-Path $projRoot "logs\bot-out-1.log"),
  (Join-Path $projRoot "bot-discord\logs\bot.log")
)
$botErr = @(
  (Join-Path $projRoot "logs\bot-error-1.log"),
  (Join-Path $projRoot "bot-discord\logs\error.log")
)
$apiErr = @(
  (Join-Path $projRoot "logs\api-backend-error-0.log")
)
$dashErr = @(
  (Join-Path $projRoot "logs\dashboard-error-2.log")
)

$totalErrors = (Count-Errors ($botErr + $apiErr + $dashErr))

$readySeen = Has-Pattern $botOut '(?i)\[READY\]'
$newsSeen  = Has-Pattern $botOut '(?i)\[NEWS\]'
$newsRecent = $false
foreach($p in $botOut){ if(File-RecentlyWritten $p 1440){ $newsRecent = $true; break } } # 24h

$liveFile = Join-Path $projRoot "bot-discord\src\data\live-status.json"
$liveState = $null; $liveUpdated = $null
if(Test-Path $liveFile){
  try {
    $live = Get-Content $liveFile -Raw | ConvertFrom-Json
    $liveState = $live.state
    $liveUpdated = $live.updatedAt
  } catch {}
}

# --- presence fichiers logs attendus ---
$logHygiene = 0
if(Test-Path $botOut[1]){ $logHygiene += 2.5 }
if(Test-Path $botErr[1]){ $logHygiene += 2.5 }

# --- check config critiques ---
$tokenOk = $false
if($envBot.ContainsKey('DISCORD_TOKEN')){
  $val = $envBot['DISCORD_TOKEN']
  if($val -and $val.Length -ge 20 -and $val -notmatch '(?i)(YOUR|PLACEHOLDER|CHANGEMOI)'){
    $tokenOk = $true
  }
}

# --- score ---
$score = 0
# 1) Uptime/online PM2 (20)
$onlineCount = @($apps | Where-Object { $pm2Status[$_].online }).Count
$score += 20 * ($onlineCount / [double]$apps.Count)

# 2) Errors (20)
if($totalErrors -le 0){ $score += 20 }
elseif($totalErrors -le 5){ $score += 16 }
elseif($totalErrors -le 20){ $score += 10 }
else { $score += 0 }

# 3) News job (15)
if($newsSeen -and $newsRecent){ $score += 15 }
elseif($newsSeen){ $score += 8 }

# 4) Health endpoints (15, 7.5 each)
if($healthBackend.ok -and $healthBackend.code -ge 200 -and $healthBackend.code -lt 400){ $score += 7.5 }
if($healthDashboard.ok -and $healthDashboard.code -ge 200 -and $healthDashboard.code -lt 400){ $score += 7.5 }

# 5) READY & recent activity (10)
if($readySeen){ $score += 6 }
$recentBotActivity = $false
foreach($p in $botOut){ if(File-RecentlyWritten $p 1440){ $recentBotActivity = $true; break } }
if($recentBotActivity){ $score += 4 }

# 6) Log hygiene (5)
$score += $logHygiene

# 7) .env critical (5)
if($tokenOk){ $score += 5 }

# 8) Packaging/PM2/scripts present (10)
$pkgPts = 0
if(Test-Path (Join-Path $projRoot "start-all.bat")){ $pkgPts += 3 }
if(Test-Path (Join-Path $projRoot "bot-discord\start-bot.bat")){ $pkgPts += 2 }
if(Test-Path (Join-Path $projRoot "api-backend\start-backend.bat")){ $pkgPts += 2 }
if(Test-Path (Join-Path $projRoot "dashboard-client\start-dashboard.bat")){ $pkgPts += 2 }
if($pm2Ok){ $pkgPts += 1 }
$score += $pkgPts

$score = [Math]::Round([double]$score, 1)

# --- rendu ---
W ("=== DIAGNOSTIC SENTINELLE ({0}) ===" -f $now.ToString("yyyy-MM-dd HH:mm:ss"))
W ("Project root  : {0}" -f $projRoot)
W ("PM2 available : {0}" -f $pm2Ok)
foreach($a in $apps){
  $st = $pm2Status[$a]
  W (" - {0} :: found={1} online={2} uptime={3}min restarts={4} cpu={5}% mem={6}B" -f $a,$st.found,$st.online,$st.uptimeMin,$st.restarts,$st.cpu,$st.mem)
}
W ("Backend  health: {0} ({1})" -f ($healthBackend.url), ($(if($healthBackend.ok){"OK "+$healthBackend.code}else{"FAIL"})))
W ("Dashboardhealth: {0} ({1})" -f ($healthDashboard.url), ($(if($healthDashboard.ok){"OK "+$healthDashboard.code}else{"FAIL"})))
W ("Logs - total errors (~): {0}" -f $totalErrors)
W ("[READY] seen  : {0}" -f $readySeen)
W ("[NEWS]  seen  : {0}  (logs changed <24h: {1})" -f $newsSeen,$newsRecent)
if($liveState){ W ("Live state    : {0} (updatedAt={1})" -f $liveState,$liveUpdated) }
W ("Token present : {0}" -f $tokenOk)
W ("Log hygiene   : {0}/5" -f $logHygiene)
W ("Packaging pts : {0}/10" -f $pkgPts)
W ("-------------------------------------")
W ("SCORE GLOBAL  : {0}/100" -f $score)

# --- fichiers de sortie ---
$txtPath = Join-Path $logsDir ("diagnostic-sentinelle.txt")
$jsonPath = Join-Path $logsDir ("diagnostic-sentinelle.json")

$grades = @{
  timestamp = $now.ToString("s")
  score = $score
  pm2 = $pm2Status
  health = @{ backend = $healthBackend; dashboard = $healthDashboard }
  errors = @{ total = $totalErrors }
  indicators = @{ readySeen = $readySeen; newsSeen = $newsSeen; newsRecent = $newsRecent; liveState=$liveState; liveUpdated=$liveUpdated }
  config = @{ discordTokenPresent = $tokenOk; backendPort = $backendPort; dashboardPort = $dashboardPort }
}
$sb.ToString() | Set-Content -Path $txtPath -Encoding UTF8
($grades | ConvertTo-Json -Depth 6) | Set-Content -Path $jsonPath -Encoding UTF8

W ("Rapports ecrits :")
W (" - " + $txtPath)
W (" - " + $jsonPath)
