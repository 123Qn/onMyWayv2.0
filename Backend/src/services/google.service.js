const { OAuth2Client } = require("google-auth-library");
const userModel = require("../models/user.model");
const authService = require("./auth.service");

const client = new OAuth2Client();

// Accepted ID token audiences (Web client ID; comma-separate to allow more)
const audiences = () =>
    (process.env.GOOGLE_CLIENT_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);

const throwError = (message, status) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const verifyIdToken = async (idToken) => {
    const audience = audiences();
    if (audience.length === 0) {
        throw throwError("Google sign-in is not configured on the server.", 503);
    }
    try {
        const ticket = await client.verifyIdToken({ idToken, audience });
        return ticket.getPayload();
    } catch {
        throw throwError("Invalid Google token.", 401);
    }
};

const loginWithGoogle = async (idToken, meta) => {
    if (!idToken) {
        throw throwError("Google ID token is required.", 400);
    }
    const payload = await verifyIdToken(idToken);
    const identity = { provider: "google", providerUserId: payload.sub, email: payload.email };

    let user = await userModel.findUserByIdentity("google", payload.sub);
    if (!user) {
        // Only trust the email for account linking once Google has verified it
        if (!payload.email || !payload.email_verified) {
            throw throwError("Your Google email is not verified.", 401);
        }
        user = await userModel.findUserByEmail(payload.email);
        if (user) {
            await userModel.linkIdentity(user.id, identity);
        } else {
            user = await userModel.createUserWithIdentity(
                {
                    name: (payload.name || payload.email.split("@")[0]).slice(0, 100),
                    email: payload.email,
                    avatarUrl: payload.picture || null,
                },
                identity
            );
        }
    }
    return authService.createSessionTokens(user, meta);
};

module.exports = {
    loginWithGoogle,
};
