const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sessionModel = require("../models/session.model");
const userModel = require("../models/user.model");

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 30;

const throwError = (message, status) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

// Only the SHA-256 hash of a refresh token is stored (see sessions table)
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const newRefreshToken = () => crypto.randomBytes(48).toString("base64url");
const refreshExpiry = () => new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

const signAccessToken = (userId) =>
    jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        throw throwError("Invalid or expired access token.", 401);
    }
};

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url ?? null });

// Called after a successful sign-in: opens a session for this device
const createSessionTokens = async (user, meta = {}) => {
    const refreshToken = newRefreshToken();
    await sessionModel.createSession({
        userId: user.id,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiry(),
        deviceName: meta.deviceName || null,
        userAgent: meta.userAgent || null,
        ipAddress: meta.ipAddress || null,
    });
    return {
        accessToken: signAccessToken(user.id),
        refreshToken,
        user: publicUser(user),
    };
};

const refreshSession = async (refreshToken) => {
    if (!refreshToken) {
        throw throwError("Refresh token is required.", 400);
    }
    const oldHash = hashToken(refreshToken);
    const session = await sessionModel.findSessionByHash(oldHash);
    if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
        throw throwError("Session expired. Please sign in again.", 401);
    }
    const user = await userModel.findUserById(session.user_id);
    if (!user) {
        await sessionModel.revokeSession(session.id);
        throw throwError("Session expired. Please sign in again.", 401);
    }

    const nextToken = newRefreshToken();
    const rotated = await sessionModel.rotateSession(session.id, oldHash, hashToken(nextToken), refreshExpiry());
    if (!rotated) {
        // Another request already rotated this token
        throw throwError("Session expired. Please sign in again.", 401);
    }
    return {
        accessToken: signAccessToken(user.id),
        refreshToken: nextToken,
        user: publicUser(user),
    };
};

const logout = async (refreshToken) => {
    if (refreshToken) {
        await sessionModel.revokeSessionByHash(hashToken(refreshToken));
    }
};

module.exports = {
    createSessionTokens,
    refreshSession,
    logout,
    verifyAccessToken,
    publicUser,
};
