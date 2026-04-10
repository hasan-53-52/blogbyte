/**
 * controllers/blogController.js — Blog Post CRUD & Public Views
 */

const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { setFlash } = require("../middleware/locals");

const POSTS_PER_PAGE = 9;

// ── Home / Post Listing ───────────────────────────────────────────────────────
exports.home = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const { category, tag, search } = req.query;

    const filter = { status: "published" };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (search) {
      filter.$text = { $search: search };
    }

    const [posts, total, featured] = await Promise.all([
      Post.find(filter)
        .sort(search ? { score: { $meta: "textScore" } } : { publishedAt: -1 })
        .skip((page - 1) * POSTS_PER_PAGE)
        .limit(POSTS_PER_PAGE)
        .populate("author", "name avatar")
        .select("title slug excerpt coverImage category tags readTime views publishedAt author featured"),

      Post.countDocuments(filter),

      page === 1 && !search
        ? Post.find({ status: "published", featured: true })
            .sort({ publishedAt: -1 })
            .limit(3)
            .populate("author", "name avatar")
        : Promise.resolve([]),
    ]);

    const categories = await Post.distinct("category", { status: "published" });
    const totalPages = Math.ceil(total / POSTS_PER_PAGE);

    res.render("blog/home", {
      title: search
        ? `Search: "${search}" | BlogByte`
        : category
        ? `${category} | BlogByte`
        : "BlogByte — Thoughts Worth Reading",
      posts,
      featured,
      categories,
      pagination: { page, totalPages, total },
      filters: { category, tag, search },
    });
  } catch (err) {
    next(err);
  }
};

// ── Single Post ───────────────────────────────────────────────────────────────
exports.show = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: "published" })
      .populate("author", "name avatar bio");

    if (!post) {
      return res.status(404).render("error", {
        title: "Post Not Found | BlogByte",
        code: 404,
        message: "This post doesn't exist or has been removed.",
      });
    }

    // Increment views (fire-and-forget)
    Post.incrementViews(post._id).catch(() => {});

    // Fetch comments
    const comments = await Comment.find({ post: post._id, isApproved: true, parentComment: null })
      .sort({ createdAt: -1 })
      .populate("author", "name avatar")
      .populate({
        path: "replies",
        match: { isApproved: true },
        populate: { path: "author", select: "name avatar" },
      });

    // Related posts
    const related = await Post.find({
      _id: { $ne: post._id },
      status: "published",
      $or: [{ category: post.category }, { tags: { $in: post.tags } }],
    })
      .sort({ publishedAt: -1 })
      .limit(3)
      .select("title slug excerpt coverImage category readTime publishedAt");

    // Check if current user liked this post
    const userLiked = req.user ? post.likes.some((id) => id.toString() === req.user._id.toString()) : false;

    res.render("blog/show", {
      title: `${post.metaTitle || post.title} | BlogByte`,
      metaDescription: post.metaDescription || post.excerpt,
      post,
      comments,
      related,
      userLiked,
    });
  } catch (err) {
    next(err);
  }
};

// ── New Post Form ─────────────────────────────────────────────────────────────
exports.newPost = (req, res) => {
  res.render("blog/form", {
    title: "New Post | BlogByte",
    post: null,
    action: "/posts",
    method: "POST",
  });
};

// ── Create Post ───────────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { title, content, excerpt, category, tags, status, metaTitle, metaDescription } = req.body;

    const post = await Post.create({
      title,
      content,
      excerpt,
      category,
      tags: Array.isArray(tags) ? tags : [],
      status: status || "draft",
      metaTitle,
      metaDescription,
      author: req.user._id,
    });

    setFlash(req, "success", status === "published" ? "Post published!" : "Post saved as draft.");
    res.redirect(status === "published" ? `/posts/${post.slug}` : "/auth/profile");
  } catch (err) {
    next(err);
  }
};

// ── Edit Post Form ────────────────────────────────────────────────────────────
exports.edit = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).render("error", { title: "Not Found | BlogByte", code: 404, message: "Post not found." });

    // Authorization: only author or admin
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).render("error", { title: "Forbidden | BlogByte", code: 403, message: "Access denied." });
    }

    res.render("blog/form", {
      title: `Edit: ${post.title} | BlogByte`,
      post,
      action: `/posts/${post.slug}?_method=PUT`,
      method: "POST",
    });
  } catch (err) {
    next(err);
  }
};

// ── Update Post ───────────────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).render("error", { title: "Not Found | BlogByte", code: 404, message: "Post not found." });

    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).render("error", { title: "Forbidden | BlogByte", code: 403, message: "Access denied." });
    }

    const { title, content, excerpt, category, tags, status, metaTitle, metaDescription } = req.body;

    Object.assign(post, {
      title,
      content,
      excerpt,
      category,
      tags: Array.isArray(tags) ? tags : [],
      status: status || post.status,
      metaTitle,
      metaDescription,
    });

    await post.save();

    setFlash(req, "success", "Post updated successfully.");
    res.redirect(`/posts/${post.slug}`);
  } catch (err) {
    next(err);
  }
};

// ── Delete Post ───────────────────────────────────────────────────────────────
exports.destroy = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await Promise.all([
      post.deleteOne(),
      Comment.deleteMany({ post: post._id }),
    ]);

    setFlash(req, "success", "Post deleted.");
    res.redirect(req.user.role === "admin" ? "/admin/posts" : "/auth/profile");
  } catch (err) {
    next(err);
  }
};

// ── Like / Unlike ─────────────────────────────────────────────────────────────
exports.toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const userId = req.user._id;
    const liked = post.likes.some((id) => id.toString() === userId.toString());

    if (liked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
    }

    await post.save({ validateBeforeSave: false });
    res.json({ success: true, likeCount: post.likes.length, liked: !liked });
  } catch (err) {
    next(err);
  }
};

// ── Add Comment ───────────────────────────────────────────────────────────────
exports.addComment = async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ success: false });

    const comment = await Comment.create({
      content: req.body.content,
      post: post._id,
      author: req.user._id,
      parentComment: req.body.parentComment || null,
    });

    await comment.populate("author", "name avatar");

    res.json({ success: true, comment });
  } catch (err) {
    next(err);
  }
};
