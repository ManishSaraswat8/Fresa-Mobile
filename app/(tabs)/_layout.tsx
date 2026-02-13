import {Tabs, useRouter, useRootNavigationState} from 'expo-router';
import BottomNav from '@/app/component/BottomNav';
import {useEffect} from 'react';
import {useSelector} from 'react-redux';
import {View, ActivityIndicator, StyleSheet} from 'react-native';

export default function TabsLayout() {
    const router = useRouter();
    const navigationState = useRootNavigationState();
    const isAuthenticated = useSelector((state: any) => state.user.isAuthenticated);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (navigationState?.key && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, navigationState?.key]);

    // Show loading while checking authentication
    if (!navigationState?.key || !isAuthenticated) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#F6B8A3"/>
            </View>
        );
    }

    return (
        <Tabs
            tabBar={(props) => <BottomNav {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen name="index" options={{title: 'Home'}}/>
            <Tabs.Screen name="tasks" options={{title: 'Tasks'}}/>
            <Tabs.Screen
                name="tasks/create-task"
                options={{
                    title: 'Create Task',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="tasks/my-templates"
                options={{
                    title: 'My Templates',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="tasks/create-template"
                options={{
                    title: 'Create Template',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="tasks/task-details"
                options={{
                    title: 'Task Details',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Notifications',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="tasks/labels"
                options={{
                    title: 'Labels',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="tasks/master-week"
                options={{
                    title: 'Master Week',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="tasks/create-master-week"
                options={{
                    title: 'Create Master Week',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="tasks/master-week-details"
                options={{
                    title: 'Master Week Details',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen name="feedbacks" options={{title: 'Feedbacks'}}/>
            <Tabs.Screen
                name="feedbacks/area-of-life"
                options={{
                    title: 'Area of Life Feedback',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="feedbacks/daily"
                options={{
                    title: 'Daily Feedback',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="feedbacks/phq9"
                options={{
                    title: 'PHQ9',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen name="analysis" options={{title: 'Analysis'}}/>
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="faq"
                options={{
                    title: "FAQ's",
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="explainer-videos"
                options={{
                    title: 'Explainer Videos',
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="emergency-help"
                options={{
                    title: 'Emergency Help',
                    href: null, // Hide from tab bar
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f4f2',
    },
});
