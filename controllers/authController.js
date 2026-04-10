/**
 * controllers/authController.js — Registration, Login, Logout
 */

const User = require("../models/User");
const { setFlash } = require("../middleware/locals");

// ── Register ──────────────────────────────────────────────────────────────────
exports.showRegister = (req, res) => {
  res.render("auth/register", { title: "Create Account | BlogByte" });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    // Check for existing user
    const existing = await User.findOne({ email });
    if (existing) {
      setFlash(req, "error", "An account with this email already exists.");
      return res.redirect("/auth/register");
    }

    // Determine role
    const role =
      adminSecret && adminSecret === process.env.ADMIN_SECRET ? "admin" : "user";

    const user = await User.create({ name, email, password, role });

    // Auto-login after registration
    req.session.userId = user._id;
    req.session.save(() => {
      setFlash(req, "success", `Welcome to BlogByte, ${user.name}!`);
      res.redirect(role === "admin" ? "/admin" : "/");
    });
  } catch (err) {
    if (err.code === 11000) {
      setFlash(req, "error", "Email already in use.");
      return res.redirect("/auth/register");
    }
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.showLogin = (req, res) => {
  res.render("auth/login", { title: "Sign In | BlogByte" });
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, isActive: true }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      setFlash(req, "error", "Invalid email or password.");
      return res.redirect("/auth/login");
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    req.session.userId = user._id;
    req.session.save(() => {
      const returnTo = req.session.returnTo || (user.role === "admin" ? "/admin" : "/");
      delete req.session.returnTo;
      setFlash(req, "success", `Welcome back, ${user.name}!`);
      res.redirect(returnTo);
    });
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("blogbyte.sid");
    res.redirect("/auth/login");
  });
};

// ── Profile ───────────────────────────────────────────────────────────────────
exports.showProfile = async (req, res, next) => {
  try {
    const Post = require("../models/Post");
    const posts = await Post.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title slug status views createdAt");

    res.render("auth/profile", {
      title: `${req.user.name} | BlogByte`,
      posts,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;
    await User.findByIdAndUpdate(req.user._id, { name, bio }, { runValidators: true });
    setFlash(req, "success", "Profile updated successfully.");
    res.redirect("/auth/profile");
  } catch (err) {
    next(err);
  }
};
