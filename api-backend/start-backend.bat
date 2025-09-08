@echo off
echo ==============================================
echo     Redémarrage de l'API Backend
echo ==============================================

:: Vérification du port 4000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    echo Port 4000 occupé par PID %%a. Fermeture...
    taskkill /PID %%a /F
)

echo ==============================================
echo     Lancement du serveur API Backend...
echo ==============================================

cd /d %~dp0
npm run dev
pause
