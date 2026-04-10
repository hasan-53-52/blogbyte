/**
 * routes/api.js — REST API v1 Routes (JSON)
 */

const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// ── GET /api/v1/posts ─────────────────────────────────────────────────────────
router.get("/posts", async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag, search } = req.query;
    const filter = { status: "published" };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (search) filter.$text = { $search: search };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ publishedAt: -1 })
        .skip((page - 1) * Math.min(limit, 50))
        .limit(Math.min(parseInt(limit), 50))
        .populate("author", "name")
        .select("title slug excerpt category tags readTime views publishedAt author"),
      Post.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/v1/posts/:slug ───────────────────────────────────────────────────
router.get("/posts/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: "published" })
      .populate("author", "name bio avatar");
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/v1/categories ────────────────────────────────────────────────────
router.get("/categories", async (req, res) => {
  try {
    const categories = await Post.aggregate([
      { $match: { status: "published" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/v1/tags ──────────────────────────────────────────────────────────
router.get("/tags", async (req, res) => {
  try {
    const tags = await Post.aggregate([
      { $match: { status: "published" } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]);
    res.json({ success: true, data: tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: GET /api/v1/admin/stats ────────────────────────────────────────────
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const User = require("../models/User");
    const [posts, users, comments] = await Promise.all([
      Post.countDocuments(),
      User.countDocuments(),
      Comment.countDocuments(),
    ]);
    res.json({ success: true, data: { posts, users, comments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
