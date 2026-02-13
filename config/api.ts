/**
 * API Configuration
 * Configure your backend API URLs here
 *
 * For localhost testing:
 * - iOS Simulator: Use 'http://localhost:3001'
 * - Android Emulator: Use 'http://10.0.2.2:3001'
 * - Physical Device: Use your computer's local IP (e.g., 'http://192.168.1.100:3001')
 *
 * To find your local IP:
 * - Mac/Linux: Run 'ifconfig' or 'ipconfig getifaddr en0'
 * - Windows: Run 'ipconfig' and look for IPv4 Address
 */

export const API_CONFIG = {
    // Core API - handles auth, users, patients, clinics, etc.
    CORE_API_URL: 'https://api-core.fresahealth.com',

    // Templates API - handles tasks, templates, journeys, etc.
    TEMPLATES_API_URL: 'https://api-templates.fresahealth.com',

    // Analytics API - handles dashboard, analytics, config, etc.
    ANALYTICS_API_URL: 'https://api-analytics.fresahealth.com',

    // WebSocket API - handles real-time updates
    WEBSOCKET_URL: 'wss://api-websocket.fresahealth.com',
};

// export const API_CONFIG = {
//   // Core API - handles auth, users, patients, clinics, etc.
//   CORE_API_URL: 'http://192.168.1.5:3001',

//   // Templates API - handles tasks, templates, journeys, etc.
//   TEMPLATES_API_URL: 'http://192.168.1.5:3002',

//   // Analytics API - handles dashboard, analytics, config, etc.
//   ANALYTICS_API_URL: 'http://192.168.1.5:3000',

//   // WebSocket API - handles real-time updates
//   WEBSOCKET_URL:'ws://192.168.1.5:3006',
// };

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    LOGIN_TOKEN: 'login_token',
    USER_DATA: 'user_data',
    ONBOARDING_COMPLETE: 'hasCompletedOnboarding',
    PHONE_NUMBER: 'phone_number',
    PIN: 'pin',
    PUSH_TOKEN: 'push_token',
};
