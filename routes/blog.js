/**
 * routes/blog.js — Public Blog Routes
 */

const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { postValidation, slugParam, commentValidation } = require("../middleware/validate");

// Home / listing
router.get("/", optionalAuth, blogController.home);

// New post form
router.get("/posts/new", requireAuth, blogController.newPost);

// Create post
router.post("/posts", requireAuth, postValidation, blogController.create);

// SEO-friendly slug route — must come AFTER /posts/new
router.get("/posts/:slug", optionalAuth, slugParam, blogController.show);

// Edit post form
router.get("/posts/:slug/edit", requireAuth, slugParam, blogController.edit);

// Update post
router.put("/posts/:slug", requireAuth, slugParam, postValidation, blogController.update);

// Delete post
router.delete("/posts/:slug", requireAuth, slugParam, blogController.destroy);

// Like / Unlike (AJAX)
router.post("/posts/:slug/like", requireAuth, slugParam, blogController.toggleLike);

// Add comment (AJAX)
router.post("/posts/:slug/comments", requireAuth, slugParam, commentValidation, blogController.addComment);

module.exports = router;
