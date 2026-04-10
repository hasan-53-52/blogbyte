/**
 * utils/seeder.js — Seed the database with sample data
 * Run with: npm run seed
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

const connectDB = require("../config/db");

const SAMPLE_USERS = [
  { name: "Admin User", email: "admin@blogbyte.com", password: "Admin@1234", role: "admin", bio: "Platform administrator and lead writer." },
  { name: "Jane Doe", email: "jane@blogbyte.com", password: "User@1234", role: "user", bio: "Frontend developer and design enthusiast." },
  { name: "John Smith", email: "john@blogbyte.com", password: "User@1234", role: "user", bio: "Backend engineer who loves distributed systems." },
];

const SAMPLE_POSTS = [
  {
    title: "Getting Started with Node.js and Express in 2024",
    content: `<h2>Introduction</h2><p>Node.js has become one of the most popular runtimes for building server-side applications. Combined with Express.js, you can build robust REST APIs in minutes. In this guide, we'll walk through the fundamentals of building a production-ready web application.</p><h2>Why Node.js?</h2><p>Node.js is built on Chrome's V8 engine and uses an event-driven, non-blocking I/O model that makes it lightweight and efficient. This makes it perfect for data-intensive real-time applications that run across distributed devices.</p><h2>Setting Up Your Project</h2><p>Start by initializing a new Node.js project with <code>npm init -y</code>. Then install Express: <code>npm install express</code>.</p><pre>const express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Hello, World!' });\n});\n\napp.listen(3000);</pre><h2>Conclusion</h2><p>Node.js and Express provide a powerful combination for building modern web applications. The ecosystem is vast, the community is active, and the performance is excellent for most use cases.</p>`,
    category: "Programming",
    tags: ["nodejs", "express", "javascript", "backend"],
    status: "published",
    featured: true,
  },
  {
    title: "The Art of Minimal UI Design: Less Is More",
    content: `<h2>What is Minimal Design?</h2><p>Minimal UI design is a philosophy that strips away all unnecessary elements, leaving only what's essential. It's not about making things look empty — it's about creating clarity through restraint.</p><h2>Core Principles</h2><p>White space is your friend. Every element on the page should earn its place. When in doubt, remove it. Typography should do the heavy lifting — choose typefaces that communicate your brand's personality without embellishment.</p><blockquote>Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away. — Antoine de Saint-Exupéry</blockquote><h2>Practical Applications</h2><p>Start with a content-first approach. Map out what information the user needs, then design the interface around that. Use a limited color palette — two to three colors maximum. Let your primary brand color do the work.</p><h2>Common Mistakes</h2><p>Minimal doesn't mean boring. Many designers strip away personality along with clutter. Your minimal design should still feel distinctly <em>you</em>. The goal is clarity, not sterility.</p>`,
    category: "Design",
    tags: ["ui", "design", "minimalism", "ux"],
    status: "published",
    featured: true,
  },
  {
    title: "MongoDB Aggregation Pipelines: A Deep Dive",
    content: `<h2>What Are Aggregation Pipelines?</h2><p>MongoDB's aggregation framework is a powerful tool for transforming and analyzing data. Unlike simple queries, aggregation pipelines let you process documents through a series of stages, each transforming the data in some way.</p><h2>Core Stages</h2><p>The most commonly used stages are <code>$match</code>, <code>$group</code>, <code>$sort</code>, <code>$limit</code>, and <code>$project</code>. Think of each stage as a step in an assembly line — data flows in, gets transformed, and flows out.</p><pre>db.posts.aggregate([\n  { $match: { status: 'published' } },\n  { $group: { _id: '$category', count: { $sum: 1 } } },\n  { $sort: { count: -1 } }\n])</pre><h2>Performance Tips</h2><p>Always place <code>$match</code> as early as possible to reduce the number of documents in the pipeline. Use indexes on the fields you're matching against. For large datasets, consider using <code>$limit</code> early to reduce memory usage.</p>`,
    category: "Programming",
    tags: ["mongodb", "database", "aggregation", "nosql"],
    status: "published",
    featured: false,
  },
  {
    title: "Why TypeScript Is Worth the Learning Curve",
    content: `<p>TypeScript has gone from a niche tool to an industry standard. If you're still writing plain JavaScript for large projects, you're making your life harder than it needs to be. Here's why the switch is worth it.</p><h2>Catching Bugs Early</h2><p>The most obvious benefit is catching type errors at compile time rather than runtime. This alone can save hours of debugging. TypeScript's type inference means you don't have to annotate everything — it figures out types automatically in most cases.</p><h2>Better Developer Experience</h2><p>With TypeScript, your editor knows exactly what properties and methods are available on every object. Autocomplete becomes intelligent, refactoring becomes safe, and reading unfamiliar code becomes much easier.</p><h2>The Learning Curve Is Real But Short</h2><p>Yes, TypeScript adds overhead. But for any project larger than a weekend hack, the investment pays off within days. Start by adding TypeScript to a new project and gradually you'll wonder how you lived without it.</p>`,
    category: "Technology",
    tags: ["typescript", "javascript", "webdev"],
    status: "published",
    featured: false,
  },
  {
    title: "Building Resilient Systems: Lessons from Production",
    content: `<p>After running production systems at scale, you learn that everything that can fail will fail — usually at the worst possible time. Here are the lessons that have shaped how I architect systems today.</p><h2>Embrace Failure</h2><p>Don't try to prevent failure — design for it. Circuit breakers, retries with exponential backoff, and graceful degradation are not nice-to-haves; they are requirements for any serious system.</p><h2>Observability First</h2><p>If you can't observe it, you can't fix it. Invest in logging, metrics, and tracing before you invest in features. You should be able to answer "what is the system doing right now?" without looking at code.</p><blockquote>Hope is not a strategy. Test your failures in production — intentionally — before they test you.</blockquote>`,
    category: "Technology",
    tags: ["systems", "reliability", "architecture", "devops"],
    status: "published",
    featured: false,
  },
  {
    title: "Draft: Introduction to WebAssembly",
    content: `<p>WebAssembly (WASM) is an exciting technology that allows code written in languages like C++, Rust, and Go to run in the browser at near-native speeds. This is a draft post exploring the basics.</p><p>More content coming soon...</p>`,
    category: "Technology",
    tags: ["webassembly", "wasm", "performance"],
    status: "draft",
    featured: false,
  },
];

const seed = async () => {
  try {
    await connectDB();
    console.log("🌱 Starting seed...");

    // Clear existing data
    await Promise.all([User.deleteMany(), Post.deleteMany(), Comment.deleteMany()]);
    console.log("🗑️  Cleared existing data");

    // Create users
    const users = await User.create(SAMPLE_USERS);
    console.log(`👤 Created ${users.length} users`);
    console.log("   📧 Admin: admin@blogbyte.com / Admin@1234");
    console.log("   📧 User:  jane@blogbyte.com  / User@1234");

    // Create posts (alternate between users)
    const admin = users.find((u) => u.role === "admin");
    const jane = users.find((u) => u.email === "jane@blogbyte.com");
    const john = users.find((u) => u.email === "john@blogbyte.com");

    const authorMap = [admin, jane, john, jane, john, admin];
    const postsToCreate = SAMPLE_POSTS.map((post, i) => ({
      ...post,
      author: authorMap[i % authorMap.length]._id,
    }));

    const posts = await Post.create(postsToCreate);
    console.log(`📝 Created ${posts.length} posts`);

    // Create sample comments
    const publishedPosts = posts.filter((p) => p.status === "published");
    const commentData = [];
    publishedPosts.slice(0, 3).forEach((post, pi) => {
      commentData.push(
        { content: "Great article! Really helped me understand this topic.", post: post._id, author: jane._id },
        { content: "Thanks for the detailed explanation. Looking forward to more posts like this.", post: post._id, author: john._id }
      );
    });

    await Comment.create(commentData);
    console.log(`💬 Created ${commentData.length} comments`);

    console.log("\n✅ Seed complete! Run: npm start");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
