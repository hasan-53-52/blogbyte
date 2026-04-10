/**
 * middleware/auth.js — Authentication & Authorization Middleware
 */

const User = require("../models/User");

/**
 * requireAuth — Ensure user is logged in via session
 */
const requireAuth = async (req, res, next) => {
  if (!req.session?.userId) {
    req.session.returnTo = req.originalUrl;
    if (req.headers.accept?.includes("application/json")) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    return res.redirect("/auth/login");
  }

  try {
    const user = await User.findById(req.session.userId).select("-password");
    if (!user || !user.isActive) {
      req.session.destroy();
      return res.redirect("/auth/login");
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * requireAdmin — Ensure user has admin role
 */
const requireAdmin = async (req, res, next) => {
  if (!req.session?.userId) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/auth/login");
  }

  try {
    const user = await User.findById(req.session.userId).select("-password");
    if (!user || user.role !== "admin") {
      return res.status(403).render("error", {
        title: "403 — Forbidden | BlogByte",
        code: 403,
        message: "You do not have permission to access this area.",
      });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * optionalAuth — Attach user if logged in (no redirect)
 */
const optionalAuth = async (req, res, next) => {
  if (!req.session?.userId) return next();

  try {
    const user = await User.findById(req.session.userId).select("-password");
    if (user && user.isActive) req.user = user;
  } catch (_) {
    // Silently fail optional auth
  }
  next();
};

/**
 * requireOwnerOrAdmin — User must own the resource or be admin
 */
const requireOwnerOrAdmin = (resourceUserField = "author") => {
  return (req, res, next) => {
    const resource = req.resource; // Set by previous middleware
    if (!resource) return next(new Error("Resource not found"));

    const isOwner = resource[resourceUserField]?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).render("error", {
        title: "403 — Forbidden | BlogByte",
        code: 403,
        message: "You are not authorized to perform this action.",
      });
    }
    next();
  };
};

/**
 * redirectIfAuthenticated — Send logged-in users away from auth pages
 */
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session?.userId) {
    return res.redirect("/");
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  requireOwnerOrAdmin,
  redirectIfAuthenticated,
};
