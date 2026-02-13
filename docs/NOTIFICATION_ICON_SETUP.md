# Notification Icon Setup Guide

## Issue

Notifications are showing the Expo icon instead of the Fresa icon.

## Solution

### For iOS

iOS uses the app icon directly for notifications. Make sure `./assets/icon.png` contains your Fresa logo (1024x1024px).

### For Android

Android notification icons have specific requirements:

- **Must be white/transparent** (monochrome)
- **Recommended size**: 96x96px (mdpi), 144x144px (hdpi), 192x192px (xhdpi), 288x288px (xxhdpi), 384x384px (xxxhdpi)
- **Format**: PNG with transparency
- **Design**: Simple, recognizable shape (Android will tint it)

## Steps to Fix

### Option 1: Create a White/Transparent Version of Your Logo

1. **Create a notification icon** (`notification-icon.png`):
    - Take your Fresa logo
    - Convert it to white/transparent (remove colors, make it white)
    - Ensure it's recognizable as a simple icon
    - Save as PNG with transparency
    - Recommended size: 192x192px (xhdpi)

2. **Place the file** in `FresaMobile/assets/notification-icon.png`

3. **Update app.json** to use the notification icon:
   ```json
   "android": {
     "notification": {
       "icon": "./assets/notification-icon.png",
       "color": "#F6B8A3"
     }
   }
   ```

### Option 2: Use Your Existing Icon (If it's already Fresa logo)

If `icon.png` already contains your Fresa logo:

1. **Verify** `./assets/icon.png` is your Fresa logo (not Expo logo)
2. **Rebuild the app** - Icon changes require a new build:
   ```bash
   eas build --profile preview --platform android
   eas build --profile preview --platform ios
   ```

### Option 3: Use Favicon (Quick Test)

If you want to test quickly with `favicon.png`:

1. **Update app.json**:
   ```json
   "android": {
     "notification": {
       "icon": "./assets/favicon.png",
       "color": "#F6B8A3"
     }
   }
   ```

2. **Rebuild the app**

## Important Notes

1. **Icon changes require rebuilding** - Icons are embedded during build time, not runtime
2. **Android notification icons must be monochrome** - Full-color icons won't display correctly
3. **Test on device** - Notification icons may look different in the system UI

## Current Configuration

Your `app.json` currently has:

- iOS notification icon: `./assets/icon.png` ✅
- Android notification icon: `./assets/icon.png` ⚠️ (may need white/transparent version)
- expo-notifications plugin icon: `./assets/icon.png` ✅

## Verification

After updating and rebuilding:

1. Send a test notification
2. Check the notification icon in the system notification tray
3. Verify it shows your Fresa logo (or white version of it)

## Troubleshooting

If the icon still shows Expo logo:

1. Verify `icon.png` actually contains Fresa logo (open the file)
2. Clear build cache: `eas build --clear-cache`
3. Rebuild the app
4. Uninstall old app version before installing new build
