import {Redirect} from 'expo-router';
import {useSelector, useDispatch} from 'react-redux';
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {setUser, clearUser, setOnboardingComplete} from '@/slices/userSlice';
import {isAuthenticated as checkAuth, getUserData, getTokens, checkPatientByPhone} from '@/services/authService';
import {STORAGE_KEYS} from '@/config/api';

export default function Index() {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state: any) => state.user.isAuthenticated);
    const hasCompletedOnboarding = useSelector(
        (state: any) => state.user.hasCompletedOnboarding
    );
    const [isChecking, setIsChecking] = useState(true);
    const [onboardingCompleted, setOnboardingCompleted] = useState(false);
    const [hasPhoneNumber, setHasPhoneNumber] = useState<boolean | null>(null);

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        try {
            // FIRST: Check if phone number is stored
            const storedPhone = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);
            setHasPhoneNumber(!!storedPhone);

            if (!storedPhone) {
                // No phone number stored - user needs to go through onboarding
                console.log('No phone number found - redirecting to onboarding');
                setOnboardingCompleted(false);
                dispatch(clearUser());
                setIsChecking(false);
                return;
            }

            // Phone number exists - check if user has already signed up on mobile app
            const phoneCheck = await checkPatientByPhone(storedPhone);
            if (phoneCheck.exists && phoneCheck.mobile_app_signed_up) {
                // User already signed up on mobile app - mark onboarding as complete
                await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
                dispatch(setOnboardingComplete());
                setOnboardingCompleted(true);
            }

            // Phone number exists - check authentication status
            const authStatus = await checkAuth();
            if (authStatus) {
                // Load user data and tokens from storage
                const userData = await getUserData();
                const tokens = await getTokens();

                if (userData && tokens.token && tokens.auth_token) {
                    // Set user in Redux with all necessary data including tokens
                    dispatch(
                        setUser({
                            id: userData._id || userData.id,
                            name: userData.name,
                            email: userData.email,
                            token: tokens.token,
                            auth_token: tokens.auth_token,
                        })
                    );
                } else {
                    // If tokens exist but no user data (or vice versa), clear auth state
                    console.log('Auth check: tokens or user data missing', {
                        hasUserData: !!userData,
                        hasToken: !!tokens.token,
                        hasAuthToken: !!tokens.auth_token
                    });
                    dispatch(clearUser());
                }
            } else {
                // If not authenticated, clear user state
                dispatch(clearUser());
            }

            // Check onboarding status
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
            const onboardingStatus = stored === 'true';
            setOnboardingCompleted(onboardingStatus);

            if (onboardingStatus) {
                dispatch(setOnboardingComplete());
            }
        } catch (error) {
            console.error('Error initializing app:', error);
            setOnboardingCompleted(false);
            setHasPhoneNumber(false);
            // On error, assume not authenticated
            dispatch(clearUser());
        } finally {
            setIsChecking(false);
        }
    };

    // Wait for initialization to complete
    if (isChecking || hasPhoneNumber === null) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#F6B8A3"/>
            </View>
        );
    }

    // If no phone number, go to onboarding
    if (!hasPhoneNumber) {
        return <Redirect href="/onboarding/splash"/>;
    }

    // Phone number exists - check authentication status
    if (isAuthenticated) {
        return <Redirect href="/(tabs)"/>;
    }

    // Phone number exists but not authenticated - show login screen
    return <Redirect href="/login"/>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f4f2',
    },
});

