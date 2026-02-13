import {Image, ImageSourcePropType, StyleSheet, View} from 'react-native';
import {useLinkBuilder} from '@react-navigation/native';
import {PlatformPressable} from '@react-navigation/elements';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';

interface IconInterface {
    uri: ImageSourcePropType;
    width: number;
    height: number;
}

export default function BottomNav({
                                      state,
                                      descriptors,
                                      navigation,
                                  }: BottomTabBarProps) {
    const {buildHref} = useLinkBuilder();

    const getIcon = (routeName: string, isRouteActive: boolean): IconInterface => {
        switch (routeName) {
            case 'index':
                return {
                    uri: isRouteActive
                        ? require('@/assets/icons/homeActive.png')
                        : require('@/assets/icons/home.png'),
                    width: 24,
                    height: 24,
                };
            case 'tasks':
                return {
                    uri: isRouteActive
                        ? require('@/assets/icons/tasksActive.png')
                        : require('@/assets/icons/tasks.png'),
                    width: 24,
                    height: 24,
                };
            case 'feedbacks':
                return {
                    uri: isRouteActive
                        ? require('@/assets/icons/feedbackActive.png')
                        : require('@/assets/icons/feedback.png'),
                    width: 24,
                    height: 24,
                };
            case 'analysis':
                return {
                    uri: isRouteActive
                        ? require('@/assets/icons/analysisActive.png')
                        : require('@/assets/icons/analysis.png'),
                    width: 24,
                    height: 24,
                };
            default:
                return {
                    uri: isRouteActive
                        ? require('@/assets/icons/homeActive.png')
                        : require('@/assets/icon.png'),
                    width: 24,
                    height: 24,
                };
        }
    };

    // Filter to only show the 4 main tabs
    const mainTabs = ['index', 'tasks', 'feedbacks', 'analysis'];
    const filteredRoutes = state.routes.filter((route) =>
        mainTabs.includes(route.name)
    );

    return (
        <View style={styles.container}>
            {filteredRoutes.map((route, index) => {
                const {options} = descriptors[route.key];
                const originalIndex = state.routes.findIndex((r) => r.key === route.key);
                const isFocused = state.index === originalIndex;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                const activeRouteName = state.routes[state.index]?.name;
                // Only highlight if the route name exactly matches (not nested routes)
                const isRouteActive = route.name === activeRouteName;
                const icon = getIcon(route.name, isRouteActive);

                return (
                    <PlatformPressable
                        key={route.key}
                        onPress={onPress}
                        style={styles.tab}
                        onLongPress={onLongPress}
                        testID={options.tabBarButtonTestID}
                        href={buildHref(route.name, route.params)}
                        accessibilityState={isRouteActive ? {selected: true} : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                    >
                        <Image
                            source={icon.uri ?? ''}
                            style={{width: icon.width, height: icon.height}}
                        />
                    </PlatformPressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        left: 16,
        right: 16,
        bottom: 34,
        borderRadius: 16,
        flexDirection: 'row',
        position: 'absolute',
        paddingHorizontal: 4,
        backgroundColor: '#F6B8A3',
    },
    tab: {
        gap: 8,
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        flexDirection: 'column',
        justifyContent: 'center',
    },
});

