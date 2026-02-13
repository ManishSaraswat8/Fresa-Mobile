/**
 * Push Notification Service
 * Handles push notification registration and management
 */

import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import {API_CONFIG} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '../config/api';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
        shouldShowAlert: true as boolean,
        shouldPlaySound: true as boolean,
        shouldShowBanner: true as boolean,
        shouldShowList: true as boolean,
        shouldSetBadge: true,
    }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    try {
        const {status: existingStatus} = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const {status} = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Failed to get push notification permissions!');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return false;
    }
}

/**
 * Get Expo push token
 */
export async function getExpoPushToken(): Promise<string | null> {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '70e75a09-e301-4cf9-8707-fefd3424c741', // From app.json
        });

        return tokenData.data;
    } catch (error) {
        console.error('Error getting Expo push token:', error);
        return null;
    }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(): Promise<boolean> {
    try {
        const token = await getExpoPushToken();
        if (!token) {
            console.warn('No push token available');
            return false;
        }

        // Check if token is already registered
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
        if (storedToken === token) {
            console.log('Token already registered');
            return true;
        }

        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_CONFIG.ANALYTICS_API_URL}/notifications/register-device`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                device_token: token,
                device_type: Platform.OS,
            }),
        });

        if (!response.ok) {
            let errorMessage = 'Failed to register device token';
            try {
                const errorData = await response.json();
                console.error('❌ [NotificationService] Registration error response:', errorData);
                errorMessage = errorData.message || errorData.errors?.[0] || errorMessage;
            } catch (parseError) {
                console.error('❌ [NotificationService] Failed to parse error response:', parseError);
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        // Store token locally
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
        console.log('Device token registered successfully');
        return true;
    } catch (error) {
        console.error('Error registering device token:', error);
        return false;
    }
}

/**
 * Get auth headers for API calls
 */
async function getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TOKEN);
        const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

        if (token) {
            headers['x-token'] = token;
        }
        if (authToken) {
            headers['x-auth-token'] = authToken;
        }
    } catch (error) {
        console.error('Error getting auth headers:', error);
    }

    return headers;
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) {
    // Listener for notifications received while app is foregrounded
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        if (onNotificationReceived) {
            onNotificationReceived(notification);
        }
    });

    // Listener for when user taps on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification tapped:', response);
        if (onNotificationTapped) {
            onNotificationTapped(response);
        }
    });

    return () => {
        receivedListener.remove();
        responseListener.remove();
    };
}

/**
 * Clear notification badge
 */
export async function clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
}

/**
 * Handle notification navigation based on notification type and data
 * This function should be called when a notification is tapped
 */
export function handleNotificationNavigation(
    data: any,
    router: any
): void {
    if (!data || !router) {
        console.warn('Missing data or router for notification navigation');
        return;
    }

    const notificationType = data.type;
    const taskId = data.task_id || data.taskId;
    const notificationId = data.notificationId;

    console.log('Handling notification navigation:', {
        type: notificationType,
        taskId,
        notificationId,
        data,
    });

    try {
        switch (notificationType) {
            case 'task':
            case 'reminder':
                // Navigate to task details if task_id is available
                if (taskId) {
                    router.push(`/(tabs)/tasks/task-details?id=${taskId}`);
                    console.log('Navigating to task details:', taskId);
                } else {
                    // Fallback to tasks list
                    router.push('/(tabs)/tasks');
                    console.log('Navigating to tasks list (no task_id)');
                }
                break;

            case 'feedback':
            case 'daily_feedback':
            case 'area_of_life':
            case 'phq9':
                // Navigate to feedbacks screen
                router.push('/(tabs)/feedbacks');
                console.log('Navigating to feedbacks screen');
                break;

            case 'system':
            default:
                // Navigate to notifications screen for system notifications or unknown types
                router.push('/(tabs)/notifications');
                console.log('Navigating to notifications screen');
                break;
        }
    } catch (error) {
        console.error('Error navigating from notification:', error);
        // Fallback to notifications screen on error
        try {
            router.push('/(tabs)/notifications');
        } catch (fallbackError) {
            console.error('Error navigating to notifications screen:', fallbackError);
        }
    }
}
