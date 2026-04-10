/**
 * routes/auth.js — Authentication Routes
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth, redirectIfAuthenticated } = require("../middleware/auth");
const { registerValidation, loginValidation } = require("../middleware/validate");

router.get("/register", redirectIfAuthenticated, authController.showRegister);
router.post("/register", redirectIfAuthenticated, registerValidation, authController.register);

router.get("/login", redirectIfAuthenticated, authController.showLogin);
router.post("/login", redirectIfAuthenticated, loginValidation, authController.login);

router.post("/logout", requireAuth, authController.logout);

router.get("/profile", requireAuth, authController.showProfile);
router.put("/profile", requireAuth, authController.updateProfile);

module.exports = router;
