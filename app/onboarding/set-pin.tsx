import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import {useState, useRef} from 'react';
import {useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS, API_CONFIG} from '@/config/api';
import {fetchData} from '@/services/api';

const DEFAULT_PIN = '0000';

export default function SetPinScreen() {
    const router = useRouter();
    const [step, setStep] = useState<'pin' | 'confirm'>('pin');
    const [pin, setPin] = useState(['', '', '', '']);
    const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
    const inputRefs = useRef<(TextInput | null)[]>([]);
    const confirmInputRefs = useRef<(TextInput | null)[]>([]);

    const handlePinChange = async (value: string, index: number, isConfirm = false) => {
        if (value.length > 1) {
            // Handle paste
            const pastedPin = value.slice(0, 4).split('');
            const targetPin = isConfirm ? confirmPin : pin;
            const newPin = [...targetPin];
            pastedPin.forEach((digit, i) => {
                if (index + i < 4) {
                    newPin[index + i] = digit;
                }
            });
            if (isConfirm) {
                setConfirmPin(newPin);
                const lastIndex = Math.min(index + pastedPin.length - 1, 3);
                confirmInputRefs.current[lastIndex]?.focus();
            } else {
                setPin(newPin);
                const lastIndex = Math.min(index + pastedPin.length - 1, 3);
                inputRefs.current[lastIndex]?.focus();
            }
            return;
        }

        if (isConfirm) {
            const newPin = [...confirmPin];
            newPin[index] = value;
            setConfirmPin(newPin);

            if (value && index < 3) {
                confirmInputRefs.current[index + 1]?.focus();
            }

            // Check if confirm PIN is complete
            if (index === 3 && value) {
                const enteredPin = newPin.join('');
                const originalPin = pin.join('');
                if (enteredPin === originalPin) {
                    // PINs match, save PIN and proceed to next screen
                    await savePin(enteredPin);
                    router.push('/onboarding/profile');
                } else {
                    Toast.show({
                        type: 'error',
                        text1: 'PINs do not match',
                        text2: 'Please try again',
                        position: 'top',
                    });
                    setConfirmPin(['', '', '', '']);
                    confirmInputRefs.current[0]?.focus();
                }
            }
        } else {
            const newPin = [...pin];
            newPin[index] = value;
            setPin(newPin);

            if (value && index < 3) {
                inputRefs.current[index + 1]?.focus();
            }

            // Check if PIN is complete
            if (index === 3 && value) {
                // Move to confirm PIN step
                setStep('confirm');
                setTimeout(() => {
                    confirmInputRefs.current[0]?.focus();
                }, 100);
            }
        }
    };

    const handleKeyPress = (e: any, index: number, isConfirm = false) => {
        const targetPin = isConfirm ? confirmPin : pin;
        if (e.nativeEvent.key === 'Backspace' && !targetPin[index] && index > 0) {
            if (isConfirm) {
                confirmInputRefs.current[index - 1]?.focus();
            } else {
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    const handleNumberPress = (num: string) => {
        const targetPin = step === 'confirm' ? confirmPin : pin;
        const emptyIndex = targetPin.findIndex((digit) => !digit);
        if (emptyIndex !== -1) {
            handlePinChange(num, emptyIndex, step === 'confirm');
        }
    };

    const handleDelete = () => {
        const targetPin = step === 'confirm' ? confirmPin : pin;
        const lastFilledIndex = targetPin.findLastIndex((digit) => digit !== '');
        if (lastFilledIndex !== -1) {
            if (step === 'confirm') {
                const newPin = [...confirmPin];
                newPin[lastFilledIndex] = '';
                setConfirmPin(newPin);
                confirmInputRefs.current[lastFilledIndex]?.focus();
            } else {
                const newPin = [...pin];
                newPin[lastFilledIndex] = '';
                setPin(newPin);
                inputRefs.current[lastFilledIndex]?.focus();
            }
        }
    };

    const handleSkip = async () => {
        // Use default PIN and proceed
        await savePin(DEFAULT_PIN);
        router.push('/onboarding/profile');
    };

    const savePin = async (pinValue: string) => {
        try {
            // Save PIN locally
            await AsyncStorage.setItem(STORAGE_KEYS.PIN, pinValue);
            console.log('PIN saved locally');

            // Also update password in backend using phone number
            const storedPhone = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);
            if (storedPhone) {
                try {
                    // Update password in backend
                    await fetchData(
                        `${API_CONFIG.CORE_API_URL}/auth/set-password-by-phone`,
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                phone: storedPhone,
                                password: pinValue,
                            }),
                        },
                        false // Don't require auth for this endpoint
                    );
                    console.log('PIN saved to backend successfully');
                } catch (error: any) {
                    console.error('Error syncing PIN to backend:', error);
                    // Show warning but don't block the flow
                    Toast.show({
                        type: 'error',
                        text1: 'Warning',
                        text2: 'PIN saved locally but failed to sync to server. You may need to set it again.',
                        position: 'top',
                    });
                }
            }
        } catch (error) {
            console.error('Error saving PIN:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to save PIN',
                position: 'top',
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>
                        {step === 'pin' ? 'Set Your PIN' : 'Confirm Your PIN'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 'pin'
                            ? 'Create a 4-digit PIN to secure your account'
                            : 'Re-enter your PIN to confirm'}
                    </Text>

                    {/* PIN Input Fields */}
                    <View style={styles.pinContainer}>
                        {(step === 'pin' ? pin : confirmPin).map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => {
                                    if (step === 'confirm') {
                                        confirmInputRefs.current[index] = ref;
                                    } else {
                                        inputRefs.current[index] = ref;
                                    }
                                }}
                                style={[styles.pinInput, digit && styles.pinInputFilled]}
                                value={digit}
                                onChangeText={(value) =>
                                    handlePinChange(value, index, step === 'confirm')
                                }
                                onKeyPress={(e) => handleKeyPress(e, index, step === 'confirm')}
                                keyboardType="number-pad"
                                maxLength={1}
                                secureTextEntry
                                showSoftInputOnFocus={false}
                                autoFocus={index === 0 && step === 'confirm'}
                            />
                        ))}
                    </View>

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

                    {step === 'pin' && (
                        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                            <Text style={styles.skipText}>
                                Skip (Use default PIN: {DEFAULT_PIN})
                            </Text>
                        </TouchableOpacity>
                    )}
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
    skipButton: {
        marginTop: 24,
    },
    skipText: {
        color: '#6B7280',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
