import {Stack, useRouter} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StyleSheet, View} from 'react-native';
import {LoaderProvider} from '@/providers/LoaderProvider';
import {CrudProvider} from '@/providers/CrudProvider';
import {MenuProvider} from '@/providers/MenuProvider';
import {initialiseStore, PreloadedState} from '@/store';
import {Provider} from 'react-redux';
import Toast from 'react-native-toast-message';
import {useEffect} from 'react';
import {
    registerDeviceToken,
    setupNotificationListeners,
    handleNotificationNavigation
} from '@/services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '@/config/api';
import * as Notifications from 'expo-notifications';

interface RootLayoutProps {
    initialState?: PreloadedState;
}

// Inner component that can use hooks
function RootLayoutContent({initialState}: RootLayoutProps) {
    const router = useRouter();

    useEffect(() => {
        // Initialize push notifications
        const initNotifications = async () => {
            try {
                // Check if user is logged in
                const token = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TOKEN);
                if (token) {
                    // Register device token
                    await registerDeviceToken();

                    // Check if app was opened from a notification (when app was closed)
                    const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
                    if (lastNotificationResponse) {
                        console.log('App opened from notification:', lastNotificationResponse);
                        const data = lastNotificationResponse.notification.request.content.data;

                        // Small delay to ensure navigation is ready
                        setTimeout(() => {
                            if (data) {
                                handleNotificationNavigation(data, router);
                            } else {
                                router.push('/(tabs)/notifications');
                            }
                        }, 1000);
                    }

                    // Setup notification listeners for future notifications
                    const removeListeners = setupNotificationListeners(
                        (notification) => {
                            // Handle notification received while app is in foreground
                            console.log('Notification received:', notification);
                        },
                        (response) => {
                            // Handle notification tap when app is open
                            console.log('Notification tapped:', response);
                            const data = response.notification.request.content.data;

                            // Navigate to the appropriate screen based on notification type and data
                            if (data) {
                                handleNotificationNavigation(data, router);
                            } else {
                                // Fallback to notifications screen if no data
                                router.push('/(tabs)/notifications');
                            }
                        }
                    );

                    return () => {
                        removeListeners();
                    };
                }
            } catch (error) {
                console.error('Error initializing notifications:', error);
            }
        };

        initNotifications();
    }, [router]);

    return (
        <View style={styles.container}>
            <Stack screenOptions={{headerShown: false}}>
                <Stack.Screen name="onboarding" options={{headerShown: false}}/>
                <Stack.Screen name="login"/>
                <Stack.Screen name="(tabs)"/>
                <Stack.Screen name="+not-found"/>
            </Stack>
        </View>
    );
}

export default function RootLayout({initialState}: RootLayoutProps) {
    const store = initialiseStore(initialState);

    return (
        <SafeAreaProvider>
            <Provider store={store}>
                <LoaderProvider>
                    <CrudProvider>
                        <MenuProvider>
                            <RootLayoutContent initialState={initialState}/>
                        </MenuProvider>
                    </CrudProvider>
                </LoaderProvider>
            </Provider>
            <Toast/>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C4269',
    },
});

