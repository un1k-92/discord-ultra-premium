// C:\discord-ultra-PSAAS\api-backend\src\routes\auth.js
const express = require('express');
const crypto = require('node:crypto');

const router = express.Router();

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_CALLBACK_URL
} = process.env;

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_CALLBACK_URL) {
  console.warn('[AUTH] Variables manquantes : DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / DISCORD_CALLBACK_URL');
}

const pendingStates = new Map(); // state -> { ts }
const sessions = new Map();      // sid   -> { user, ts }

// Parse cookies simple
function parseCookies(req) {
  const h = req.headers.cookie || '';
  const out = {};
  h.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > -1) out[decodeURIComponent(p.slice(0, i).trim())] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// 1) Redirection vers Discord
router.get('/auth/discord', (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_CALLBACK_URL) return res.status(500).send('OAuth non configuré');
  const state = crypto.randomUUID();
  pendingStates.set(state, { ts: Date.now() });

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    scope: 'identify email',
    redirect_uri: DISCORD_CALLBACK_URL,
    prompt: 'consent',
    state
  });

  res.redirect('https://discord.com/oauth2/authorize?' + params.toString());
});

// 2) Callback → échange du code → cookie de session
router.get('/auth/discord/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    if (error) return res.status(400).send(`OAuth error: ${error} ${error_description || ''}`);
    if (!code || !state || !pendingStates.has(state)) return res.status(400).send('State invalide ou expiré');

    pendingStates.delete(state); // anti-rejeu

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: DISCORD_CALLBACK_URL
      })
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('[AUTH] token error', token);
      return res.status(400).send('Impossible d’obtenir le token Discord');
    }

    const uRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: 'Bearer ' + token.access_token }
    });
    const user = await uRes.json();
    if (!uRes.ok) {
      console.error('[AUTH] userinfo error', user);
      return res.status(400).send('Impossible de lire le profil Discord');
    }

    const sid = crypto.randomUUID();
    sessions.set(sid, { user, ts: Date.now() });
    res.cookie('sid', sid, { httpOnly:true, sameSite:'lax', path:'/', maxAge: 1000*60*60*24*7 });

    return res.redirect('http://localhost:3010/');
  } catch (e) {
    console.error('[AUTH] callback exception', e);
    return res.status(500).send('Erreur OAuth interne');
  }
});

// 3) Session courante
router.get('/me', (req, res) => {
  const sid = parseCookies(req).sid;
  if (sid && sessions.has(sid)) return res.json({ ok:true, user:sessions.get(sid).user });
  return res.status(401).json({ ok:false });
});

// 4) Logout
router.post('/logout', (req, res) => {
  const sid = parseCookies(req).sid;
  if (sid) sessions.delete(sid);
  res.clearCookie('sid', { path:'/' });
  res.json({ ok:true });
});

module.exports = router;
