/**
 * Authentication Service
 * Handles login, logout, and token management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_CONFIG, STORAGE_KEYS} from '../config/api';
import {fetchData} from './api';

export interface LoginCredentials {
    username: string; // Can be email, username, or phone number
    password: string; // PIN or password
}

export interface LoginResponse {
    message: string;
    data: {
        userData: any;
        token: string;
        auth_token: string;
    };
}

export interface UserData {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;

    [key: string]: any;
}

/**
 * Login with username/email/phone and password/PIN
 *
 * Note: Backend login handler checks:
 * - email field if username contains "@"
 * - username field otherwise
 *
 * For patients, phone number is stored in the "phone" field, not "username".
 * So we need to find the user by phone first to get their email/username.
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
        console.log('Attempting login with:', {
            username: credentials.username.substring(0, 5) + '...',
            apiUrl: API_CONFIG.CORE_API_URL
        });

        // Try login directly first
        const responseData = await fetchData<{
            userData: any;
            token: string;
            auth_token: string;
        }>(
            `${API_CONFIG.CORE_API_URL}/auth/login`,
            {
                method: 'POST',
                body: JSON.stringify({
                    username: credentials.username,
                    password: credentials.password,
                }),
            },
            false // Don't require auth for login
        );

        if (responseData && responseData.token && responseData.auth_token) {
            // Store tokens
            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, responseData.auth_token);
            await AsyncStorage.setItem(STORAGE_KEYS.LOGIN_TOKEN, responseData.token);
            await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(responseData.userData));

            console.log('Login successful');
            return {
                message: 'Login Successful',
                data: responseData,
            };
        }

        throw new Error('Login failed - no tokens received');
    } catch (error: any) {
        console.error('Login error:', error.message);

        // Provide helpful error message
        if (error.message.includes('Invalid username or password')) {
            throw new Error(
                'Invalid phone number or PIN. ' +
                'Please ensure:\n' +
                '1. Your phone number is registered\n' +
                '2. Your PIN is correct\n' +
                '3. Your account is active'
            );
        }

        throw new Error(error.message || 'Login failed. Please try again.');
    }
}

/**
 * Clear all app storage (tokens, onboarding, phone, PIN, walkthroughs, etc.).
 * Use this to treat the device as new – next app open will show onboarding.
 */
export async function clearAllAppStorage(): Promise<void> {
    try {
        await AsyncStorage.clear();
    } catch (error) {
        console.error('clearAllAppStorage error:', error);
        throw error;
    }
}

/**
 * Logout - notifies backend and clears all stored data (full reset, like new device).
 */
export async function logout(): Promise<void> {
    try {
        // Call logout endpoint if needed
        const token = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TOKEN);
        const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

        if (token && authToken) {
            try {
                // Backend expects Authorization header for logout
                await fetch(`${API_CONFIG.CORE_API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        'x-auth-token': authToken,
                    },
                });
            } catch (error) {
                // Continue with logout even if API call fails
                console.error('Logout API call failed:', error);
            }
        }

        // Clear all stored data
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.AUTH_TOKEN,
            STORAGE_KEYS.LOGIN_TOKEN,
            STORAGE_KEYS.USER_DATA,
            STORAGE_KEYS.PIN,
            STORAGE_KEYS.ONBOARDING_COMPLETE,
        ]);
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TOKEN);
        const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        return !!(token && authToken);
    } catch (error) {
        return false;
    }
}

/**
 * Get stored user data
 */
export async function getUserData(): Promise<UserData | null> {
    try {
        const userDataStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (userDataStr) {
            return JSON.parse(userDataStr);
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

/**
 * Get stored tokens
 */
export async function getTokens(): Promise<{ token: string | null; auth_token: string | null }> {
    try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TOKEN);
        const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        return {
            token,
            auth_token: authToken,
        };
    } catch (error) {
        return {token: null, auth_token: null};
    }
}

/**
 * Check if phone number is registered in the backend
 * This is a public endpoint that doesn't require authentication
 * Returns object with exists status and mobile_app_signed_up status
 */
export async function checkPatientByPhone(phoneNumber: string): Promise<{
    exists: boolean;
    mobile_app_signed_up: boolean
}> {
    try {
        const response = await fetch(
            `${API_CONFIG.CORE_API_URL}/auth/check-phone?phone=${encodeURIComponent(phoneNumber)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.error('Phone check failed:', response.status);
            return {exists: false, mobile_app_signed_up: false};
        }

        const data = await response.json();

        // Backend returns { message, data: { exists: boolean, mobile_app_signed_up: boolean } }
        if (data.data && typeof data.data.exists === 'boolean') {
            return {
                exists: data.data.exists,
                mobile_app_signed_up: data.data.mobile_app_signed_up || false
            };
        }

        return {exists: false, mobile_app_signed_up: false};
    } catch (error: any) {
        console.error('Error checking phone number:', error);
        // On error, return false to be safe (don't allow unregistered numbers)
        return {exists: false, mobile_app_signed_up: false};
    }
}
