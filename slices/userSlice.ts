import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface User {
    id?: string;
    name?: string;
    email?: string;
    token?: string;
    auth_token?: string;
}

interface UserState {
    currentUser: User | null;
    isAuthenticated: boolean;
    hasCompletedOnboarding: boolean;
}

const initialState: UserState = {
    currentUser: null,
    isAuthenticated: false,
    hasCompletedOnboarding: false,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User>) => {
            state.currentUser = action.payload;
            state.isAuthenticated = true;
        },
        clearUser: (state) => {
            state.currentUser = null;
            state.isAuthenticated = false;
        },
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.currentUser) {
                state.currentUser = {...state.currentUser, ...action.payload};
            }
        },
        setOnboardingComplete: (state) => {
            state.hasCompletedOnboarding = true;
        },
        resetOnboarding: (state) => {
            state.hasCompletedOnboarding = false;
        },
    },
});

export const {setUser, clearUser, updateUser, setOnboardingComplete, resetOnboarding} = userSlice.actions;
export default userSlice.reducer;

