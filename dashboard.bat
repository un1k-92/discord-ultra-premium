@echo off
setlocal EnableExtensions EnableDelayedExpansion
title UltraPSAAS - DASHBOARD (Next.js 3000)

echo.
echo ===== [DASHBOARD] Verification de Node et npm =====
where node >nul 2>nul || (echo [ERREUR] Node.js introuvable. & pause & exit /b 1)
where npm  >nul 2>nul || (echo [ERREUR] npm introuvable. & pause & exit /b 1)

echo.
echo ===== [DASHBOARD] Positionnement dossier =====
REM Adapte le dossier si ton client s'appelle "dashboard-client"
cd /d C:\discord-ultra-PSAAS\dashboard-client || (echo [ERREUR] Dossier dashboard introuvable. & pause & exit /b 1)
if not exist package.json (echo [ERREUR] package.json manquant. & pause & exit /b 1)

echo.
echo ===== [DASHBOARD] Verification .env.local =====
if not exist .env.local (
  echo [ATTENTION] .env.local manquant (NEXT_PUBLIC_* / API_BASE_URL?). 
)

echo.
echo ===== [DASHBOARD] Installation deps =====
if exist package-lock.json (
  call npm ci
) else (
  call npm install
)

echo.
echo ===== [DASHBOARD] Lancement en DEV sur PORT 3000 =====
set PORT=3000
call npm run dev

echo.
echo [DASHBOARD] Process termine.
pause
endlocal

