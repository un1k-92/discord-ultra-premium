@echo off
setlocal EnableExtensions EnableDelayedExpansion
title UltraPSAAS - BOT DISCORD

echo.
echo ===== [BOT] Verification de Node et npm =====
where node >nul 2>nul || (echo [ERREUR] Node.js introuvable. & pause & exit /b 1)
where npm  >nul 2>nul || (echo [ERREUR] npm introuvable. & pause & exit /b 1)

echo.
echo ===== [BOT] Positionnement dossier =====
cd /d C:\discord-ultra-PSAAS\bot-discord || (echo [ERREUR] Dossier bot introuvable. & pause & exit /b 1)
if not exist package.json (echo [ERREUR] package.json manquant. & pause & exit /b 1)

echo.
echo ===== [BOT] Verification .env =====
if not exist .env (
  echo [ATTENTION] .env manquant (DISCORD_TOKEN?). Le bot ne pourra pas se connecter.
)

echo.
echo ===== [BOT] Installation deps =====
if exist package-lock.json (
  call npm ci
) else (
  call npm install
)

echo.
echo ===== [BOT] Lancement =====
if exist src\index.js (
  node src\index.js
) else if exist index.js (
  node index.js
) else (
  echo [ERREUR] Fichier d'entree introuvable (src\index.js ou index.js).
  pause & exit /b 1
)

echo.
echo [BOT] Process termine.
pause
endlocal

