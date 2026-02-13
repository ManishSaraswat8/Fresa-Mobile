import React from 'react';
import {
    ImageBackground,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    ViewStyle,
    RefreshControl,
} from 'react-native';
import {Header} from '@/app/component/Header';
import {globalStyles} from '../globalStyles';

interface AppWrapperProps {
    style?: ViewStyle;
    headerTitle?: string;
    isAuthPage?: boolean;
    children: React.ReactNode;
    headerVariant?: 'default' | 'home';
    contentContainerStyle?: ViewStyle;
    hideBadge?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
}

export const AppWrapper = ({
                               children,
                               style,
                               headerVariant = 'default',
                               headerTitle,
                               isAuthPage,
                               contentContainerStyle = {
                                   paddingBottom: 130,
                               },
                               hideBadge = false,
                               refreshing = false,
                               onRefresh,
                           }: AppWrapperProps) => {
    return (
        <ScrollView
            style={[styles.container, style]}
            contentContainerStyle={contentContainerStyle}
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#F6B8A3']}
                        tintColor="#F6B8A3"
                    />
                ) : undefined
            }
        >
            {!isAuthPage ? (
                <>
                    <Header variant={headerVariant} title={headerTitle} hideBadge={hideBadge}/>
                    {children}
                </>
            ) : (
                <SafeAreaView style={globalStyles.safeArea}>{children}</SafeAreaView>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 10,
        backgroundColor: '#f9f4f2',
    },
});

