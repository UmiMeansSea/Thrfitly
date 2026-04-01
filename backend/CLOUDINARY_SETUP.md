# Cloudinary Setup Guide for Thriftly Image Migration

This document explains how to configure Cloudinary for handling all image uploads in Thriftly (shop logos, banners, item photos).

## What Changed

Previously, images were uploaded to the local `/uploads` directory on the Railway server. This caused all images to be lost on every deployment since Railway's file system is ephemeral.

Now all images are uploaded directly to **Cloudinary**, a reliable cloud storage service. This ensures images persist across deployments.

## Setup Steps

### 1. Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account (free tier includes 25GB/month storage)
3. Navigate to your **Dashboard** or **Settings → Account**

### 2. Get Your Credentials

You'll find three credentials you need:

- **Cloud Name**: Visible on your dashboard
- **API Key**: Found under "API Keys" section
- **API Secret**: Also found under "API Keys" section

⚠️ **Important**: Keep your API Secret private! Never commit it to version control.

### 3. Set Environment Variables

Add these to your `.env` file in the `backend/` directory:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

Or on Railway:

1. Go to your Railway project
2. Select your backend service
3. Go to **Variables**
4. Add the three environment variables above
5. Redeploy

### 4. How It Works

- **Item Photos**: When sellers list items, images upload directly to Cloudinary and are stored as full HTTPS URLs
- **Shop Branding**: Logo and header images also upload to Cloudinary
- **Storage**: All images are organized in the `thriftly` folder in your Cloudinary account
- **Automatic Optimization**: Cloudinary automatically optimizes images for web (auto format, auto quality)

### 5. Image URLs

Cloudinary image URLs look like:
```
https://res.cloudinary.com/your_cloud_name/image/upload/v1234567890/thriftly/image-name.jpg
```

These are stored directly in the database instead of relative `/uploads/` paths.

### 6. Testing Locally

To test locally:

1. Install dependencies: `npm install cloudinary multer-storage-cloudinary`
2. Create a `.env` file with your Cloudinary credentials
3. Start the server: `npm run dev`
4. Upload an image through the app
5. Check your Cloudinary dashboard - the image should appear in the `thriftly` folder

### 7. Troubleshooting

**"Missing Cloudinary credentials" error:**
- Check that all three environment variables are set correctly
- Restart your backend server after adding environment variables

**"Upload failed" error:**
- Verify your Cloud Name, API Key, and API Secret are correct
- Ensure your Cloudinary account is active and hasn't exceeded storage limits
- Check that the uploaded file is a valid image (JPG, PNG, GIF, or WebP)

**Images not appearing on prod:**
- Verify Railway environment variables are set
- Redeploy the backend service
- Check Cloud Name matches your Cloudinary dashboard

### 8. File Size & Format Limits

- **Max file size**: 5 MB per image
- **Allowed formats**: JPG, JPEG, PNG, GIF, WebP
- **Automatic transformations**:
  - Width: 1200px (largest dimension)
  - Quality: Auto-optimized
  - Format: Auto (uses best format for browser)

### 9. Data Migration (if existing images)

If you have existing images in the `/uploads/` folder, you'll need to migrate them:

1. Download all images from the `/uploads` directory
2. Upload them to Cloudinary manually or programmatically
3. Update database records with new Cloudinary URLs

Contact support if you need help with migration.

---

**Questions?** Check Cloudinary's documentation: https://cloudinary.com/documentation
