/**
 * middleware/locals.js — Inject common variables into all EJS templates
 */

const User = require("../models/User");

const injectLocals = async (req, res, next) => {
  // Flash messages
  res.locals.flash = {
    success: req.session.flash?.success || null,
    error: req.session.flash?.error || null,
    info: req.session.flash?.info || null,
  };
  // Clear flash after reading
  if (req.session.flash) delete req.session.flash;

  // Current user
  res.locals.currentUser = null;
  if (req.session?.userId) {
    try {
      const user = await User.findById(req.session.userId).select("name email role avatar");
      res.locals.currentUser = user || null;
    } catch (_) {}
  }

  // Helpers
  res.locals.isAdmin = res.locals.currentUser?.role === "admin";
  res.locals.appName = "BlogByte";
  res.locals.appUrl = process.env.APP_URL || "http://localhost:3000";
  res.locals.currentPath = req.path;
  res.locals.currentYear = new Date().getFullYear();

  next();
};

/**
 * setFlash — Helper to set a flash message
 */
const setFlash = (req, type, message) => {
  if (!req.session.flash) req.session.flash = {};
  req.session.flash[type] = message;
};

module.exports = { injectLocals, setFlash };
