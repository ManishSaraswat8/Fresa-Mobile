import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import {useState, useRef, useEffect} from 'react';
import {useRouter, useRootNavigationState} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {setUser, clearUser, resetOnboarding} from '@/slices/userSlice';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {login, clearAllAppStorage} from '@/services/authService';
import {STORAGE_KEYS} from '@/config/api';

export default function LoginScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const navigationState = useRootNavigationState();
    const isAuthenticated = useSelector((state: any) => state.user.isAuthenticated);
    const [pin, setPin] = useState(['', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Redirect if already authenticated
    useEffect(() => {
        if (navigationState?.key && isAuthenticated) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, navigationState?.key]);

    // Load stored phone number on mount
    useEffect(() => {
        loadStoredPhoneNumber();
    }, []);

    const loadStoredPhoneNumber = async () => {
        try {
            const storedPhone = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);
            // Phone number is stored but not displayed on login screen
            // It will be used for authentication
        } catch (error) {
            console.error('Error loading phone number:', error);
        }
    };

    const handlePinChange = (value: string, index: number) => {
        if (value.length > 1) {
            // Handle paste
            const pastedPin = value.slice(0, 4).split('');
            const newPin = [...pin];
            pastedPin.forEach((digit, i) => {
                if (index + i < 4) {
                    newPin[index + i] = digit;
                }
            });
            setPin(newPin);
            // Focus last input
            const lastIndex = Math.min(index + pastedPin.length - 1, 3);
            inputRefs.current[lastIndex]?.focus();
            return;
        }

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }

        // Check if PIN is complete
        if (index === 3 && value) {
            const enteredPin = newPin.join('');
            handleLogin(enteredPin);
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleNumberPress = (num: string) => {
        const emptyIndex = pin.findIndex((digit) => !digit);
        if (emptyIndex !== -1) {
            handlePinChange(num, emptyIndex);
        }
    };

    const handleDelete = () => {
        const lastFilledIndex = pin.findLastIndex((digit) => digit !== '');
        if (lastFilledIndex !== -1) {
            const newPin = [...pin];
            newPin[lastFilledIndex] = '';
            setPin(newPin);
            inputRefs.current[lastFilledIndex]?.focus();
        }
    };

    const handleClearStorage = async () => {
        try {
            await clearAllAppStorage();
            dispatch(clearUser());
            dispatch(resetOnboarding());
            Toast.show({
                type: 'success',
                text1: 'Storage cleared',
                text2: 'Starting fresh – enter your phone number',
                position: 'top',
            });
            router.replace('/onboarding/splash');
        } catch (e) {
            Toast.show({
                type: 'error',
                text1: 'Failed to clear storage',
                position: 'top',
            });
        }
    };

    const handleLogin = async (enteredPin: string) => {
        if (isLoading) return;

        try {
            setIsLoading(true);

            // Get stored phone number
            const storedPhone = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);
            if (!storedPhone) {
                Toast.show({
                    type: 'error',
                    text1: 'Phone number not found',
                    text2: 'Please complete onboarding first',
                    position: 'top',
                });
                router.replace('/onboarding/splash');
                return;
            }

            // Login with phone number and PIN
            // Backend accepts username (can be phone) and password (PIN)
            const response = await login({
                username: storedPhone,
                password: enteredPin,
            });

            if (response.data) {
                // Set user in Redux store
                dispatch(
                    setUser({
                        id: response.data.userData._id || response.data.userData.id,
                        name: response.data.userData.name,
                        email: response.data.userData.email,
                        token: response.data.token,
                        auth_token: response.data.auth_token,
                    })
                );

                Toast.show({
                    type: 'success',
                    text1: 'Login successful',
                    position: 'top',
                });

                // Navigate to main app
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            console.error('Login error:', error);

            // Provide more helpful error messages
            let errorMessage = error.message || 'Invalid phone number or PIN';
            let errorTitle = 'Login Failed';

            if (error.message && error.message.includes('Invalid phone number or PIN')) {
                errorTitle = 'Account Not Found';
                errorMessage = 'This phone number is not registered. Please:\n\n1. Contact your clinic to set up your account\n2. Ensure you\'re using the correct phone number\n3. Verify your PIN is correct';
            }

            Toast.show({
                type: 'error',
                text1: errorTitle,
                text2: errorMessage,
                position: 'top',
                visibilityTime: 5000, // Show for 5 seconds for longer messages
            });

            // Clear PIN on error
            setPin(['', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>Enter PIN</Text>
                    <Text style={styles.subtitle}>Enter your 4-digit PIN to continue</Text>

                    {/* PIN Input Fields */}
                    <View style={styles.pinContainer}>
                        {pin.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => {
                                    inputRefs.current[index] = ref;
                                }}
                                style={[styles.pinInput, digit && styles.pinInputFilled]}
                                value={digit}
                                onChangeText={(value) => handlePinChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                secureTextEntry
                                showSoftInputOnFocus={false}
                                autoFocus={index === 0}
                                editable={!isLoading}
                            />
                        ))}
                    </View>

                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#F6B8A3"/>
                        </View>
                    )}

                    {/* Number Pad */}
                    <View style={styles.numberPad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <TouchableOpacity
                                key={num}
                                style={styles.numberButton}
                                onPress={() => handleNumberPress(num.toString())}
                            >
                                <Text style={styles.numberText}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                        <View style={styles.numberButton}/>
                        <TouchableOpacity
                            style={styles.numberButton}
                            onPress={() => handleNumberPress('0')}
                        >
                            <Text style={styles.numberText}>0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.numberButton} onPress={handleDelete}>
                            <Text style={styles.deleteText}>⌫</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Temp: clear all storage and go to onboarding
          <TouchableOpacity style={styles.clearStorageButton} onPress={handleClearStorage}>
            <Text style={styles.clearStorageText}>Clear storage & start fresh</Text>
          </TouchableOpacity> */}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f4f2',
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 80,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 48,
        textAlign: 'center',
    },
    pinContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 48,
    },
    pinInput: {
        width: 60,
        height: 60,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    pinInputFilled: {
        borderColor: '#F6B8A3',
        backgroundColor: '#F6B8A3',
    },
    numberPad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        maxWidth: 300,
        justifyContent: 'center',
        gap: 12,
    },
    numberButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    numberText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    deleteText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#EF4444',
    },
    loadingContainer: {
        marginTop: 16,
        alignItems: 'center',
    },
    clearStorageButton: {
        marginTop: 24,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    clearStorageText: {
        fontSize: 12,
        color: '#6B7280',
    },
});

