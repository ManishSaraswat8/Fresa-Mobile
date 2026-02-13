import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Animated,
    Image,
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useRouter, useSegments} from 'expo-router';
import {useEffect, useRef} from 'react';

interface MenuItem {
    id: string;
    label: string;
    icon: string;
    isHighlighted?: boolean;
    route?: string;
    onPress?: () => void;
}

interface MenuSection {
    title: string;
    items: MenuItem[];
}

interface MenuProps {
    visible: boolean;
    onClose: () => void;
}

export const Menu = ({visible, onClose}: MenuProps) => {
    const router = useRouter();
    const segments = useSegments();
    const slideAnim = useRef(new Animated.Value(-300)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -300,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    // Helper function to get icon source
    const getIconSource = (iconName: string): any => {
        const iconMap: { [key: string]: any } = {
            'master-templates': require('@/assets/icons/menu/masterActive.png'),
            'master-week': require('@/assets/icons/menu/masterActive.png'), // Using same icon for now
            'configurations': require('@/assets/icons/menu/config.png'),
            'labels': require('@/assets/icons/menu/labels.png'),
            'depression-analysis': require('@/assets/icons/menu/depression.png'),
            'explainer-videos': require('@/assets/icons/menu/explainer.png'),
            'emergency-help': require('@/assets/icons/menu/emergency.png'),
            'faq': require('@/assets/icons/menu/faq.png'),
            'settings': require('@/assets/icons/menu/settings.png'),
        };
        return iconMap[iconName] || null;
    };

    // Helper function to check if a route is active
    const isRouteActive = (route: string): boolean => {
        if (!route) return false;
        // Build current path from segments
        const currentPath = '/' + segments.join('/');
        // Normalize route path
        const routePath = route.startsWith('/') ? route : `/${route}`;
        // Remove (tabs) prefix for comparison if present
        const normalizedCurrentPath = currentPath.replace('/(tabs)', '');
        const normalizedRoutePath = routePath.replace('/(tabs)', '');
        return normalizedCurrentPath === normalizedRoutePath || normalizedCurrentPath.startsWith(normalizedRoutePath + '/');
    };

    const menuSections: MenuSection[] = [
        {
            title: 'Tasks',
            items: [
                {
                    id: 'my-templates',
                    label: 'My Templates',
                    icon: 'master-templates',
                    isHighlighted: isRouteActive('tasks/my-templates') || isRouteActive('/(tabs)/tasks/my-templates'),
                    route: '/(tabs)/tasks/my-templates',
                },
                {
                    id: 'master-week',
                    label: 'Master Week',
                    icon: 'master-week',
                    isHighlighted: isRouteActive('tasks/master-week') || isRouteActive('/(tabs)/tasks/master-week') || isRouteActive('/(tabs)/tasks/create-master-week'),
                    route: '/(tabs)/tasks/master-week',
                },
                {
                    id: 'labels',
                    label: 'Labels (Areas of Life)',
                    icon: 'labels',
                    isHighlighted: isRouteActive('tasks/labels') || isRouteActive('/(tabs)/tasks/labels'),
                    route: '/(tabs)/tasks/labels',
                },
            ],
        },
        {
            title: 'Analysis',
            items: [
                {
                    id: 'depression-analysis',
                    label: 'Depression Analysis',
                    icon: 'depression-analysis',
                    isHighlighted: isRouteActive('analysis') || isRouteActive('/(tabs)/analysis'),
                    route: '/(tabs)/analysis',
                },
            ],
        },
        {
            title: 'Support',
            items: [
                {
                    id: 'explainer-videos',
                    label: 'Explainer Videos',
                    icon: 'explainer-videos',
                    route: 'explainer-videos',
                },
                {
                    id: 'emergency-help',
                    label: 'Emergency Help',
                    icon: 'emergency-help',
                    route: 'emergency-help',
                },
                {
                    id: 'faq',
                    label: 'Frequently Asked Questions',
                    icon: 'faq',
                    route: 'faq',
                },
            ],
        },
        {
            title: 'Profile',
            items: [
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: 'settings',
                    route: 'profile',
                },
            ],
        },
    ];

    const handleMenuItemPress = (item: MenuItem) => {
        if (item.onPress) {
            item.onPress();
        } else if (item.route) {
            router.push(item.route as any);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.sidebarContainer}>
                    <View style={styles.leftSidebar}/>
                    <Animated.View
                        style={[
                            styles.menuContainer,
                            {
                                transform: [{translateX: slideAnim}],
                            },
                        ]}
                    >
                        {/* Menu Header */}
                        <View style={styles.menuHeader}>
                            <Text style={styles.menuTitle}>Menu</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Feather name="x" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>

                        {/* Menu Content */}
                        <ScrollView
                            style={styles.menuContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {menuSections.map((section, sectionIndex) => (
                                <View key={sectionIndex} style={styles.section}>
                                    <Text style={styles.sectionTitle}>{section.title}</Text>
                                    {section.items.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.menuItem,
                                                item.isHighlighted && styles.menuItemHighlighted,
                                            ]}
                                            onPress={() => handleMenuItemPress(item)}
                                        >
                                            <View style={styles.menuItemContent}>
                                                {getIconSource(item.icon) ? (
                                                    <Image
                                                        source={getIconSource(item.icon)}
                                                        style={[
                                                            styles.menuIcon,
                                                            item.isHighlighted && styles.menuIconHighlighted,
                                                        ]}
                                                        resizeMode="contain"
                                                    />
                                                ) : (
                                                    <Feather
                                                        name="circle"
                                                        size={20}
                                                        color={item.isHighlighted ? '#fff' : '#8B4513'}
                                                    />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.menuItemText,
                                                        item.isHighlighted && styles.menuItemTextHighlighted,
                                                    ]}
                                                >
                                                    {item.label}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                        </ScrollView>
                    </Animated.View>
                    <View style={styles.rightSidebar}/>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    sidebarContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    leftSidebar: {
        width: 0,
        backgroundColor: '#6B7280',
    },
    rightSidebar: {
        flex: 1,
        backgroundColor: '#000',
    },
    menuContainer: {
        paddingTop: 30,
        width: '100%',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 0},
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    menuTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    closeButton: {
        padding: 4,
    },
    menuContent: {
        flex: 1,
    },
    section: {
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    menuItem: {
        borderRadius: 12,
        marginBottom: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuItemHighlighted: {
        backgroundColor: '#8B4513',
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuIcon: {
        width: 20,
        height: 20,
        tintColor: '#8B4513',
    },
    menuIconHighlighted: {
        tintColor: '#fff',
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
        flex: 1,
    },
    menuItemTextHighlighted: {
        color: '#fff',
    },
});

