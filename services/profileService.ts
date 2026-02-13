/**
 * Profile Service
 * Handles user profile operations
 */

import {Platform} from 'react-native';
import {API_CONFIG} from '../config/api';
import {fetchData} from './api';
import {getUserData} from './authService';

export interface ProfileData {
    name?: string;
    email?: string;
    phone?: string;
    username?: string;
    location?: string;
    date?: string;
    age?: number;
}

/**
 * Get current user profile (includes patient data if available)
 */
export async function getProfile(): Promise<any> {
    try {
        const userData = await getUserData();
        if (!userData || !userData._id) {
            throw new Error('User not found');
        }

        const profile = await fetchData<any>(
            `${API_CONFIG.CORE_API_URL}/user/${userData._id}`,
            {
                method: 'GET',
            }
        );

        // Patient date is now included in getUserById response from backend
        // No need to fetch separately

        return profile;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch profile');
    }
}

/**
 * Update user profile
 */
export async function updateProfile(profileData: ProfileData): Promise<any> {
    try {
        const userData = await getUserData();
        if (!userData || !userData._id) {
            throw new Error('User not found');
        }

        const updatedProfile = await fetchData<any>(
            `${API_CONFIG.CORE_API_URL}/user/${userData._id}`,
            {
                method: 'PUT',
                body: JSON.stringify(profileData),
            }
        );

        return updatedProfile;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to update profile');
    }
}

/**
 * Update user language preference
 */
export async function updateLanguage(language: string): Promise<any> {
    try {
        const userData = await getUserData();
        if (!userData || !userData._id) {
            throw new Error('User not found');
        }

        // Get existing meta or create new one
        const existingMeta = userData.meta || {};
        const updatedMeta = {
            ...existingMeta,
            language: language,
        };

        const updatedProfile = await fetchData<any>(
            `${API_CONFIG.CORE_API_URL}/user/${userData._id}`,
            {
                method: 'PUT',
                body: JSON.stringify({meta: updatedMeta}),
            }
        );

        return updatedProfile;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to update language');
    }
}

/**
 * Create delete account request
 */
export async function createDeleteRequest(): Promise<any> {
    try {
        const deleteRequest = await fetchData<any>(
            `${API_CONFIG.CORE_API_URL}/deleteRequest`,
            {
                method: 'POST',
                body: JSON.stringify({}),
            }
        );

        return deleteRequest;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to create delete request');
    }
}

/**
 * Change password/PIN
 * @param oldPassword - The current password/PIN
 * @param newPassword - The new password/PIN
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
        const userData = await getUserData();
        if (!userData || !userData._id) {
            throw new Error('User not found');
        }

        await fetchData(
            `${API_CONFIG.CORE_API_URL}/user/${userData._id}/change-password`,
            {
                method: 'PUT', // Backend uses PUT method
                body: JSON.stringify({oldPassword, newPassword}),
            }
        );
    } catch (error: any) {
        throw new Error(error.message || 'Failed to change password');
    }
}

/**
 * Get user details by phone number (for onboarding)
 * This is a public endpoint that doesn't require authentication
 */
export async function getUserByPhone(phoneNumber: string): Promise<{
    name: string;
    email: string;
    date: string | null
}> {
    try {
        const response = await fetch(
            `${API_CONFIG.CORE_API_URL}/auth/get-user-by-phone?phone=${encodeURIComponent(phoneNumber)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch user details');
        }

        const data = await response.json();

        // Backend returns { message, data: { name, email, date } }
        if (data.data) {
            return {
                name: data.data.name || '',
                email: data.data.email || '',
                date: data.data.date || null,
            };
        }

        throw new Error('Invalid response format');
    } catch (error: any) {
        console.error('Error fetching user by phone:', error);
        throw new Error(error.message || 'Failed to fetch user details');
    }
}

/**
 * Update user profile by phone number (for onboarding)
 * This is a public endpoint that doesn't require authentication
 */
export async function updateProfileByPhone(phoneNumber: string, profileData: {
    name?: string;
    email?: string;
    date?: string
}): Promise<void> {
    try {
        const response = await fetch(
            `${API_CONFIG.CORE_API_URL}/auth/update-profile-by-phone`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: phoneNumber,
                    ...profileData,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile');
        }
    } catch (error: any) {
        console.error('Error updating profile by phone:', error);
        throw new Error(error.message || 'Failed to update profile');
    }
}

/**
 * Upload media file (image, document, etc.)
 * Returns the media object with _id and url
 * Uses XMLHttpRequest for better FormData support in React Native
 */
export async function uploadMedia(fileUri: string, fileName: string, mimeType: string): Promise<{
    _id: string;
    url: string
}> {
    return new Promise(async (resolve, reject) => {
        try {
            const userData = await getUserData();
            if (!userData || !userData._id) {
                reject(new Error('User not found'));
                return;
            }

            // Get auth headers
            const {STORAGE_KEYS} = await import('../config/api');
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            const token = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TOKEN);
            const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

            // Format file URI correctly for React Native
            // iOS needs file:// prefix, Android keeps it as is
            const fileUriFormatted = Platform.OS === 'ios'
                ? (fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`)
                : fileUri;

            // Create FormData - React Native format
            const formData = new FormData();

            // Append file - React Native FormData expects this specific format
            formData.append('file', {
                uri: fileUriFormatted,
                type: mimeType,
                name: fileName,
            } as any);

            formData.append('entity_type', 'profile');

            // Debug: Log what we're sending
            console.log('📤 Uploading media:', {
                uri: fileUriFormatted.substring(0, 50) + '...',
                fileName,
                mimeType,
                platform: Platform.OS,
                hasToken: !!token,
                hasAuthToken: !!authToken,
            });

            // Use XMLHttpRequest for better FormData support in React Native
            const xhr = new XMLHttpRequest();
            // Note: uploadMedia endpoint is in analytics service, not core service
            const url = `${API_CONFIG.ANALYTICS_API_URL}/media/upload`;

            xhr.open('POST', url, true);

            // Set auth headers BEFORE opening
            if (token) {
                xhr.setRequestHeader('x-token', token);
            }
            if (authToken) {
                xhr.setRequestHeader('x-auth-token', authToken);
            }

            // CRITICAL: Don't set Content-Type header manually
            // XMLHttpRequest will automatically set: Content-Type: multipart/form-data; boundary=...
            // If we set it manually, it won't include the boundary and the backend will reject it

            // Add upload progress tracking
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    console.log(`📤 Upload progress: ${percentComplete.toFixed(0)}%`);
                }
            };

            xhr.onload = () => {
                // Log response details for debugging
                const responseHeaders = xhr.getAllResponseHeaders();
                console.log('📥 Upload response:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    responseHeaders,
                    responseLength: xhr.responseText?.length || 0,
                });

                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            _id: response.data._id,
                            url: response.data.url,
                        });
                    } catch (parseError) {
                        console.error('❌ Error parsing response:', parseError);
                        console.error('Response text:', xhr.responseText);
                        reject(new Error('Failed to parse server response'));
                    }
                } else {
                    let errorMessage = 'Failed to upload media';
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        errorMessage = errorData.message || errorData.errors?.[0] || errorMessage;
                    } catch (parseError) {
                        errorMessage = `HTTP ${xhr.status}: ${xhr.statusText}`;
                    }
                    console.error('❌ Upload failed:', {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        response: xhr.responseText.substring(0, 500),
                        requestHeaders: xhr.getAllResponseHeaders(),
                    });
                    reject(new Error(errorMessage));
                }
            };

            xhr.onerror = (error) => {
                console.error('❌ Network error during upload:', error);
                reject(new Error('Network error during upload'));
            };

            xhr.ontimeout = () => {
                console.error('❌ Upload timeout');
                reject(new Error('Upload timeout'));
            };

            // Set timeout to 30 seconds
            xhr.timeout = 30000;

            // Send the FormData - XMLHttpRequest will handle Content-Type automatically
            xhr.send(formData as any);
        } catch (error: any) {
            console.error('Error setting up upload:', error);
            reject(new Error(error.message || 'Failed to upload media'));
        }
    });
}
