@echo off
setlocal
if "%~1"=="" (
  echo Usage: killport.bat PORT
  echo Exemple: killport.bat 4000
  exit /b 1
)
set PORT=%~1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do (
  echo [INFO] PID sur le port %PORT% : %%a
  taskkill /PID %%a /F
)
echo [OK] Port %PORT% libere (si PID existait).
endlocal
