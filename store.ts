import {configureStore} from '@reduxjs/toolkit';
import {TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';
import userReducer from './slices/userSlice';

// Define the root state type
export type RootState = {
    user: ReturnType<typeof userReducer>;
};

// Define PreloadedState type
export type PreloadedState = Partial<RootState>;

// Create a function to initialize the store
export function initialiseStore(preloadedState?: PreloadedState) {
    const store = configureStore({
        reducer: {
            user: userReducer,
        },
    });

    // If preloadedState is provided, we can merge it
    // Note: configureStore doesn't directly support preloadedState in the same way
    // This is a simplified version - you may need to adjust based on your needs
    return store;
}

// Export types for the store
export type AppStore = ReturnType<typeof initialiseStore>;
export type AppDispatch = AppStore['dispatch'];

// Typed hooks for use in components
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

