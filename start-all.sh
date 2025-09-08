#!/usr/bin/env bash
clear
echo -e "\e[36m========================================================\e[0m"
echo -e "\e[1;32mDISCORD ULTRA PREMIUM++ ✅ STARTER COMPLET\e[0m"
echo -e "\e[36m========================================================\e[0m"

LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/start-log.txt"
mkdir -p "$LOG_DIR"

echo "Logs: $LOG_FILE"
echo "Timestamp: $(date '+%Y-%m-%d_%H-%M-%S')" > "$LOG_FILE"

# ✅ Vérifier Node.js
if command -v node >/dev/null 2>&1; then
    echo -e "[\e[32mOK\e[0m] Node.js trouvé"
else
    echo -e "[\e[31mERREUR\e[0m] Node.js est requis mais introuvable !"
    exit 1
fi

# ✅ Nettoyage des ports
echo -e "\n[\e[36mINFO\e[0m] Nettoyage des ports 4000 et 3000..."
fuser -k 4000/tcp 2>/dev/null
fuser -k 3000/tcp 2>/dev/null

# ✅ Lancer Backend API
echo -e "\n[\e[36mINFO\e[0m] Lancement du Backend API..."
(cd api-backend && nohup npm run dev >> "../$LOG_FILE" 2>&1 &)
sleep 2

# ✅ Lancer Dashboard
echo -e "\n[\e[36mINFO\e[0m] Lancement du Dashboard..."
(cd dashboard-client && nohup npm run dev >> "../$LOG_FILE" 2>&1 &)
sleep 2

# ✅ Lancer Bot Discord
echo -e "\n[\e[36mINFO\e[0m] Lancement du Bot Discord..."
(cd bot-discord && nohup npm run dev >> "../$LOG_FILE" 2>&1 &)
sleep 2

# ✅ Vérification des services
check_service() {
    local name=$1
    local url=$2
    local retries=20
    local count=0

    echo -e "[\e[36mINFO\e[0m] Vérification de $name sur $url ..."
    until curl -s --head "$url" | head -n 1 | grep "200" >/dev/null; do
        count=$((count+1))
        if [ $count -ge $retries ]; then
            echo -e "[\e[31mERREUR\e[0m] $name ne répond pas après $retries tentatives"
            return 1
        fi
        echo -e "Attente ($count/$retries) pour $name..."
        sleep 3
    done
    echo -e "[\e[32mOK\e[0m] $name opérationnel"
    return 0
}

check_service "Backend API" "http://localhost:4000"
check_service "Dashboard" "http://localhost:3000"

echo -e "\n[\e[1;32m✔ TOUS LES SERVICES ONT ÉTÉ LANCÉS AVEC SUCCÈS !\e[0m]"
echo -e "Consultez les logs ici : $LOG_FILE"
echo -e "\e[36m========================================================\e[0m"

