/**
 * API Service for making HTTP requests
 * This service provides reusable functions for API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_CONFIG, STORAGE_KEYS} from '../config/api';

export interface ApiResponse<T> {
    data: T;
    status: number;
    statusText: string;
}

export interface ApiError {
    message: string;
    status?: number;
}

/**
 * Get authentication headers
 * Backend expects: x-token (JWT) and x-auth-token (auth token)
 */
async function getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TOKEN);
        const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

        // Backend expects x-token (not Authorization header)
        if (token) {
            headers['x-token'] = token;
        }

        // Backend expects x-auth-token
        if (authToken) {
            headers['x-auth-token'] = authToken;
        }
    } catch (error) {
        console.error('Error getting auth headers:', error);
    }

    return headers;
}

/**
 * Generic fetch function for API calls
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, headers, body, etc.)
 * @param requireAuth - Whether to include auth headers (default: true)
 * @returns Promise with the response data
 */
export async function fetchData<T = any>(
    url: string,
    options: RequestInit = {},
    requireAuth: boolean = true
): Promise<T> {
    try {
        const headers = requireAuth
            ? {...(await getAuthHeaders()), ...options.headers}
            : {
                'Content-Type': 'application/json',
                ...options.headers,
            };

        // Add cache-busting for GET requests to ensure fresh data
        const finalUrl = options.method === 'GET' || !options.method
            ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
            : url;

        const response = await fetch(finalUrl, {
            ...options,
            headers: {
                ...headers,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return {} as T;
        }

        const data = await response.json();

        // Check for error response format from backend
        if (!response.ok) {
            console.error('API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                url,
                data,
            });

            const errorMessage =
                data.message || data.error || `HTTP error! status: ${response.status}`;
            const errorDetails = data.errors || [];

            // Handle wrapper errors
            if (errorMessage.includes('wrapper') || errorMessage.includes('Internal Server Error')) {
                const detailedError = errorDetails.length > 0
                    ? `${errorMessage}: ${errorDetails.join(', ')}`
                    : errorMessage;
                console.error('Detailed error:', detailedError);
                throw new Error(detailedError);
            }

            throw new Error(
                errorDetails.length > 0
                    ? `${errorMessage}: ${errorDetails.join(', ')}`
                    : errorMessage
            );
        }

        // Backend returns { message, data } format
        if (data.data !== undefined) {
            return data.data as T;
        }

        return data as T;
    } catch (error: any) {
        // Handle network errors
        if (error.message === 'Network request failed' || error.message.includes('Network request failed')) {
            console.error('Network error details:', {
                url,
                error: error.message,
                stack: error.stack,
            });
            throw new Error(
                'Network error. Please check:\n' +
                '1. Your internet connection\n' +
                '2. Backend server is running\n' +
                '3. Correct API URL in config/api.ts\n' +
                `4. URL being called: ${url}`
            );
        }
        throw new Error(error.message || 'Failed to fetch data');
    }
}

// Example API functions - replace with your actual API endpoints

/**
 * Get patient by ID
 */
export async function getPatient(patientId: string) {
    return fetchData(`${API_CONFIG.CORE_API_URL}/patient/${patientId}`);
}

/**
 * Get all patient tasks
 */
export async function getPatientTasks() {
    return fetchData(`${API_CONFIG.TEMPLATES_API_URL}/patientApp/task`);
}

/**
 * Get patient task by ID
 */
export async function getPatientTask(taskId: string) {
    return fetchData(`${API_CONFIG.TEMPLATES_API_URL}/patientApp/task/${taskId}`);
}

/**
 * Create a new patient task
 */
export async function createPatientTask(taskData: any) {
    return fetchData(`${API_CONFIG.TEMPLATES_API_URL}/patientApp/task`, {
        method: 'POST',
        body: JSON.stringify(taskData),
    });
}

/**
 * Update a patient task
 */
export async function updatePatientTask(taskId: string, taskData: any) {
    return fetchData(`${API_CONFIG.TEMPLATES_API_URL}/patientApp/task/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData),
    });
}

/**
 * Delete a patient task
 */
export async function deletePatientTask(taskId: string) {
    return fetchData(`${API_CONFIG.TEMPLATES_API_URL}/patientApp/task/${taskId}`, {
        method: 'DELETE',
    });
}

export interface ValidateTaskQRResponse {
    task_id: string;
    action: 'start' | 'complete';
    task_title: string;
}

/**
 * Validate a scanned task QR code
 * Returns task_id, action (start|complete), and task_title
 */
export async function validateTaskQRCode(qrData: string): Promise<ValidateTaskQRResponse> {
    return fetchData<ValidateTaskQRResponse>(
        `${API_CONFIG.TEMPLATES_API_URL}/qr-code/task/validate`,
        {
            method: 'POST',
            body: JSON.stringify({qr_data: qrData}),
        }
    );
}

/**
 * Get all task labels
 */
export async function getTaskLabels() {
    return fetchData(`${API_CONFIG.TEMPLATES_API_URL}/labels`);
}

/**
 * Submit patient feedback
 */
export async function submitFeedback(feedbackData: any) {
    return fetchData(`${API_CONFIG.TEMPLATES_API_URL}/feedback`, {
        method: 'POST',
        body: JSON.stringify(feedbackData),
    });
}

/**
 * Get Area of Life Feedback for current user
 */
export async function getAreaOfLifeFeedback(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `${API_CONFIG.ANALYTICS_API_URL}/patient-feedback/area-of-life${queryString ? `?${queryString}` : ''}`;

    return fetchData(url);
}

/**
 * Get Daily Feedback for current user
 */
export async function getDailyFeedback(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `${API_CONFIG.ANALYTICS_API_URL}/patient-feedback/daily${queryString ? `?${queryString}` : ''}`;

    return fetchData(url);
}

/**
 * Submit Daily Feedback
 */
export async function submitDailyFeedback(feedbackData: {
    rating?: number;
    text?: string;
    voice_note_media_id?: string;
}) {
    return fetchData(`${API_CONFIG.ANALYTICS_API_URL}/patient-feedback/daily/submit`, {
        method: 'POST',
        body: JSON.stringify(feedbackData),
    });
}

/**
 * Submit Area of Life Feedback
 */
export async function submitAreaOfLifeFeedback(feedbackData: {
    rating?: number;
    text?: string;
    voice_note_media_id?: string;
    task_statuses?: Array<{
        task_id: string;
        status: 'done' | 'not-done';
    }>;
}) {
    return fetchData(`${API_CONFIG.ANALYTICS_API_URL}/patient-feedback/area-of-life/submit`, {
        method: 'POST',
        body: JSON.stringify(feedbackData),
    });
}

/**
 * Get PHQ9 Feedback for current user
 */
export async function getPHQ9Feedback(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `${API_CONFIG.ANALYTICS_API_URL}/patient-feedback/phq9${queryString ? `?${queryString}` : ''}`;

    return fetchData(url);
}

/**
 * Submit PHQ9 Feedback
 */
export async function submitPHQ9Feedback(answers: number[]) {
    return fetchData(`${API_CONFIG.ANALYTICS_API_URL}/patient-feedback/phq9/submit`, {
        method: 'POST',
        body: JSON.stringify({answers}),
    });
}

/**
 * Get FAQs
 */
export async function getFAQs() {
    return fetchData(`${API_CONFIG.ANALYTICS_API_URL}/faqs`);
}

/**
 * Get explainer videos
 */
export async function getExplainerVideos() {
    return fetchData(`${API_CONFIG.ANALYTICS_API_URL}/explainer-videos`);
}

// Template API functions

export interface GoalTemplate {
    _id?: string;
    id?: string;
    title: string;
    description?: string;
    category?: string;
    label_id?: string;
    is_prebuilt?: boolean;
    created_by?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ChallengeTemplate {
    _id?: string;
    id?: string;
    title: string;
    description?: string;
    category?: string;
    goal_id?: string;
    challenge?: string;
    mitigation?: string;
    is_prebuilt?: boolean;
    created_by?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Get pre-built goal templates
 */
export async function getPrebuiltGoalTemplates(): Promise<GoalTemplate[]> {
    return fetchData<GoalTemplate[]>(`${API_CONFIG.TEMPLATES_API_URL}/goal-template/prebuilt`);
}

/**
 * Get pre-built challenge templates
 */
export async function getPrebuiltChallengeTemplates(): Promise<ChallengeTemplate[]> {
    return fetchData<ChallengeTemplate[]>(`${API_CONFIG.TEMPLATES_API_URL}/challenge-template/prebuilt`);
}

/**
 * Get user's own goal templates (non-prebuilt)
 */
export async function getUserGoalTemplates(): Promise<GoalTemplate[]> {
    return fetchData<GoalTemplate[]>(`${API_CONFIG.TEMPLATES_API_URL}/goal-template?is_prebuilt=false`);
}

/**
 * Get user's own challenge templates (non-prebuilt)
 */
export async function getUserChallengeTemplates(): Promise<ChallengeTemplate[]> {
    return fetchData<ChallengeTemplate[]>(`${API_CONFIG.TEMPLATES_API_URL}/challenge-template?is_prebuilt=false`);
}

/**
 * Create a goal template
 */
export async function createGoalTemplate(templateData: {
    title: string;
    description?: string;
    category?: string;
    label_id?: string;
    is_prebuilt?: boolean;
}): Promise<GoalTemplate> {
    return fetchData<GoalTemplate>(`${API_CONFIG.TEMPLATES_API_URL}/goal-template`, {
        method: 'POST',
        body: JSON.stringify(templateData),
    });
}

/**
 * Create a challenge template
 */
export async function createChallengeTemplate(templateData: {
    title: string;
    description?: string;
    category?: string;
    goal_id?: string;
    challenge?: string;
    mitigation?: string;
    is_prebuilt?: boolean;
}): Promise<ChallengeTemplate> {
    return fetchData<ChallengeTemplate>(`${API_CONFIG.TEMPLATES_API_URL}/challenge-template`, {
        method: 'POST',
        body: JSON.stringify(templateData),
    });
}

/**
 * Notification API functions
 */
export interface Notification {
    _id: string;
    id?: string;
    title: string;
    message: string;
    type: 'task' | 'reminder' | 'system' | 'feedback' | 'daily_feedback' | 'area_of_life' | 'phq9';
    is_read: boolean;
    read_at?: string;
    data?: any;
    created_at: string;
    updated_at: string;
}

export interface NotificationsResponse {
    notifications: Notification[];
    totalCount: number;
    unreadCount: number;
    limit: number;
    offset: number;
}

/**
 * Get notifications
 */
export async function getNotifications(
    limit?: number,
    offset?: number,
    unreadOnly?: boolean
): Promise<NotificationsResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (unreadOnly) params.append('unreadOnly', 'true');

    const queryString = params.toString();
    const url = `${API_CONFIG.ANALYTICS_API_URL}/notifications${queryString ? `?${queryString}` : ''}`;

    return fetchData<NotificationsResponse>(url);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
    return fetchData<Notification>(`${API_CONFIG.ANALYTICS_API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
    });
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<{ updatedCount: number }> {
    return fetchData<{ updatedCount: number }>(`${API_CONFIG.ANALYTICS_API_URL}/notifications/read-all`, {
        method: 'PUT',
    });
}
