import express from 'express';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ⚠️ Vérifie que ces variables existent
const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } = process.env;

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
    console.error('❌ Erreur : Les variables OAuth2 ne sont pas définies dans le .env');
    process.exit(1);
}

passport.use(new DiscordStrategy(
    {
        clientID: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
        callbackURL: DISCORD_REDIRECT_URI,
        scope: ['identify', 'email', 'guilds']
    },
    (accessToken, refreshToken, profile, done) => {
        console.log('✅ Authentification réussie :', profile.username);
        return done(null, profile);
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Route pour démarrer l'auth
router.get('/auth/discord', passport.authenticate('discord'));

// Route pour callback
router.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard'); // Redirige après succès
    }
);

export default router;
