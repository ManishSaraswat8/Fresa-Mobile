import {Image, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useEffect, useState, useCallback} from 'react';
import {IconButton} from '@/app/component/IconButton';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import {globalStyles} from '../globalStyles';
import {useMenu} from '@/providers/MenuProvider';
import {useSelector} from 'react-redux';
import {getProfile} from '@/services/profileService';
import {getNotifications} from '@/services/api';

interface HeaderProps {
    title?: string;
    variant?: 'default' | 'home';
    hideBadge?: boolean;
}

export const Header = ({variant, title, hideBadge = false}: HeaderProps) => {
    const router = useRouter();
    const {openMenu} = useMenu();
    const currentUser = useSelector((state: any) => state.user.currentUser);
    const [userName, setUserName] = useState<string>('');
    const [unreadCount, setUnreadCount] = useState<number>(0);

    useEffect(() => {
        loadUserInfo();
    }, [currentUser]);

    // Load unread notification count
    const loadUnreadCount = useCallback(async () => {
        try {
            const response = await getNotifications(1, 0, false); // Just get count, don't need notifications
            setUnreadCount(response.unreadCount || 0);
        } catch (error: any) {
            // Handle timeout and network errors gracefully - these are expected in some scenarios
            const errorMessage = error?.message || '';
            const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('timed out');
            const isNetworkError = errorMessage.includes('Network') || errorMessage.includes('Failed to fetch');

            if (isTimeout || isNetworkError) {
                // Silently handle timeouts and network errors - don't log as errors
                // The badge will just show 0 until the connection is restored
                setUnreadCount(0);
                return;
            }

            // Only log unexpected errors
            console.warn('Error loading unread notification count:', errorMessage);
            setUnreadCount(0);
        }
    }, []);

    // Load unread count on mount and when screen comes into focus
    useEffect(() => {
        loadUnreadCount();
    }, [loadUnreadCount]);

    useFocusEffect(
        useCallback(() => {
            loadUnreadCount();
        }, [loadUnreadCount])
    );

    const loadUserInfo = async () => {
        try {
            // Try to get fresh profile data
            const profile = await getProfile();
            if (profile?.name) {
                setUserName(profile.name);
            } else if (currentUser?.name) {
                setUserName(currentUser.name);
            }
        } catch (error) {
            console.error('Error loading user info in header:', error);
            // Fallback to Redux user data
            if (currentUser?.name) {
                setUserName(currentUser.name);
            }
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return 'Good Morning 👋';
        } else if (hour >= 12 && hour < 17) {
            return 'Good Afternoon 👋';
        } else {
            return 'Good Evening 👋';
        }
    };

    const getFormattedDate = () => {
        const date = new Date();
        const day = date.getDate();
        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    return (
        <SafeAreaView style={globalStyles.safeArea} edges={['top']}>
            <View style={styles.container}>
                {variant === 'home' ? (
                    <View style={styles.contentWrapper}>
                        <Text style={styles.title}>{getGreeting()}</Text>
                        <Text style={styles.subtitle}>
                            {userName || currentUser?.name || 'User'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.contentWrapper}>
                        <Text style={styles.pageTitle}>{title}</Text>
                        <Text style={styles.date}>{getFormattedDate()}</Text>
                    </View>
                )}
                <View style={styles.bellContainer}>
                    <IconButton
                        onPress={() => router.push('/(tabs)/notifications')}
                        icon={<Feather name="bell" size={18}/>}
                    />
                    {!hideBadge && unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {unreadCount > 99 ? '99+' : unreadCount.toString()}
                            </Text>
                        </View>
                    )}
                </View>
                <IconButton
                    onPress={openMenu}
                    icon={<Feather name="menu" size={18}/>}
                />
            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 50,
    },
    contentWrapper: {
        gap: 2,
        flex: 1,
    },
    title: {
        fontSize: 17,
        color: '#1A1D1F',
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 13,
        color: '#505050',
    },
    pageTitle: {
        fontSize: 24,
        color: '#1A1D1F',
        fontWeight: 'bold',
    },
    date: {
        fontSize: 13,
        color: '#505050',
    },
    bellContainer: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

