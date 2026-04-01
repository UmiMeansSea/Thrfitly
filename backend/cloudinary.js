const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Validate Cloudinary credentials
const validateCloudinaryCredentials = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  
  const missing = [];
  if (!CLOUDINARY_CLOUD_NAME) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!CLOUDINARY_API_KEY) missing.push("CLOUDINARY_API_KEY");
  if (!CLOUDINARY_API_SECRET) missing.push("CLOUDINARY_API_SECRET");
  
  if (missing.length > 0) {
    console.error("❌ CLOUDINARY CONFIGURATION ERROR");
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    console.error("📖 Setup guide: See CLOUDINARY_SETUP.md");
    console.error("🔧 For Railway, add these in: Backend Service → Variables");
    throw new Error(`Missing Cloudinary credentials: ${missing.join(", ")}`);
  }
  
  console.log("✅ Cloudinary credentials configured");
};

// Validate on startup
try {
  validateCloudinaryCredentials();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "thriftly",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      {
        width: 1200,
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  },
});

module.exports = { cloudinary, storage };
