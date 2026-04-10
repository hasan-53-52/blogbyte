/**
 * BlogByte — Main Server Entry Point
 * Production-ready blog platform built with Node.js + Express + MongoDB
 */

require("dotenv").config();
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { injectLocals } = require("./middleware/locals");

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const blogRoutes = require("./routes/blog");
const adminRoutes = require("./routes/admin");
const apiRoutes = require("./routes/api");

const app = express();

// ── Trust Render's Proxy ──────────────────────────────────────────────────────
app.set("trust proxy", 1); // Required for secure cookies behind Render's load balancer

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts, please try again later.",
});
app.use("/auth/", authLimiter);

// ── Core Middleware ───────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(mongoSanitize()); // Prevent NoSQL injection

// Static files
app.use(express.static(path.join(__dirname, "public")));

// ── Session Configuration ─────────────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret_change_me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      touchAfter: 24 * 3600, // Update session only once per day
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax", // Changed from "strict" to "lax" for Render proxy compatibility
    },
    name: "blogbyte.sid",
  })
);

// ── View Engine ───────────────────────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Template Locals Middleware ────────────────────────────────────────────────
app.use(injectLocals);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/api/v1", apiRoutes);
app.use("/", blogRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render("error", {
    title: "404 — Page Not Found | BlogByte",
    code: 404,
    message: "The page you're looking for doesn't exist.",
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).render("error", {
    title: `${statusCode} — Error | BlogByte`,
    code: statusCode,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong. Please try again later.",
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║         BlogByte Server              ║
  ║  Running on http://localhost:${PORT}   ║
  ║  Environment: ${(process.env.NODE_ENV || "development").padEnd(20)}║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
