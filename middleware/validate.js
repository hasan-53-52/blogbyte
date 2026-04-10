/**
 * middleware/validate.js — Express-Validator Rules & Sanitization
 */

const { body, param, query, validationResult } = require("express-validator");
const xss = require("xss");

// ── Utility: Run validations and return errors ────────────────────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    if (req.headers.accept?.includes("application/json")) {
      return res.status(422).json({ success: false, errors: messages });
    }
    req.session.flash = { error: messages[0] };
    return res.redirect("back");
  }
  next();
};

// ── Auth Validators ───────────────────────────────────────────────────────────
const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters")
    .escape(),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase and a number"),

  body("confirmPassword")
    .custom((val, { req }) => {
      if (val !== req.body.password) throw new Error("Passwords do not match");
      return true;
    }),

  handleValidation,
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidation,
];

// ── Post Validators ───────────────────────────────────────────────────────────
const postValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("Title is required")
    .isLength({ min: 5, max: 150 }).withMessage("Title must be 5–150 characters")
    .escape(),

  body("content")
    .trim()
    .notEmpty().withMessage("Content is required")
    .isLength({ min: 50 }).withMessage("Content must be at least 50 characters")
    .customSanitizer((val) => xss(val)), // Sanitize HTML

  body("excerpt")
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage("Excerpt cannot exceed 300 characters")
    .escape(),

  body("category")
    .trim()
    .notEmpty().withMessage("Category is required")
    .isIn([
      "Technology", "Programming", "Design", "Science",
      "Business", "Lifestyle", "Health", "Travel", "Food", "Other",
    ]).withMessage("Invalid category"),

  body("tags")
    .optional()
    .customSanitizer((val) => {
      if (!val) return [];
      const tags = Array.isArray(val) ? val : val.split(",");
      return tags
        .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
        .filter((t) => t.length > 0 && t.length <= 30)
        .slice(0, 10); // Max 10 tags
    }),

  body("status")
    .optional()
    .isIn(["draft", "published", "archived"]).withMessage("Invalid status"),

  body("metaTitle")
    .optional()
    .trim()
    .isLength({ max: 70 }).withMessage("Meta title max 70 characters")
    .escape(),

  body("metaDescription")
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage("Meta description max 160 characters")
    .escape(),

  handleValidation,
];

// ── Comment Validator ─────────────────────────────────────────────────────────
const commentValidation = [
  body("content")
    .trim()
    .notEmpty().withMessage("Comment cannot be empty")
    .isLength({ min: 2, max: 1000 }).withMessage("Comment must be 2–1000 characters")
    .customSanitizer((val) => xss(val, { whiteList: {} })), // Strip all HTML from comments
  handleValidation,
];

// ── Param Validators ──────────────────────────────────────────────────────────
const slugParam = [
  param("slug")
    .trim()
    .notEmpty().withMessage("Slug is required")
    .matches(/^[a-z0-9-]+$/).withMessage("Invalid slug format"),
  handleValidation,
];

const idParam = [
  param("id").isMongoId().withMessage("Invalid ID"),
  handleValidation,
];

module.exports = {
  registerValidation,
  loginValidation,
  postValidation,
  commentValidation,
  slugParam,
  idParam,
};
