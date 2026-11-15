const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const requireAuth = require("../middleware/auth.middleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/google", authController.google);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);
router.delete("/me", requireAuth, authController.deleteAccount);

module.exports = router;
