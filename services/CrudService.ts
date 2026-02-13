/**
 * Generic CRUD Service for API operations
 * Handles common CRUD operations with loading states and error notifications
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_CONFIG, STORAGE_KEYS} from '../config/api';

export default class CrudService<T> {
    private setLoading: (loading: boolean) => void;
    private notify: (message: string, type: 'success' | 'error') => void;
    private baseURL: string;

    constructor(
        setLoading: (loading: boolean) => void,
        notify: (message: string, type: 'success' | 'error') => void,
        baseURL?: string
    ) {
        this.setLoading = setLoading;
        this.notify = notify;
        this.baseURL = baseURL || API_CONFIG.CORE_API_URL;
    }

    private async getHeaders(): Promise<HeadersInit> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        try {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TOKEN);
            const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            if (authToken) {
                headers['X-Auth-Token'] = authToken;
            }
        } catch (error) {
            console.error('Error getting auth headers:', error);
        }

        return headers;
    }

    private async request<TResponse>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<TResponse> {
        try {
            this.setLoading(true);
            const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

            const headers = await this.getHeaders();

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers,
                },
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return {} as TResponse;
            }

            const data = await response.json();

            if (!response.ok) {
                const errorMessage =
                    data.message || data.error || `HTTP error! status: ${response.status}`;
                const errorDetails = data.errors || [];
                throw new Error(
                    errorDetails.length > 0
                        ? `${errorMessage}: ${errorDetails.join(', ')}`
                        : errorMessage
                );
            }

            // Backend returns { message, data } format
            if (data.data !== undefined) {
                return data.data as TResponse;
            }

            return data as TResponse;
        } catch (error: any) {
            const errorMessage = error.message || 'An error occurred';
            this.notify(errorMessage, 'error');
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * GET request - Fetch data
     */
    async get(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'GET',
        });
    }

    /**
     * GET request - Fetch all items
     */
    async getAll(endpoint: string): Promise<T[]> {
        return this.request<T[]>(endpoint, {
            method: 'GET',
        });
    }

    /**
     * POST request - Create new item
     */
    async create(endpoint: string, data: Partial<T>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT request - Update existing item
     */
    async update(endpoint: string, data: Partial<T>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * PATCH request - Partially update item
     */
    async patch(endpoint: string, data: Partial<T>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE request - Delete item
     */
    async delete(endpoint: string): Promise<void> {
        return this.request<void>(endpoint, {
            method: 'DELETE',
        });
    }
}

