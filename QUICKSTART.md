# 🚀 Cloudinary Migration - Quick Start Checklist

## ✅ Code Changes Complete

- [x] Dependencies installed (`cloudinary`, `multer-storage-cloudinary`)
- [x] `backend/cloudinary.js` created with configuration
- [x] `backend/routes/items.js` updated to use Cloudinary storage
- [x] `backend/routes/shop.js` updated to use Cloudinary storage
- [x] Image path handling updated (now uses `req.file.path` for full URLs)
- [x] Static `/uploads` route removed from `server.js`
- [x] Documentation created (`CLOUDINARY_SETUP.md`)
- [x] `.env.example` updated with Cloudinary variables

---

## 📋 What You Need to Do

### Local Development

```bash
# 1. Create Cloudinary account (free)
# Go to: https://cloudinary.com

# 2. Get your credentials from Dashboard → Settings → Credentials
# You need: Cloud Name, API Key, API Secret

# 3. Create .env in backend/ directory
# Copy from .env.example and fill in:
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# 4. Test locally
cd backend
npm run dev

# 5. Upload an image from the app
# 6. Verify it appears in: https://cloudinary.com/console/media_library
```

### Production (Railway)

```
1. Create Cloudinary account (free tier works for most shops)
2. Go to your Railway project → Backend service → Variables
3. Add the three Cloudinary environment variables
4. Redeploy the backend
5. Test by uploading an image from the app
```

---

## 🔍 Verification Steps

- [ ] Sell an item with photos — images appear in Cloudinary dashboard
- [ ] Upload shop logo/banner — verify in Cloudinary
- [ ] Check MongoDB — image URLs start with `https://res.cloudinary.com/`
- [ ] Refresh page — images still load (not 404)
- [ ] Redeploy on Railway — images persist

---

## 📊 Before/After

| Feature | Before | After |
|---------|--------|-------|
| Images persist after redeploy | ❌ Lost | ✅ Permanent |
| Image storage | Local `/uploads` | Cloudinary CDN |
| File size limit | 5 MB | 5 MB |
| Supported formats | JPG, PNG, GIF, WebP | JPG, PNG, GIF, WebP |
| Cost | Free (but lose images) | Free tier: 25GB/month |
| Global CDN | ❌ No | ✅ Yes |
| Auto optimization | ❌ No | ✅ Yes (WebP, etc) |

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cloudinary credentials missing" | Add all 3 env vars to `.env` or Railway |
| Images not uploading | Check Cloudinary credentials are correct |
| Old images broken | Expected — they were stored locally. Users re-upload. |
| File too large | Max 5MB per image. Compress or adjust in `cloudinary.js` |
| Upload slow | Cloudinary auto-optimizes. First upload may be slower. |

---

## 📚 Important Files

- **Configuration**: `backend/cloudinary.js`
- **Setup Guide**: `backend/CLOUDINARY_SETUP.md`
- **Migration Summary**: `CLOUDINARY_MIGRATION_SUMMARY.md`
- **Environment Template**: `backend/.env.example`

---

## 🎯 Next: Production Deployment

```bash
# 1. Test locally ✅
# 2. Push code to GitHub
# 3. Railroad auto-deploys (or deploy manually)
# 4. Monitor: https://cloudinary.com/console/media_library
```

---

**Questions?** See `backend/CLOUDINARY_SETUP.md` or contact support.

**Status**: Ready for deployment 🚀
