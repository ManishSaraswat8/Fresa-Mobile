/**
 * WebSocket Service
 * Handles WebSocket connections for real-time updates
 */

import {API_CONFIG} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '../config/api';

class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private listeners: Map<string, ((data: any) => void)[]> = new Map();
    private isConnecting = false;

    /**
     * Connect to WebSocket server
     */
    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            console.log('🔌 [WebSocket] Already connected or connecting');
            return;
        }

        try {
            this.isConnecting = true;
            // Get user ID from stored user data
            const userDataStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            let userId = '';
            if (userDataStr) {
                try {
                    const userData = JSON.parse(userDataStr);
                    userId = userData.id || userData._id || '';
                } catch (e) {
                    console.warn('Failed to parse user data for WebSocket:', e);
                }
            }
            const wsUrl = API_CONFIG.WEBSOCKET_URL || `ws://localhost:3006`;
            const url = `${wsUrl}?userId=${userId}`;

            console.log('🔌 [WebSocket] Connecting to:', url);

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('✅ [WebSocket] Connected');
                this.reconnectAttempts = 0;
                this.isConnecting = false;
                this.emit('connected', {});
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 [WebSocket] Message received:', data);

                    if (data.type === 'task_update') {
                        this.emit('task_update', data);
                    } else if (data.type === 'master_week_update') {
                        this.emit('master_week_update', data);
                    } else {
                        this.emit('message', data);
                    }
                } catch (error) {
                    console.error('❌ [WebSocket] Error parsing message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ [WebSocket] Error:', error);
                this.isConnecting = false;
                this.emit('error', error);
            };

            this.ws.onclose = () => {
                console.log('🔌 [WebSocket] Disconnected');
                this.isConnecting = false;
                this.emit('disconnected', {});
                this.attemptReconnect();
            };
        } catch (error) {
            console.error('❌ [WebSocket] Connection error:', error);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    /**
     * Attempt to reconnect
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ [WebSocket] Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`🔄 [WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.listeners.clear();
    }

    /**
     * Subscribe to an event
     */
    on(event: string, callback: (data: any) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    /**
     * Unsubscribe from an event
     */
    off(event: string, callback?: (data: any) => void): void {
        if (!this.listeners.has(event)) return;

        if (callback) {
            const callbacks = this.listeners.get(event)!;
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        } else {
            this.listeners.delete(event);
        }
    }

    /**
     * Emit an event to listeners
     */
    private emit(event: string, data: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ [WebSocket] Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Send a message through WebSocket
     */
    send(data: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('⚠️ [WebSocket] Cannot send message, not connected');
        }
    }
}

// Export singleton instance
export const websocketService = new WebSocketService();
