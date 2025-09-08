@echo off
setlocal EnableExtensions EnableDelayedExpansion
title UltraPSAAS - BACKEND (API 4000)

echo.
echo ===== [BACKEND] Verification de Node et npm =====
where node >nul 2>nul || (echo [ERREUR] Node.js introuvable. Installe-le puis relance. & pause & exit /b 1)
where npm  >nul 2>nul || (echo [ERREUR] npm introuvable. Installe Node.js puis relance. & pause & exit /b 1)

echo.
echo ===== [BACKEND] Positionnement dossier =====
cd /d C:\discord-ultra-PSAAS\api-backend || (echo [ERREUR] Dossier backend introuvable. & pause & exit /b 1)
if not exist package.json (echo [ERREUR] package.json manquant. & pause & exit /b 1)

echo.
echo ===== [BACKEND] Verification .env =====
if not exist .env (
  echo [ATTENTION] .env manquant. Le service peut echouer sans variables.
  echo          Chemin attendu: C:\discord-ultra-PSAAS\api-backend\.env
)

echo.
echo ===== [BACKEND] Installation deps (rapide si deja OK) =====
if exist package-lock.json (
  call npm ci
) else (
  call npm install
)

echo.
echo ===== [BACKEND] Lancement en DEV sur PORT 4000 =====
set PORT=4000
call npm run dev

echo.
echo [BACKEND] Process termine.
pause
endlocal
