# Quick Deployment Reference

## 🚀 Deploy to TestFlight (iOS)

```bash
# 1. Build for TestFlight
npm run build:ios:testflight

# 2. Wait for build to complete (15-30 minutes)
# Check status: npm run build:list

# 3. Submit to TestFlight
npm run submit:ios

# 4. Add testers in App Store Connect
# https://appstoreconnect.apple.com → Your App → TestFlight
```

## 📱 Create Android APK

```bash
# 1. Build APK
npm run build:android:apk

# 2. Wait for build to complete (15-30 minutes)
# Check status: npm run build:list

# 3. Download APK
# Go to https://expo.dev → Your Project → Builds → Download

# 4. Share APK with users
# Upload to Google Drive/Dropbox and share link
```

## 📋 Pre-Deployment Checklist

- [ ] API endpoints are production URLs (`config/api.ts`)
- [ ] Version number updated in `app.json`
- [ ] App tested on physical devices
- [ ] All features working correctly

## 🔧 Useful Commands

```bash
# Check build status
npm run build:list

# View build details
npm run build:view [BUILD_ID]

# Build both platforms
npm run build:all:preview
```

## 📚 Full Documentation

- **Detailed Guide**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Build Guide**: [BUILD_GUIDE.md](BUILD_GUIDE.md)
