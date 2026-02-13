import React, {createContext, useContext, useState, ReactNode} from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';

interface LoaderContextType {
    showLoader: () => void;
    hideLoader: () => void;
    setLoading: (loading: boolean) => void;
    isLoading: boolean;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export const useLoader = () => {
    const context = useContext(LoaderContext);
    if (!context) {
        throw new Error('useLoader must be used within a LoaderProvider');
    }
    return context;
};

interface LoaderProviderProps {
    children: ReactNode;
}

export const LoaderProvider: React.FC<LoaderProviderProps> = ({children}) => {
    const [isLoading, setIsLoading] = useState(false);

    const showLoader = () => setIsLoading(true);
    const hideLoader = () => setIsLoading(false);
    const setLoading = (loading: boolean) => setIsLoading(loading);

    return (
        <LoaderContext.Provider value={{showLoader, hideLoader, setLoading, isLoading}}>
            {children}
            {isLoading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#6200ee"/>
                </View>
            )}
        </LoaderContext.Provider>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
});

