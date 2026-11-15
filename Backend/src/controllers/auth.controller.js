const userService = require("../services/user.service");
const authService = require("../services/auth.service");
const googleService = require("../services/google.service");
const userModel = require("../models/user.model");

// Device info stored on the session row
const sessionMeta = (req) => ({
    deviceName: req.body?.deviceName?.slice(0, 100),
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
});

const register = async (req, res) => {
    const result = await userService.registerUser(req.body, sessionMeta(req));
    res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result
    });
};

const login = async (req, res) => {
    const { email, password } = req.body || {};
    const result = await userService.loginUser(email, password, sessionMeta(req));
    res.status(200).json({
        success: true,
        message: "Login successful",
        data: result
    });
};

const google = async (req, res) => {
    const result = await googleService.loginWithGoogle(req.body?.idToken, sessionMeta(req));
    res.status(200).json({
        success: true,
        message: "Login successful",
        data: result
    });
};

const refresh = async (req, res) => {
    const result = await authService.refreshSession(req.body?.refreshToken);
    res.status(200).json({
        success: true,
        message: "Token refreshed",
        data: result
    });
};

const logout = async (req, res) => {
    await authService.logout(req.body?.refreshToken);
    res.status(200).json({
        success: true,
        message: "Logged out"
    });
};

const me = async (req, res) => {
    res.status(200).json({
        success: true,
        data: authService.publicUser(req.user)
    });
};

const deleteAccount = async (req, res) => {
    await userModel.deleteUser(req.user.id);
    res.status(200).json({
        success: true,
        message: "Account deleted"
    });
};

module.exports = {
    register,
    login,
    google,
    refresh,
    logout,
    me,
    deleteAccount
};
