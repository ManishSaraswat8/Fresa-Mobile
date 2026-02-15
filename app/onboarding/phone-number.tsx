import {
    Alert,
    BackHandler,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import CountryPicker, {Country, CountryCode} from 'react-native-country-picker-modal';
import {AsYouType, isValidPhoneNumber, parsePhoneNumber,} from 'libphonenumber-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {checkPatientByPhone} from '@/services/authService';
import {STORAGE_KEYS} from '@/config/api';

const TERMS_ACCEPTANCE_KEY = 'termsAndConditionsAccepted';

export default function PhoneNumberScreen() {
    const router = useRouter();
    const phoneInputRef = useRef<TextInput>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [formattedNumber, setFormattedNumber] = useState('');
    const [countryCode, setCountryCode] = useState<CountryCode>('DE');
    const [callingCode, setCallingCode] = useState('+49');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showTermsModal, setShowTermsModal] = useState(true);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    // Format phone number as user types
    const handlePhoneNumberChange = (text: string) => {
        // Remove all non-digit characters except + for formatting
        const digitsOnly = text.replace(/\D/g, '');

        // Use AsYouType formatter for the selected country
        const formatter = new AsYouType(countryCode as any);
        const formatted = formatter.input(digitsOnly);

        setPhoneNumber(digitsOnly);
        setFormattedNumber(formatted);

        // Validate phone number
        if (digitsOnly.length > 0) {
            try {
                const fullNumber = `${callingCode}${digitsOnly}`;
                const isValidNumber = isValidPhoneNumber(fullNumber, countryCode as any);
                setIsValid(isValidNumber);

                if (!isValidNumber && digitsOnly.length >= 7) {
                    setErrorMessage('Please enter a valid phone number');
                } else {
                    setErrorMessage('');
                }
            } catch (error) {
                setIsValid(false);
                if (digitsOnly.length >= 7) {
                    setErrorMessage('Please enter a valid phone number');
                }
            }
        } else {
            setIsValid(false);
            setErrorMessage('');
        }
    };

    const handleContinue = async () => {
        // Check if terms are accepted
        if (!termsAccepted) {
            setShowTermsModal(true);
            return;
        }

        if (!phoneNumber.trim()) {
            Alert.alert('Error', 'Please enter a phone number');
            return;
        }

        // Validate phone number before proceeding
        try {
            const fullNumber = `${callingCode}${phoneNumber}`;
            const isValidNumber = isValidPhoneNumber(fullNumber, countryCode as any);

            if (!isValidNumber) {
                Alert.alert('Invalid Phone Number', 'Please enter a valid phone number for the selected country.');
                return;
            }

            // Get full phone number with country code
            const parsedNumber = parsePhoneNumber(fullNumber, countryCode as any);
            const fullPhoneNumber = parsedNumber?.number || fullNumber;

            console.log('Full phone number:', fullPhoneNumber);
            console.log('Country code:', callingCode);
            console.log('Phone number:', phoneNumber);

            // Check if phone number is registered in backend
            setIsChecking(true);
            try {
                const phoneCheck = await checkPatientByPhone(fullPhoneNumber);

                if (!phoneCheck.exists) {
                    // Phone number not registered - don't allow to proceed
                    Alert.alert(
                        'Phone Number Not Registered',
                        'This phone number is not registered with any clinic. Please contact your clinic to add your account before using this app.',
                        [
                            {
                                text: 'OK',
                                onPress: () => {
                                    // Stay on phone number screen
                                },
                            },
                        ]
                    );
                    setIsChecking(false);
                    return;
                }

                // Phone number is registered - store it
                await AsyncStorage.setItem(STORAGE_KEYS.PHONE_NUMBER, fullPhoneNumber);
                if (phoneCheck.clinic_id) {
                    await AsyncStorage.setItem(STORAGE_KEYS.CLINIC_ID, phoneCheck.clinic_id);
                } else {
                    await AsyncStorage.removeItem(STORAGE_KEYS.CLINIC_ID);
                }

                // Check if user has already signed up on mobile app
                if (phoneCheck.mobile_app_signed_up) {
                    // User already signed up - skip onboarding and go directly to login
                    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
                    router.replace('/login');
                } else {
                    // First time signup - proceed to PIN setup
                    router.push('/onboarding/set-pin');
                }
            } catch (error: any) {
                console.error('Error checking phone number:', error);
                Alert.alert(
                    'Error',
                    'Unable to verify phone number. Please check your internet connection and try again.',
                    [
                        {
                            text: 'OK',
                        },
                    ]
                );
            } finally {
                setIsChecking(false);
            }
        } catch (error) {
            Alert.alert('Invalid Phone Number', 'Please enter a valid phone number for the selected country.');
        }
    };

    const onSelectCountry = (country: Country) => {
        const newCountryCode = country.cca2 as CountryCode;
        const newCallingCode = `+${country.callingCode[0]}`;
        setCountryCode(newCountryCode);
        setCallingCode(newCallingCode);
        setShowCountryPicker(false);
        // Reset phone number and validation when country changes
        setPhoneNumber('');
        setFormattedNumber('');
        setIsValid(false);
        setErrorMessage('');
    };

    // Check if terms are already accepted
    useEffect(() => {
        // checkTermsAcceptance();
    }, []);

    // Focus input when terms are already accepted (from previous session)
    useEffect(() => {
        if (termsAccepted && !showTermsModal) {
            // Small delay to ensure UI is ready
            setTimeout(() => {
                phoneInputRef.current?.focus();
            }, 300);
        }
    }, [termsAccepted, showTermsModal]);

    // Handle back button - close app if terms not accepted
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (showTermsModal && !termsAccepted) {
                // Close app if user tries to go back without accepting terms
                BackHandler.exitApp();
                return true;
            }
            return false;
        });

        return () => backHandler.remove();
    }, [showTermsModal, termsAccepted]);

    const checkTermsAcceptance = async () => {
        try {
            const accepted = await AsyncStorage.getItem(TERMS_ACCEPTANCE_KEY);
            if (accepted === 'true') {
                setTermsAccepted(true);
                setShowTermsModal(false);
            } else {
                setShowTermsModal(true);
            }
        } catch (error) {
            console.error('Error checking terms acceptance:', error);
            setShowTermsModal(true);
        }
    };

    const handleAcceptTerms = async () => {
        try {
            await AsyncStorage.setItem(TERMS_ACCEPTANCE_KEY, 'true');
            setTermsAccepted(true);
            setShowTermsModal(false);
            // Focus the input after terms are accepted (iOS fix)
            setTimeout(() => {
                phoneInputRef.current?.focus();
            }, 300); // Small delay to ensure modal is fully closed
        } catch (error) {
            console.error('Error saving terms acceptance:', error);
            Alert.alert('Error', 'Failed to save acceptance. Please try again.');
        }
    };

    const handleRejectTerms = () => {
        Alert.alert(
            'Terms Required',
            'You must accept the terms and conditions to use this app.',
            [
                {
                    text: 'Exit App',
                    onPress: () => BackHandler.exitApp(),
                    style: 'destructive',
                },
            ],
            {cancelable: false}
        );
    };

    // Update formatting when country changes
    useEffect(() => {
        if (phoneNumber) {
            const formatter = new AsYouType(countryCode as any);
            const formatted = formatter.input(phoneNumber);
            setFormattedNumber(formatted);

            // Re-validate with new country
            try {
                const fullNumber = `${callingCode}${phoneNumber}`;
                const isValidNumber = isValidPhoneNumber(fullNumber, countryCode as any);
                setIsValid(isValidNumber);
                setErrorMessage(isValidNumber ? '' : 'Please enter a valid phone number');
            } catch (error) {
                setIsValid(false);
                setErrorMessage('Please enter a valid phone number');
            }
        }
    }, [countryCode, callingCode]);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>Enter Phone Number</Text>
                    <Text style={styles.subtitle}>
                        We'll use this to verify your account
                    </Text>

                    <View style={styles.phoneInputContainer}>
                        <TouchableOpacity
                            style={styles.countrySelector}
                            onPress={() => setShowCountryPicker(true)}
                        >
                            <Text style={styles.countryCode}>{callingCode}</Text>
                        </TouchableOpacity>
                        <View style={styles.divider}/>
                        <TextInput
                            ref={phoneInputRef}
                            style={[
                                styles.phoneInput,
                                errorMessage && styles.phoneInputError,
                            ]}
                            placeholder="Enter phone number"
                            value={formattedNumber || phoneNumber}
                            onChangeText={handlePhoneNumberChange}
                            keyboardType="phone-pad"
                            editable={termsAccepted}
                            autoFocus={false}
                        />
                    </View>
                    {errorMessage && (
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    )}

                    <CountryPicker
                        visible={showCountryPicker}
                        withCallingCode
                        withFlagButton={false}
                        countryCode={countryCode as CountryCode}
                        onSelect={onSelectCountry}
                        onClose={() => setShowCountryPicker(false)}
                        withFilter
                        withAlphaFilter
                        filterProps={{
                            style: {
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                fontSize: 16,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#E5E7EB',
                                backgroundColor: '#fff',
                                marginLeft: 16, // Add space between close button and search on Android
                                marginRight: 20,
                                marginBottom: 16,
                                marginTop: 16,
                                flex: 1,
                            },
                            placeholder: 'Enter country name',
                        }}
                    />

                    <TouchableOpacity
                        style={[
                            styles.button,
                            (!phoneNumber.trim() || !isValid || isChecking) && styles.buttonDisabled,
                        ]}
                        onPress={handleContinue}
                        disabled={!phoneNumber.trim() || !isValid || isChecking}
                    >
                        <Text style={styles.buttonText}>
                            {isChecking ? 'Checking...' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Terms and Conditions Bottom Sheet */}
            <Modal
                visible={showTermsModal}
                transparent={true}
                animationType="slide"
                onRequestClose={handleRejectTerms}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.bottomSheet}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Privacy Summary</Text>
                            <View style={styles.bottomSheetHandle}/>
                        </View>

                        <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.sectionTitle}>Data Usage & Privacy</Text>
                            <Text style={styles.sectionText}>
                                We collect and use your phone number for the following purposes:
                            </Text>

                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.bulletText}>
                                    <Text style={styles.boldText}>Account Verification:</Text> Your phone number is used
                                    to verify your identity and secure your account.
                                </Text>
                            </View>

                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.bulletText}>
                                    <Text style={styles.boldText}>Communication:</Text> We may send you important
                                    notifications, updates, and reminders related to your health and wellness journey.
                                </Text>
                            </View>

                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.bulletText}>
                                    <Text style={styles.boldText}>Security:</Text> Your phone number helps us protect
                                    your account from unauthorized access and fraud.
                                </Text>
                            </View>

                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.bulletText}>
                                    <Text style={styles.boldText}>Support:</Text> We use your contact information to
                                    provide customer support when needed.
                                </Text>
                            </View>

                            <Text style={styles.sectionTitle}>Data Protection</Text>
                            <Text style={styles.sectionText}>
                                Your phone number is stored securely and will never be shared with third parties without
                                your explicit consent, except as required by law.
                            </Text>

                            <Text style={styles.sectionTitle}>Your Rights</Text>
                            <Text style={styles.sectionText}>
                                You have the right to access, update, or delete your personal information at any time
                                through the app settings.
                            </Text>

                            <Text style={styles.footerText}>
                                By continuing, you agree to our Terms & Conditions and Privacy Policy.
                            </Text>
                        </ScrollView>

                        <View style={styles.bottomSheetActions}>
                            <TouchableOpacity
                                style={styles.rejectButton}
                                onPress={handleRejectTerms}
                            >
                                <Text style={styles.rejectButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.acceptButton}
                                onPress={handleAcceptTerms}
                            >
                                <Text style={styles.acceptButtonText}>Accept & Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1D1F',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 48,
        textAlign: 'center',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 32,
    },
    countrySelector: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countryCode: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: '#E5E7EB',
    },
    phoneInput: {
        flex: 1,
        fontSize: 16,
        color: '#1A1D1F',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
    phoneInputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginTop: -28,
        marginBottom: 16,
        marginLeft: 4,
    },
    button: {
        backgroundColor: '#F6B8A3',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 'auto',
        marginBottom: 40,
    },
    buttonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    buttonText: {
        color: '#1A1D1F',
        fontSize: 18,
        fontWeight: '600',
    },
    // Terms Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '60%',
        paddingBottom: 20,
    },
    bottomSheetHeader: {
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 8,
        alignItems: 'center',
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        marginTop: 8,
        marginBottom: 4,
    },
    bottomSheetTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1D1F',
        textAlign: 'center',
    },
    bottomSheetContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        maxHeight: '80%',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1D1F',
        marginTop: 16,
        marginBottom: 8,
    },
    sectionText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingRight: 8,
    },
    bullet: {
        fontSize: 14,
        color: '#6B7280',
        marginRight: 8,
        marginTop: 2,
    },
    bulletText: {
        flex: 1,
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    boldText: {
        fontWeight: '600',
        color: '#1A1D1F',
    },
    footerText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    bottomSheetActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    rejectButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    rejectButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    acceptButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F6B8A3',
        alignItems: 'center',
    },
    acceptButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
});
