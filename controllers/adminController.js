/**
 * controllers/adminController.js — Admin Dashboard CRUD
 */

const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const { setFlash } = require("../middleware/locals");

// ── Dashboard ─────────────────────────────────────────────────────────────────
exports.dashboard = async (req, res, next) => {
  try {
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalUsers,
      totalComments,
      recentPosts,
      recentUsers,
      topPosts,
    ] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: "published" }),
      Post.countDocuments({ status: "draft" }),
      User.countDocuments(),
      Comment.countDocuments(),
      Post.find().sort({ createdAt: -1 }).limit(5).populate("author", "name").select("title slug status views createdAt"),
      User.find().sort({ createdAt: -1 }).limit(5).select("name email role createdAt"),
      Post.find({ status: "published" }).sort({ views: -1 }).limit(5).select("title slug views"),
    ]);

    res.render("admin/dashboard", {
      title: "Admin Dashboard | BlogByte",
      stats: { totalPosts, publishedPosts, draftPosts, totalUsers, totalComments },
      recentPosts,
      recentUsers,
      topPosts,
    });
  } catch (err) {
    next(err);
  }
};

// ── Post Management ───────────────────────────────────────────────────────────
exports.listPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const { status, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("author", "name")
        .select("title slug status views category createdAt author featured"),
      Post.countDocuments(filter),
    ]);

    res.render("admin/posts", {
      title: "Manage Posts | BlogByte Admin",
      posts,
      pagination: { page, totalPages: Math.ceil(total / limit), total },
      filters: { status, search },
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleFeatured = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Not found" });
    post.featured = !post.featured;
    await post.save({ validateBeforeSave: false });
    res.json({ success: true, featured: post.featured });
  } catch (err) {
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (post) await Comment.deleteMany({ post: post._id });
    setFlash(req, "success", "Post deleted.");
    res.redirect("/admin/posts");
  } catch (err) {
    next(err);
  }
};

// ── User Management ───────────────────────────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;

    const [users, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("name email role isActive createdAt lastLogin"),
      User.countDocuments(),
    ]);

    res.render("admin/users", {
      title: "Manage Users | BlogByte Admin",
      users,
      pagination: { page, totalPages: Math.ceil(total / limit), total },
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot deactivate yourself" });
    }
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, isActive: user.isActive });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false });
    setFlash(req, "success", `${user.name} is now ${role}.`);
    res.redirect("/admin/users");
  } catch (err) {
    next(err);
  }
};

// ── Comment Management ────────────────────────────────────────────────────────
exports.listComments = async (req, res, next) => {
  try {
    const comments = await Comment.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "name email")
      .populate("post", "title slug");

    res.render("admin/comments", {
      title: "Manage Comments | BlogByte Admin",
      comments,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    setFlash(req, "success", "Comment deleted.");
    res.redirect("/admin/comments");
  } catch (err) {
    next(err);
  }
};
