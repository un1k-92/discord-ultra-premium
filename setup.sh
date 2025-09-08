#!/usr/bin/env bash
set -e

echo "🔍 Vérification de Node.js et npm..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js n'est pas installé. Installe Node 18+ avant de continuer."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Version Node.js trop ancienne ($NODE_VERSION). Installe Node 18 ou supérieur."
  exit 1
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm n'est pas installé. Installe npm avant de continuer."
  exit 1
fi

echo "✅ Node.js $(node -v) et npm $(npm -v) OK"
echo "🚀 Création du projet Discord Ultra PSAAS dans $(pwd)"

########################################
# 1) BOT DISCORD
########################################
echo "📦 Création Bot Discord..."
mkdir -p bot-discord/src/{commands,events,utils,services} bot-discord/logs
cat > bot-discord/package.json <<'JSON'
{
  "name": "bot-discord",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "dev": "node src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "discord.js": "^14.15.3",
    "dotenv": "^16.4.5",
    "winston": "^3.13.0"
  }
}
JSON

cat > bot-discord/.env <<'ENV'
DISCORD_TOKEN=ton_token_bot
DISCORD_CLIENT_ID=ton_client_id
API_BASE_URL=http://localhost:4000
ENV

cat > bot-discord/src/index.js <<'JS'
import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { logger } from './utils/logger.js';
import { registerCommands } from './utils/register.js';
import { readyHandler } from './events/ready.js';
import { pingCommand } from './commands/ping.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
client.commands.set(pingCommand.data.name, pingCommand);

client.once('ready', () => readyHandler(client));

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction);
  } catch (e) {
    logger.error(e);
    await interaction.reply({ content: '❌ Erreur commande.', ephemeral: true });
  }
});

(async () => {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) {
    logger.error('DISCORD_TOKEN ou DISCORD_CLIENT_ID manquant dans .env');
    process.exit(1);
  }
  await registerCommands(token, clientId, [pingCommand.data.toJSON()]);
  await client.login(token);
})();
JS

cat > bot-discord/src/commands/ping.js <<'JS'
import { SlashCommandBuilder } from 'discord.js';

export const pingCommand = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Ping -> Pong!'),
  async execute(interaction) {
    const start = Date.now();
    await interaction.reply('Pong!');
    const ms = Date.now() - start;
    await interaction.followUp({ content: `⏱ Latence ~ ${ms}ms`, ephemeral: true });
  }
};
JS

cat > bot-discord/src/events/ready.js <<'JS'
import { logger } from '../utils/logger.js';
export const readyHandler = (client) => {
  logger.info(`✅ Bot connecté en tant que ${client.user.tag}`);
};
JS

cat > bot-discord/src/utils/logger.js <<'JS'
import winston from 'winston';
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/bot.log' })
  ],
});
JS

cat > bot-discord/src/utils/register.js <<'JS'
import { REST, Routes } from 'discord.js';
import { logger } from './logger.js';

export async function registerCommands(token, clientId, commands) {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info('✅ Slash commands enregistrées (globales)');
  } catch (e) {
    logger.error('❌ Échec enregistrement commands');
    logger.error(e);
  }
}
JS

touch bot-discord/logs/{bot.log,error.log}

########################################
# 2) API BACKEND
########################################
echo "📦 Création API Backend..."
mkdir -p api-backend/src/{routes,controllers,models,middlewares,utils}
cat > api-backend/package.json <<'JSON'
{
  "name": "api-backend",
  "version": "0.1.0",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "dev": "node src/server.js",
    "start": "node src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.6.1"
  }
}
JSON

cat > api-backend/.env <<'ENV'
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster/test
JWT_SECRET=change_me
DISCORD_CLIENT_ID=ton_client_id
DISCORD_CLIENT_SECRET=ton_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/login
ENV

cat > api-backend/src/server.js <<'JS'
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './utils/db.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000'] }));
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
connectDB().then(() => {
  app.listen(port, () => console.log(`✅ API sur http://localhost:${port}`));
});
JS

cat > api-backend/src/utils/db.js <<'JS'
import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI manquant');
  await mongoose.connect(uri);
  console.log('✅ MongoDB connecté');
}
JS

########################################
# 3) DASHBOARD CLIENT
########################################
echo "📦 Création Dashboard..."
mkdir -p dashboard-client/public/assets
mkdir -p dashboard-client/src/{pages,components,hooks,context,services,styles}
cat > dashboard-client/package.json <<'JSON'
{
  "name": "dashboard-client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7"
  }
}
JSON

cat > dashboard-client/next.config.js <<'JS'
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
JS

cat > dashboard-client/src/pages/index.js <<'JS'
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div>
        <h1 className="text-3xl font-bold">Discord Ultra PSAAS</h1>
        <p className="opacity-80">Dashboard prêt. Allez sur /login pour se connecter.</p>
      </div>
    </main>
  );
}
JS

########################################
# 4) INSTALLATION AUTOMATIQUE
########################################
echo "📦 Installation des dépendances..."
(cd bot-discord && npm install)
(cd api-backend && npm install)
(cd dashboard-client && npm install)

########################################
# 5) README
########################################
cat > README.md <<'MD'
# discord-ultra-PSAAS
Projet SaaS : Bot Discord + API + Dashboard + MongoDB (Cloud-ready)

## Lancer
- API : cd api-backend && npm run dev
- Dashboard : cd dashboard-client && npm run dev
- Bot : cd bot-discord && npm run dev
MD

echo "✅ Structure + install terminées dans $(pwd)"
