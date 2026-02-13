# Fresa Health Mobile App - Deployment Guide

Complete guide for deploying the Fresa Health mobile app to TestFlight (iOS) and creating Android APK for users.

## 📋 Prerequisites

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
# If you don't have an account, create one at https://expo.dev
```

### 3. Verify Project Configuration

```bash
cd FresaMobile
eas whoami  # Verify you're logged in
```

## 🍎 iOS - TestFlight Deployment

### Step 1: Apple Developer Account Setup

**Requirements:**

- Apple Developer Account ($99/year)
- App Store Connect access
- Valid Apple ID

### Step 2: Configure Apple Credentials

EAS will handle credentials automatically, but you can configure manually:

```bash
# Configure iOS credentials
eas credentials --platform ios
```

**First-time setup:**

- EAS will prompt you to authenticate with Apple
- You'll need to provide your Apple ID and password
- EAS will create necessary certificates and provisioning profiles

### Step 3: Build for TestFlight

```bash
# Build iOS app for TestFlight
npm run build:ios:testflight

# Or manually:
eas build --profile testflight --platform ios
```

**Build Process:**

- Build takes 15-30 minutes
- You'll see progress in terminal
- Build will be uploaded to App Store Connect automatically

### Step 4: Submit to TestFlight

**Option A: Automatic Submission (Recommended)**

```bash
# After build completes, submit automatically
npm run submit:ios

# Or manually:
eas submit --platform ios
```

**Option B: Manual Submission**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app → TestFlight
3. Wait for processing (10-30 minutes)
4. Add testers and groups
5. Distribute build to testers

### Step 5: Add TestFlight Testers

1. **Internal Testers** (up to 100):
    - App Store Connect → Users and Access → Internal Testing
    - Add email addresses
    - They'll receive TestFlight invitation

2. **External Testers** (up to 10,000):
    - App Store Connect → TestFlight → External Testing
    - Create a group
    - Add the build
    - Submit for Beta App Review (first time only)
    - Add email addresses

### Step 6: Share TestFlight Link

Testers will receive an email with:

- TestFlight invitation link
- Instructions to install TestFlight app
- Access to your app

## 🤖 Android - APK Distribution

### Step 1: Build Android APK

```bash
# Build standalone APK
npm run build:android:apk

# Or manually:
eas build --profile android-apk --platform android
```

**Build Process:**

- Build takes 15-30 minutes
- APK will be available for download

### Step 2: Download APK

**After build completes:**

1. **Via EAS Dashboard:**
   ```bash
   # Check build status
   npm run build:list
   
   # View build details
   npm run build:view [BUILD_ID]
   ```

2. **Download from Expo Dashboard:**
    - Go to https://expo.dev
    - Navigate to your project → Builds
    - Find completed Android build
    - Click **Download** button
    - Save the `.apk` file

### Step 3: Distribute APK to Users

**Option A: Direct Distribution (Recommended for Testing)**

1. Upload APK to cloud storage:
    - Google Drive
    - Dropbox
    - WeTransfer
    - Your own server

2. Share download link with users

3. **User Installation Steps:**
    - Download APK on Android device
    - Enable "Install from Unknown Sources" in Settings
    - Tap APK file to install
    - Follow installation prompts

**Option B: Google Play Internal Testing**

1. Create app in Google Play Console
2. Upload APK/AAB to Internal Testing track
3. Add testers via email
4. Testers install from Play Store

**Option C: Firebase App Distribution**

1. Upload APK to Firebase App Distribution
2. Add testers via email
3. Testers receive download link

## 🚀 Quick Deployment Commands

### iOS TestFlight

```bash
# Build and submit in one go
npm run build:ios:testflight
# Wait for build to complete, then:
npm run submit:ios
```

### Android APK

```bash
# Build APK
npm run build:android:apk

# After build completes, download from:
# https://expo.dev → Your Project → Builds
```

### Both Platforms

```bash
# Build both iOS and Android
npm run build:all:preview
```

## 📱 Build Profiles Explained

| Profile       | Platform | Output  | Use Case                |
|---------------|----------|---------|-------------------------|
| `testflight`  | iOS      | IPA     | TestFlight distribution |
| `android-apk` | Android  | APK     | Direct APK distribution |
| `preview`     | Both     | IPA/APK | Internal testing        |
| `production`  | Both     | IPA/AAB | App Store/Play Store    |

## 🔧 Configuration Files

### `eas.json`

- Build profiles and configurations
- Already configured for TestFlight and APK builds

### `app.json`

- App metadata
- Bundle identifiers: `com.fresahealth.mobile`
- Version: `1.0.0`
- Icons and splash screens configured

## 📝 Version Management

### Update Version Before Building

**In `app.json`:**

```json
{
  "expo": {
    "version": "1.0.1",
    // Update this
    "ios": {
      "buildNumber": "2"
      // Increment for each build
    },
    "android": {
      "versionCode": 2
      // Increment for each build
    }
  }
}
```

**Or use auto-increment:**

- `testflight` and `production` profiles have `autoIncrement: true`
- Version numbers increment automatically

## ✅ Pre-Deployment Checklist

- [ ] Update version number in `app.json`
- [ ] Verify API endpoints in `config/api.ts` are production URLs
- [ ] Test app locally on physical devices
- [ ] Verify all features work correctly
- [ ] Check app icons and splash screens
- [ ] Review app permissions
- [ ] Test notifications
- [ ] Verify WebSocket connection
- [ ] Check error handling

## 🐛 Troubleshooting

### iOS Build Issues

**Issue: Credentials not found**

```bash
# Reset credentials
eas credentials --platform ios
```

**Issue: Build fails with code signing error**

- Ensure Apple Developer account is active
- Check bundle identifier matches App Store Connect
- Verify certificates are valid

**Issue: TestFlight processing fails**

- Check app compliance (privacy policy, etc.)
- Verify all required app information is filled
- Check for compliance issues in App Store Connect

### Android Build Issues

**Issue: APK won't install**

- Ensure "Install from Unknown Sources" is enabled
- Check Android version compatibility
- Verify APK is not corrupted (re-download)

**Issue: Build fails**

```bash
# Check build logs
eas build:view [BUILD_ID]

# Clear cache and rebuild
eas build --profile android-apk --platform android --clear-cache
```

### General Issues

**Issue: Build takes too long**

- First build: 20-30 minutes (normal)
- Subsequent builds: 10-15 minutes (cached)
- Check EAS dashboard for queue status

**Issue: Can't find build**

```bash
# List all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]
```

## 📊 Monitoring Builds

### Check Build Status

```bash
# List recent builds
npm run build:list

# View specific build details
npm run build:view [BUILD_ID]
```

### EAS Dashboard

- Visit https://expo.dev
- Navigate to your project
- Click **Builds** tab
- View build history and status

## 🔐 Security Notes

### For Production Builds:

- Never commit API keys or secrets
- Use environment variables for sensitive data
- Enable code obfuscation (already configured)
- Review app permissions

### For APK Distribution:

- APK files can be reverse-engineered
- Use ProGuard/R8 for code obfuscation
- Consider AAB format for Play Store (smaller size)

## 📈 Post-Deployment

### After TestFlight Release:

1. Monitor crash reports in App Store Connect
2. Collect tester feedback
3. Fix critical bugs
4. Prepare for App Store submission

### After APK Distribution:

1. Monitor user feedback
2. Track installation issues
3. Collect analytics data
4. Plan for Play Store release

## 🎯 Next Steps

### For App Store Release:

1. Complete App Store listing
2. Add screenshots and descriptions
3. Submit for review
4. Wait for approval (1-7 days)

### For Play Store Release:

1. Create Play Store listing
2. Upload AAB (not APK)
3. Complete store listing
4. Submit for review
5. Wait for approval (1-3 days)

## 📚 Useful Links

- **EAS Dashboard**: https://expo.dev
- **App Store Connect**: https://appstoreconnect.apple.com
- **Google Play Console**: https://play.google.com/console
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **TestFlight Guide**: https://developer.apple.com/testflight/

## 🆘 Support

If you encounter issues:

1. Check build logs: `eas build:view [BUILD_ID]`
2. Review EAS documentation
3. Check Expo forums
4. Contact Expo support

---

**Ready to deploy?** Start with:

```bash
# iOS TestFlight
npm run build:ios:testflight

# Android APK
npm run build:android:apk
```
