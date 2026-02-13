# Build Guide for Fresa Health Mobile App

This guide will help you build your Expo app for iOS and Android using EAS Build.

> **📱 For TestFlight and Android APK deployment, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

## Quick Start - Deploy to Users

### iOS TestFlight

```bash
npm run build:ios:testflight
npm run submit:ios  # After build completes
```

### Android APK

```bash
npm run build:android:apk
# Download APK from https://expo.dev → Builds
```

## Prerequisites

### 1. Install Required Tools

```bash
# Install Node.js (if not already installed)
# Check version: node --version (should be 18+)

# Install EAS CLI globally
npm install -g eas-cli

# Verify installation
eas --version
```

### 2. Expo Account Setup

```bash
# Login to your Expo account
eas login

# If you don't have an account, create one at https://expo.dev
# Then run: eas login
```

### 3. Configure EAS Project

```bash
# Link your project to EAS (run this in your project directory)
eas build:configure
```

## 🎯 Quick Start: Building for Team/Public Testing

**If you want to share your app with teammates or public users** (not just development):

### For Android APK (Easiest - No Account Needed)

```bash
# Build standalone APK
npm run build:android:apk

# After build completes:
# 1. Go to https://expo.dev and login
# 2. Navigate to your project → Builds
# 3. Download the APK file
# 4. Share the APK with your users (they can install directly)
```

**Note:** Android APK builds don't require a Google Play account. You can share the APK file directly.

### For iOS TestFlight (Requires Apple Developer Account)

```bash
# Build for TestFlight (requires $99/year Apple Developer account)
npm run build:ios:testflight

# After build completes, submit to TestFlight:
npm run submit:ios

# Then add testers in App Store Connect
```

**See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed TestFlight setup instructions.**

---

## Development Builds (For Development Only)

**Note:** Development builds require connecting to a dev server. For sharing with others, use Preview/Production builds
above.

### For Testing on Physical Devices

#### iOS Development Build

```bash
# Build for iOS development
eas build --profile development --platform ios

# After build completes, install on device using:
# - TestFlight (if using internal distribution)
# - Direct download link from EAS dashboard
```

#### Android Development Build

```bash
# Build for Android development
eas build --profile development --platform android

# Download the APK from the EAS dashboard and install on your device
```

## Preview Builds (Internal Testing & Sharing)

Preview builds create **standalone apps** that don't require a development server. Perfect for sharing with teammates
and testers.

### Android Preview Build (Recommended for Quick Sharing)

**Best option if you want to share quickly - no Google Play account needed!**

```bash
# Build standalone APK
eas build --profile preview --platform android
```

**After build completes (15-30 minutes):**

1. **Get the APK:**
   - Go to https://expo.dev and login
   - Navigate to your project → **Builds** tab
   - Find your completed build and click **Download**

2. **Share with your team:**
   - **Option A:** Upload APK to Google Drive/Dropbox and share link
   - **Option B:** Email the APK directly
   - **Option C:** Use a file sharing service (WeTransfer, etc.)

3. **Installation:**
   - Recipients download the APK on their Android device
   - They may need to enable "Install from Unknown Sources" in settings
   - Tap the APK file to install

**Note:** Android preview builds are APK files that can be installed directly without Google Play Store.

### iOS Preview Build

**Requires Apple Developer account ($99/year)**

```bash
# Build iOS preview
eas build --profile preview --platform ios
```

**After build completes:**

1. **TestFlight (Recommended):**
   - Build automatically uploads to TestFlight
   - Add testers in App Store Connect
   - Share TestFlight link with testers
   - Testers install via TestFlight app

2. **Direct Download (Alternative):**
   - Download IPA from EAS dashboard
   - Distribute via Apple's Ad Hoc or Enterprise distribution
   - Requires UDIDs of test devices (for Ad Hoc)

## Production Builds

### iOS Production Build

**Requirements:**

- Apple Developer Account ($99/year)
- App Store Connect access

**Steps:**

1. **Configure Apple Credentials:**
   ```bash
   # EAS will guide you through credential setup
   eas build --profile production --platform ios
   ```

2. **Upload to App Store:**
   ```bash
   # After build completes, submit to App Store
   eas submit --platform ios
   ```

3. **Or download and submit manually:**
   - Download the `.ipa` file from EAS dashboard
   - Upload via App Store Connect or Transporter app

### Android Production Build

**Requirements:**

- Google Play Developer Account ($25 one-time fee)

**Steps:**

1. **Build AAB (Android App Bundle):**
   ```bash
   eas build --profile production --platform android
   ```

2. **Upload to Google Play:**
   ```bash
   # After build completes, submit to Play Store
   eas submit --platform android
   ```

3. **Or download and submit manually:**
   - Download the `.aab` file from EAS dashboard
   - Upload via Google Play Console

## Build Profiles Explained

Your `eas.json` has three profiles:

- **development**: For development/testing with development client
- **preview**: For internal testing (TestFlight/internal distribution)
- **production**: For App Store/Play Store releases

## Common Build Commands

```bash
# Build for both platforms (production)
eas build --profile production --platform all

# Build for specific platform
eas build --profile production --platform ios
eas build --profile production --platform android

# Check build status
eas build:list

# View build details
eas build:view [BUILD_ID]

# Cancel a build
eas build:cancel [BUILD_ID]
```

## Local Development

### Run on Simulator/Emulator

```bash
# Start development server
npm start

# Then press:
# - 'i' for iOS simulator
# - 'a' for Android emulator
# - 'w' for web
```

### Run on Physical Device

```bash
# iOS
npm run ios

# Android
npm run android
```

## Important Notes

### iOS Specific:

- **Bundle Identifier**: `com.fresamobile.app` (configured in app.json)
- **Microphone Permission**: Already configured in app.json
- **Apple Developer Account**: Required for production builds

### Android Specific:

- **Package Name**: `com.fresamobile.app` (configured in app.json)
- **Permissions**: Already configured (storage, media, audio)
- **Google Play Account**: Required for production builds

## Troubleshooting

### Build Fails

1. Check build logs: `eas build:view [BUILD_ID]`
2. Verify credentials: `eas credentials`
3. Check app.json configuration
4. Ensure all dependencies are compatible

### Credential Issues

```bash
# View current credentials
eas credentials

# Reset credentials if needed
eas credentials --platform ios
eas credentials --platform android
```

### Dependency Conflicts (React 19)

If you encounter peer dependency conflicts during build (e.g., `react-redux` with React 19):

- The project includes an `.npmrc` file with `legacy-peer-deps=true` to handle these conflicts
- React 19 is backward compatible, so these warnings are safe to ignore
- If issues persist, ensure `.npmrc` is committed to your repository

### Environment Variables

If you need environment variables:

```bash
# Set in EAS dashboard or use:
eas secret:create --scope project --name API_KEY --value your_value
```

## Next Steps After Building

1. **Test thoroughly** on physical devices
2. **Submit to stores** using `eas submit` or manually
3. **Monitor builds** in EAS dashboard: https://expo.dev
4. **Update version** in `app.json` before each new release

## Useful Links

- EAS Dashboard: https://expo.dev
- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Expo Docs: https://docs.expo.dev/

## Quick Reference

```bash
# Complete production build and submit workflow:

# 1. Build iOS
eas build --profile production --platform ios

# 2. Build Android
eas build --profile production --platform android

# 3. Submit iOS (after build completes)
eas submit --platform ios

# 4. Submit Android (after build completes)
eas submit --platform android
```

---

**Note**: First-time builds may take 15-30 minutes. Subsequent builds are usually faster due to caching.

