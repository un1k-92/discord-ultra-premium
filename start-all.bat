@echo off
:: ==============================
::  DISCORD ULTRA PSAAS - STARTER V2.1
:: ==============================

:: Couleurs
set GREEN=[32m
set RED=[31m
set YELLOW=[33m
set RESET=[0m

:: Répertoire courant
set BASE_DIR=%~dp0

:: Répertoire logs
set LOG_DIR=%BASE_DIR%logs
set LOG_FILE=%LOG_DIR%\monitor.log

:: Création du dossier logs si inexistant
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Rotation des logs si > 5 Mo
if exist "%LOG_FILE%" (
    for %%A in ("%LOG_FILE%") do if %%~zA GTR 5000000 (
        echo %YELLOW%[INFO] Rotation des logs...%RESET%
        ren "%LOG_FILE%" monitor_backup_%DATE:/=-%_%TIME::=-%.log
    )
)

:: Écriture en-tête log
echo === DEMARRAGE DU SYSTEME %DATE% %TIME% === > "%LOG_FILE%"

:: Affichage démarrage
echo %GREEN%[START] Lancement du système PSAAS...%RESET%

:: Étape 1 : Kill ports 3000 & 4000
echo %YELLOW%[INFO] Libération des ports 3000 et 4000...%RESET%
for %%P in (3000 4000) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :%%P') do (
        taskkill /PID %%i /F >nul 2>&1
    )
)
echo %GREEN%[OK] Ports libérés.%RESET%

:: Étape 2 : Lancement des services
echo %YELLOW%[INFO] Lancement des services : Backend, Dashboard, Bot...%RESET%

start "Backend" cmd /k "cd /d %BASE_DIR%api-backend && npm install && npm run dev >> %LOG_FILE% 2>&1"
start "Dashboard" cmd /k "cd /d %BASE_DIR%dashboard-client && npm install && npm run dev >> %LOG_FILE% 2>&1"
start "Bot" cmd /k "cd /d %BASE_DIR%bot-discord && npm install && node index.js >> %LOG_FILE% 2>&1"

:: Étape 3 : Vérification
echo %YELLOW%[INFO] Vérification des services...%RESET%
timeout /t 3 >nul

echo %GREEN%[DONE] Tous les services ont été lancés !%RESET%
echo Consultez les logs : %LOG_FILE%

pause
