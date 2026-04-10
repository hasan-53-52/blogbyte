/**
 * models/Post.js — Blog Post Model with SEO Slug & Full Features
 */

const mongoose = require("mongoose");
const slugify = require("slugify");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Post title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      minlength: [50, "Content must be at least 50 characters"],
    },
    excerpt: {
      type: String,
      maxlength: [300, "Excerpt cannot exceed 300 characters"],
    },
    coverImage: {
      type: String,
      default: null,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Technology",
        "Programming",
        "Design",
        "Science",
        "Business",
        "Lifestyle",
        "Health",
        "Travel",
        "Food",
        "Other",
      ],
    },
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: 30,
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    readTime: {
      type: Number, // minutes
      default: 1,
    },
    // SEO fields
    metaTitle: {
      type: String,
      maxlength: 70,
    },
    metaDescription: {
      type: String,
      maxlength: 160,
    },
    // Engagement
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Like count
postSchema.virtual("likeCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// Virtual: Comments (for future use)
postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "post",
});

// Pre-save: Generate slug from title
postSchema.pre("save", async function (next) {
  // Generate slug from title if new or title modified
  if (this.isModified("title")) {
    const baseSlug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true,
    });

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.model("Post").findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }

  // Auto-generate excerpt from content if not provided
  if (!this.excerpt && this.content) {
    const plainText = this.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    this.excerpt = plainText.substring(0, 280) + (plainText.length > 280 ? "..." : "");
  }

  // Auto-calculate read time (avg 200 words per minute)
  if (this.content) {
    const wordCount = this.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  // Set metaTitle/metaDescription defaults for SEO
  if (!this.metaTitle) this.metaTitle = this.title;
  if (!this.metaDescription) this.metaDescription = this.excerpt;

  // Set publishedAt when first publishing
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Static: Increment view count
postSchema.statics.incrementViews = async function (postId) {
  return this.findByIdAndUpdate(postId, { $inc: { views: 1 } });
};

// Query helper: Only published posts
postSchema.query.published = function () {
  return this.where({ status: "published" });
};

// Indexes for performance
postSchema.index({ slug: 1 });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ author: 1, status: 1 });
postSchema.index({ category: 1, status: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ title: "text", content: "text", tags: "text" }); // Full-text search

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
