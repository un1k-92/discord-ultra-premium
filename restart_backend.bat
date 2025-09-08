@echo off
title Redémarrage du serveur API Backend
echo ===========================================
echo       Redémarrage de l'API Backend
echo ===========================================

:: Étape 1 : Vérifier si le port 4000 est occupé
echo Vérification du port 4000...
set PID=
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    set PID=%%a
)

:: Étape 2 : Si PID trouvé, tuer le process
if defined PID (
    echo Port 4000 occupé par PID %PID%. Fermeture du processus...
    taskkill /PID %PID% /F
    echo Processus %PID% terminé.
) else (
    echo Port 4000 libre.
)

:: Étape 3 : Lancer le serveur API backend
echo ===========================================
echo Lancement du serveur API Backend...
cd C:\discord-ultra-PSAAS\api-backend
npm run dev

pause
