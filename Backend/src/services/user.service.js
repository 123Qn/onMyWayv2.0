const bcryptjs = require("bcryptjs");
const authService = require("./auth.service");
const userModel = require("../models/user.model");

const throwError = (message, status) => {
    const error = new Error(message);
    error.status = status;
    return error;
};
const registerUser = async (userData={}, meta) => {
    const name = userData.name?.trim();
    const email = userData.email?.trim();
    const password = userData.password;
    if (!name || !email || !password) {
        throw throwError("Name, email, and password are required.", 400);
    }
    if (password.length < 6) {
        throw throwError("Password must be at least 6 characters long.", 400);
    }
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
        throw throwError("User with this email already exists.", 409);
    }
    const hashedPassword = await bcryptjs.hash(password, 10);
    const newUser = await userModel.createUser({
        name,
        email,
        password: hashedPassword
    });
    // Sign the new user in straight away
    return authService.createSessionTokens(newUser, meta);
}
//login
const loginUser = async (email, password, meta) => {
    if (!email || !password) {
        throw throwError("Email and password are required.", 400);
    }
    const user = await userModel.findUserByEmail(email);
    // !user.password: Google-only accounts have no password and must use Google sign-in
    if (!user || !user.password) {
        throw throwError("Invalid email or password.", 401);
    }
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
        throw throwError("Invalid email or password.", 401);
    }
    return authService.createSessionTokens(user, meta);
};

module.exports = {
    registerUser,
    loginUser
};