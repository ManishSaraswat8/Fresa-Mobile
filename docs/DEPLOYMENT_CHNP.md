# Fresa Health CHNP – Deploy as New App

This guide covers deploying **Fresa Health CHNP** as a **separate app** from the main Fresa Health app. It uses its own
bundle/package IDs and will appear as a distinct app on the App Store and Google Play.

## App Identity

| Property            | Value                        |
|---------------------|------------------------------|
| **App Name**        | Fresa Health CHNP            |
| **iOS Bundle ID**   | `com.fresahealth.mobilechnp` |
| **Android Package** | `com.fresahealth.mobilechnp` |
| **Slug**            | FresaMobileCHNP              |
| **URL Scheme**      | fresamobilechnp              |

## Prerequisites

1. **EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Expo account**
   ```bash
   eas login
   ```

3. **Store accounts**
    - Apple Developer (for iOS)
    - Google Play Console (for Android)

## First-time setup: new EAS project

From `FresaMobile`:

```bash
cd FresaMobile
eas init
```

- Select **Create a new project**
- Project name: e.g. **Fresa Health CHNP** or **FresaMobileCHNP**
- This links the app to a new EAS project and adds `projectId` to `app.json`

## Store setup

### Apple App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. **Apps** → **+** → **New App**
3. Fill in:
    - **Name**: Fresa Health CHNP
    - **Primary Language**: your language
    - **Bundle ID**: `com.fresahealth.mobilechnp` (create it under **Identifiers** first if needed)
    - **SKU**: e.g. `fresa-health-chnp`

### Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. **Create app** → **Create new app**
3. **App name**: Fresa Health CHNP
4. **Default language** and other required fields
5. Package name must be `com.fresahealth.mobilechnp`

## Build commands

### iOS – TestFlight

```bash
npm run build:ios:testflight
# or
eas build --profile testflight --platform ios
```

After the build finishes:

```bash
npm run submit:ios
# or
eas submit --platform ios
```

### Android – APK (testing)

```bash
npm run build:android:apk
```

### Android – Play Store (AAB)

```bash
npm run build:android:production
# or
eas build --profile production --platform android
```

### Both platforms

```bash
npm run build:all:production
```

## API configuration

API base URLs are in `FresaMobile/config/api.ts`. Current CHNP dev URLs:

- **CORE_API_URL**
- **TEMPLATES_API_URL**
- **ANALYTICS_API_URL**
- **WEBSOCKET_URL**

For production, either:

- Replace these with production URLs in `config/api.ts`, or
- Use env vars via `app.config.js` if you switch to that setup.

## Pre-deploy checklist

- [ ] `eas init` run and new project created
- [ ] App Store Connect app created for `com.fresahealth.mobilechnp`
- [ ] Google Play app created for `com.fresahealth.mobilechnp`
- [ ] Production API URLs set in `config/api.ts`
- [ ] Icons and splash in `./assets/` are correct
- [ ] App name is “Fresa Health CHNP” in `app.json`

## Version and build numbers

`testflight` and `production` have `autoIncrement: true`, so build numbers and version codes are incremented
automatically. You can also adjust versions manually in `app.json`:

```json
{
  "expo": {
    "version": "1.1.4",
    "ios": {
      "buildNumber": "1"
    },
    "android": {
      "versionCode": 1
    }
  }
}
```

## Quick deploy flow

```bash
cd FresaMobile

# 1. Ensure you're linked
eas init   # only needed once

# 2. Build
npm run build:ios:testflight      # iOS
npm run build:android:production  # Android (AAB for Play)

# 3. Submit after build completes
npm run submit:ios
npm run submit:android
```

## Troubleshooting

**“Project not configured”**

- Run `eas init` and create or link the EAS project.

**Bundle ID conflicts**

- Confirm `com.fresahealth.mobilechnp` is not used by another app and that it matches App Store Connect / Play Console.

**Credentials**

```bash
eas credentials --platform ios
eas credentials --platform android
```
