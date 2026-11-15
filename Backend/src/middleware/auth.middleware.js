const authService = require("../services/auth.service");
const userModel = require("../models/user.model");

// Requires "Authorization: Bearer <accessToken>"; sets req.user
const requireAuth = async (req, res, next) => {
    const [scheme, token] = (req.get("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ success: false, message: "Missing access token." });
    }
    const payload = authService.verifyAccessToken(token);
    const user = await userModel.findUserById(payload.id);
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid or expired access token." });
    }
    req.user = user;
    next();
};

module.exports = requireAuth;
