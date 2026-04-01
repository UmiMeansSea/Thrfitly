const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const shopRoutes = require("./routes/shop");
const shopsRoutes = require("./routes/shops");
const itemsRoutes = require("./routes/items");
const chatRoutes = require("./routes/chat");
const analyticsRoutes = require("./routes/analytics");
const reviewsRoutes = require("./routes/reviews");
const searchRoutes = require("./routes/search");
const path = require("path");

const app = express();
const httpServer = http.createServer(app);

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
// All images (shop logos, banners, item photos) are now stored on Cloudinary
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Basic input sanitization to reduce XSS/NoSQL injection vectors.
app.use((req, _res, next) => {
  const cleanse = (v) => {
    if (Array.isArray(v)) return v.map(cleanse);
    if (v && typeof v === "object") {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        if (k.startsWith("$") || k.includes(".")) continue;
        out[k] = cleanse(val);
      }
      return out;
    }
    if (typeof v === "string") return v.replace(/[<>]/g, "").trim();
    return v;
  };
  if (req.body) req.body = cleanse(req.body);
  if (req.query) req.query = cleanse(req.query);
  next();
});

// Debug middleware for session issues
app.use((req, res, next) => {
  if (req.url.includes('/items') || req.url.includes('/auth')) {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    console.log(`[DEBUG] Session ID:`, req.sessionID);
    console.log(`[DEBUG] Session userId:`, req.session?.userId);
    console.log(`[DEBUG] Cookies:`, req.headers.cookie);
  }
  next();
});

// Get allowed origins - always include production domains plus any from env
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://thriftly-git-master-umimeansseas-projects.vercel.app",
  "https://thriftly-2g76h4srw-umimeansseas-projects.vercel.app"
];

const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : [];
const corsOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

console.log("[DEBUG] CORS Origins:", corsOrigins);
console.log("[DEBUG] NODE_ENV:", process.env.NODE_ENV);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

// ── Trust proxy (needed for Railway behind load balancer) ──
app.set("trust proxy", 1);

// ── Sessions ───────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 30,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "none",
      secure: true,
      // No domain restriction - let browser handle it
    },
    name: "thriftly.sid", // Custom name to avoid conflicts
  })
);

// ── Routes ─────────────────────────────────────────────────
// Images are now served from Cloudinary, not local storage
app.use("/api/auth", authRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/shops", shopsRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/search", searchRoutes);

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
});

app.locals.io = io;

io.on("connection", (socket) => {
  socket.on("chat:join-user", (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });

  socket.on("chat:join-conversation", (conversationId) => {
    if (conversationId) socket.join(`conversation:${conversationId}`);
  });
});

// Health check
app.get("/", (req, res) => res.json({ message: "Thriftly API is running." }));

// ── Connect to MongoDB and start server ───────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
