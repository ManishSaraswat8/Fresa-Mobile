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
    CORE_API_URL: 'https://chnpfresadevruxopnmg-fresa-core-dev.functions.fnc.fr-par.scw.cloud',

    // Templates API - handles tasks, templates, journeys, etc.
    TEMPLATES_API_URL: 'https://chnpfresadevruxopnmg-fresa-templates-dev.functions.fnc.fr-par.scw.cloud',

    // Analytics API - handles dashboard, analytics, config, etc.
    ANALYTICS_API_URL: 'https://chnpfresadevruxopnmg-fresa-analytics-dev.functions.fnc.fr-par.scw.cloud',

    // WebSocket API - handles real-time updates
    WEBSOCKET_URL: 'ws://chnpfresadevruxopnmg-fresa-websocket-dev.functions.fnc.fr-par.scw.cloud',
};

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    LOGIN_TOKEN: 'login_token',
    USER_DATA: 'user_data',
    ONBOARDING_COMPLETE: 'hasCompletedOnboarding',
    PHONE_NUMBER: 'phone_number',
    CLINIC_ID: 'clinic_id',
    PIN: 'pin',
    PUSH_TOKEN: 'push_token',
};
