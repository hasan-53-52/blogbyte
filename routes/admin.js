/**
 * routes/admin.js — Admin-Only Routes
 */

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");
const { idParam } = require("../middleware/validate");

// All admin routes require admin role
router.use(requireAdmin);

router.get("/", adminController.dashboard);

// Posts
router.get("/posts", adminController.listPosts);
router.patch("/posts/:id/featured", idParam, adminController.toggleFeatured);
router.delete("/posts/:id", idParam, adminController.deletePost);

// Users
router.get("/users", adminController.listUsers);
router.patch("/users/:id/status", idParam, adminController.toggleUserStatus);
router.put("/users/:id/role", idParam, adminController.updateUserRole);

// Comments
router.get("/comments", adminController.listComments);
router.delete("/comments/:id", idParam, adminController.deleteComment);

module.exports = router;
