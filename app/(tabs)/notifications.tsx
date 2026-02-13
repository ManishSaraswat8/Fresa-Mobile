import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useState, useEffect, useCallback} from 'react';
import {getNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification} from '@/services/api';
import moment from 'moment';

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = useCallback(async () => {
        try {
            const response = await getNotifications(50, 0, false);
            setNotifications(response.notifications || []);
            setUnreadCount(response.unreadCount || 0);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadNotifications();
    }, [loadNotifications]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'task':
                return 'check-circle';
            case 'reminder':
                return 'bell';
            case 'feedback':
            case 'daily_feedback':
            case 'area_of_life':
            case 'phq9':
                return 'message-circle';
            case 'system':
                return 'info';
            default:
                return 'bell';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'task':
                return '#10B981';
            case 'reminder':
                return '#F59E0B';
            case 'feedback':
            case 'daily_feedback':
            case 'area_of_life':
            case 'phq9':
                return '#3B82F6';
            case 'system':
                return '#6B7280';
            default:
                return '#6B7280';
        }
    };

    const formatTime = (dateString: string) => {
        const date = moment(dateString);
        const now = moment();
        const diffMinutes = now.diff(date, 'minutes');
        const diffHours = now.diff(date, 'hours');
        const diffDays = now.diff(date, 'days');

        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            return date.format('MMM D, YYYY');
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications((prev) =>
                prev.map((notif) =>
                    (notif._id === id || notif.id === id) ? {...notif, is_read: true} : notif
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications((prev) =>
                prev.map((notif) => ({...notif, is_read: true}))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    if (loading) {
        return (
            <AppWrapper headerTitle="Notifications" headerVariant="default">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F6B8A3"/>
                </View>
            </AppWrapper>
        );
    }

    return (
        <AppWrapper headerTitle="Notifications" headerVariant="default">
            <View style={styles.container}>
                {/* Header Actions */}
                {unreadCount > 0 && (
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.markAllButton}
                            onPress={handleMarkAllAsRead}
                        >
                            <Text style={styles.markAllButtonText}>Mark all as read</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <ScrollView
                    style={styles.notificationsList}
                    contentContainerStyle={styles.notificationsContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                    }
                >
                    {notifications.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Feather name="bell-off" size={48} color="#9CA3AF"/>
                            <Text style={styles.emptyStateText}>No notifications</Text>
                        </View>
                    ) : (
                        notifications.map((notification) => {
                            const notificationId = notification._id || notification.id || '';
                            return (
                                <TouchableOpacity
                                    key={notificationId}
                                    style={[
                                        styles.notificationCard,
                                        !notification.is_read && styles.notificationCardUnread,
                                    ]}
                                    onPress={() => markAsRead(notificationId)}
                                >
                                    <View
                                        style={[
                                            styles.iconContainer,
                                            {backgroundColor: getNotificationColor(notification.type) + '20'},
                                        ]}
                                    >
                                        <Feather
                                            name={getNotificationIcon(notification.type) as any}
                                            size={20}
                                            color={getNotificationColor(notification.type)}
                                        />
                                    </View>
                                    <View style={styles.notificationContent}>
                                        <View style={styles.notificationHeader}>
                                            <Text style={styles.notificationTitle}>
                                                {notification.title}
                                            </Text>
                                            {!notification.is_read && (
                                                <View style={styles.unreadDot}/>
                                            )}
                                        </View>
                                        <Text style={styles.notificationMessage}>
                                            {notification.message}
                                        </Text>
                                        <Text style={styles.notificationTime}>
                                            {formatTime(notification.created_at)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </View>
        </AppWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f4f2',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f4f2',
    },
    headerActions: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    markAllButton: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    markAllButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F6B8A3',
    },
    notificationsList: {
        flex: 1,
    },
    notificationsContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 40,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 16,
    },
    notificationCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    notificationCardUnread: {
        backgroundColor: '#F9FAFB',
        borderLeftWidth: 4,
        borderLeftColor: '#F6B8A3',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F6B8A3',
        marginLeft: 8,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
});

