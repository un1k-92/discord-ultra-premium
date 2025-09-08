#!/bin/bash

echo "=== Vérification du port 4000 ==="
# Récupère le PID écoutant 4000 (0.0.0.0:4000 ou [::]:4000) en LISTENING
PID=$(netstat -ano | tr -d '\r' | grep -E '(:4000\s)' | grep LISTENING | awk '{print $NF}' | head -n 1)

if [ -n "$PID" ]; then
  echo "Port 4000 occupé par le PID $PID. Fermeture..."
  "/c/Windows/System32/taskkill.exe" /PID "$PID" /F >/dev/null 2>&1
else
  echo "Port 4000 libre."
fi

echo "=== Lancement du serveur API Backend ==="
npm run dev

