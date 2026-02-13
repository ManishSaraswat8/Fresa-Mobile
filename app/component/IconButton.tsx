import React from 'react';
import {TouchableOpacity, StyleSheet, ViewStyle, View} from 'react-native';

interface IconButtonProps {
    onPress: () => void;
    icon: React.ReactNode;
    variant?: 'default' | 'outlined';
    style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
                                                          onPress,
                                                          icon,
                                                          variant = 'default',
                                                          style,
                                                      }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.button,
                variant === 'outlined' && styles.outlined,
                style,
            ]}
        >
            <View>{icon}</View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    outlined: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
});

