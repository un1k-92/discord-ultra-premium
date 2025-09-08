@echo off
title UltraPSAAS - TEST COMPLET
color 0A

echo ====================================================
echo     TEST COMPLET DES SERVICES ULTRA-PSAAS
echo ====================================================
echo.

:: Vérifier Node.js
echo [CHECK] Vérification de Node.js...
node -v >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERREUR] Node.js n'est pas installé ou non detecté.
) ELSE (
    echo [OK] Node.js est installé : %NODE_VERSION%
)
echo.

:: Vérifier npm
echo [CHECK] Vérification de npm...
npm -v >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERREUR] npm n'est pas installé.
) ELSE (
    echo [OK] npm est installé.
)
echo.

:: Vérifier les dossiers
echo [CHECK] Vérification des dossiers...
IF EXIST "C:\discord-ultra-PSAAS\api-backend" (
    echo [OK] api-backend trouvé.
) ELSE (
    echo [ERREUR] Dossier api-backend manquant.
)
IF EXIST "C:\discord-ultra-PSAAS\bot-discord" (
    echo [OK] bot-discord trouvé.
) ELSE (
    echo [ERREUR] Dossier bot-discord manquant.
)
IF EXIST "C:\discord-ultra-PSAAS\dashboard" (
    echo [OK] dashboard trouvé.
) ELSE (
    echo [ERREUR] Dossier dashboard manquant.
)
echo.

:: Vérifier ports 4000 et 3000
echo [CHECK] Vérification des ports...
FOR %%P IN (4000 3000) DO (
    netstat -ano | findstr :%%P >nul
    IF ERRORLEVEL 1 (
        echo [OK] Port %%P disponible.
    ) ELSE (
        echo [ATTENTION] Port %%P OCCUPE.
    )
)
echo.

echo ====================================================
echo   TEST TERMINÉ - Vérifiez les messages ci-dessus
echo ====================================================
pause
