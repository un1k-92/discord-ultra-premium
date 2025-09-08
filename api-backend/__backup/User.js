const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String },
    locale: { type: String },
    premium_type: { type: Number },
    accessToken: { type: String },
    refreshToken: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
