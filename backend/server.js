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
// Allow <img> / fetch from Vite (different port) to load /uploads/* on this API.
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

// Get allowed origins from env or default to localhost
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

// ── Sessions ───────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: "lax",
      secure: false, // Set to true in production with HTTPS
    },
  })
);

// ── Static uploads ─────────────────────────────────────────
// Serve with explicit CORS headers so images load from frontend
const uploadsCorsOrigin = process.env.CORS_ORIGIN?.split(",")[0] || "http://localhost:5173";
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", uploadsCorsOrigin);
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, "uploads")));

// ── Routes ─────────────────────────────────────────────────
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

// ── Connect to MongoDB and start server ───────────────────
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0"; // Bind to all interfaces for Railway

// Health check - respond immediately even if DB is connecting
app.get("/", (req, res) => res.json({ message: "Thriftly API is running.", status: "ok" }));

// Graceful startup with retry logic for MongoDB
const startServer = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ Connected to MongoDB");
      break;
    } catch (err) {
      retries++;
      console.error(`❌ MongoDB connection attempt ${retries} failed:`, err.message);
      if (retries >= maxRetries) {
        console.error("❌ Max retries reached. Starting server without DB...");
        break;
      }
      await new Promise(r => setTimeout(r, 5000)); // Wait 5s before retry
    }
  }
  
  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  });
};

startServer();
