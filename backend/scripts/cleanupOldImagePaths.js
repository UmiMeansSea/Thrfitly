/**
 * Migration Script: Clean up old /uploads/ image paths
 * 
 * This script removes all old local disk image paths (/uploads/...) from the database
 * since we've migrated to Cloudinary for image storage.
 * 
 * Run: npm run migrate:cleanup
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Item = require("../models/Item");
const Seller = require("../models/Seller");
const Message = require("../models/Message");

async function cleanupOldImagePaths() {
  try {
    console.log("🔍 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // ─────────────────────────────────────────────────────
    // 1. Clean up Item images (remove /uploads/ paths)
    // ─────────────────────────────────────────────────────
    console.log("📦 Cleaning Item images...");
    const itemUpdateResult = await Item.updateMany(
      { images: { $regex: "^/uploads/" } },
      { $pull: { images: { $regex: "^/uploads/" } } }
    );
    console.log(`   ✓ Removed ${itemUpdateResult.modifiedCount} items with old image paths`);

    // ─────────────────────────────────────────────────────
    // 2. Clean up Seller logos/headers (set to null if old paths)
    // ─────────────────────────────────────────────────────
    console.log("\n🏪 Cleaning Seller branding images...");
    const sellerUpdateResult = await Seller.updateMany(
      {
        $or: [
          { shopLogoUrl: { $regex: "^/uploads/" } },
          { headerImageUrl: { $regex: "^/uploads/" } },
        ],
      },
      [
        {
          $set: {
            shopLogoUrl: {
              $cond: [
                { $regexMatch: { input: "$shopLogoUrl", regex: "^/uploads/" } },
                null,
                "$shopLogoUrl",
              ],
            },
            headerImageUrl: {
              $cond: [
                { $regexMatch: { input: "$headerImageUrl", regex: "^/uploads/" } },
                null,
                "$headerImageUrl",
              ],
            },
          },
        },
      ]
    );
    console.log(`   ✓ Cleaned ${sellerUpdateResult.modifiedCount} sellers with old logo/header paths`);

    // ─────────────────────────────────────────────────────
    // 3. Clean up Message images (remove old /uploads/chat paths)
    // ─────────────────────────────────────────────────────
    console.log("\n💬 Cleaning Message images...");
    const messageUpdateResult = await Message.updateMany(
      { images: { $regex: "^/uploads/" } },
      { $pull: { images: { $regex: "^/uploads/" } } }
    );
    console.log(`   ✓ Removed ${messageUpdateResult.modifiedCount} messages with old image paths`);

    // ─────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────
    console.log("\n✨ Cleanup Complete!");
    console.log("─────────────────────────────────────────");
    console.log(`Items modified:    ${itemUpdateResult.modifiedCount}`);
    console.log(`Sellers modified:  ${sellerUpdateResult.modifiedCount}`);
    console.log(`Messages modified: ${messageUpdateResult.modifiedCount}`);
    console.log("─────────────────────────────────────────");
    console.log("\n📌 Next steps:");
    console.log("   1. All new images will be stored on Cloudinary");
    console.log("   2. Users can re-upload images to populate new items");
    console.log("   3. Old local images are removed from the database");
    console.log("\n🚀 Your app is now fully migrated to Cloudinary!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOldImagePaths();
