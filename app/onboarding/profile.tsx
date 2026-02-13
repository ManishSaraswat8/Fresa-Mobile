import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import {useState, useEffect} from 'react';
import {useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {updateProfileByPhone, getUserByPhone} from '@/services/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '@/config/api';

export default function ProfileScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setIsLoadingProfile(true);
            // Get phone number from storage
            const phoneNumber = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);

            if (!phoneNumber) {
                // No phone number - skip profile step
                router.push('/onboarding/video');
                return;
            }

            // Fetch user details from backend by phone number
            const userData = await getUserByPhone(phoneNumber);

            if (userData) {
                setName(userData.name || '');
                setEmail(userData.email || '');
                // Calculate age from date if available (properly accounting for month and day)
                if (userData.date) {
                    const birthDate = new Date(userData.date);
                    const today = new Date();
                    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        calculatedAge--;
                    }
                    setAge(calculatedAge > 0 ? calculatedAge.toString() : '');
                }
            }
        } catch (error: any) {
            console.error('Error loading profile:', error);
            // If user not found or error, allow user to enter details manually
            setIsEditing(true);
            Toast.show({
                type: 'info',
                text1: 'Info',
                text2: 'Please confirm or update your details',
                position: 'top',
            });
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const handleContinue = async () => {
        if (isLoading) return;

        try {
            setIsLoading(true);

            // Prepare profile data
            const profileData: any = {};
            if (name.trim()) profileData.name = name.trim();
            if (email.trim()) profileData.email = email.trim().toLowerCase();

            // If age is provided, calculate date of birth (approximate)
            if (age.trim()) {
                const ageNum = parseInt(age.trim());
                if (!isNaN(ageNum) && ageNum > 0) {
                    const today = new Date();
                    const birthYear = today.getFullYear() - ageNum;
                    profileData.date = new Date(birthYear, 0, 1).toISOString();
                }
            }

            // Get phone number from storage
            const phoneNumber = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);

            if (!phoneNumber) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Phone number not found',
                    position: 'top',
                });
                return;
            }

            // Update profile in backend using phone number (no auth required)
            if (Object.keys(profileData).length > 0) {
                await updateProfileByPhone(phoneNumber, profileData);
                Toast.show({
                    type: 'success',
                    text1: 'Profile updated',
                    position: 'top',
                });
            }

            // Proceed to next screen
            router.push('/onboarding/video');
        } catch (error: any) {
            console.error('Error saving profile:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to save profile',
                position: 'top',
            });
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
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        <Text style={styles.title}>
                            {isEditing ? 'Complete Your Profile' : 'Confirm Your Details'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isEditing
                                ? 'Please enter your details below'
                                : 'Please confirm if these details are correct or update them if needed'}
                        </Text>

                        {isLoadingProfile ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#F6B8A3"/>
                            </View>
                        ) : (
                            <>
                                <View style={styles.form}>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Full Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your name"
                                            value={name}
                                            onChangeText={setName}
                                            autoCapitalize="words"
                                            editable={!isLoading && (isEditing || true)}
                                        />
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Email</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your email"
                                            value={email}
                                            onChangeText={setEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            editable={!isLoading && (isEditing || true)}
                                        />
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Age</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your age"
                                            value={age}
                                            onChangeText={setAge}
                                            keyboardType="number-pad"
                                            editable={!isLoading && (isEditing || true)}
                                        />
                                    </View>
                                </View>

                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[styles.button, isLoading && styles.buttonDisabled]}
                                        onPress={handleContinue}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator size="small" color="#1A1D1F"/>
                                        ) : (
                                            <Text style={styles.buttonText}>
                                                {isEditing ? 'Continue' : 'Confirm & Continue'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    {!isEditing && (
                                        <TouchableOpacity
                                            style={styles.editButton}
                                            onPress={() => setIsEditing(true)}
                                            disabled={isLoading}
                                        >
                                            <Text style={styles.editText}>Update Details</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </ScrollView>
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
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 40,
        paddingTop: 60,
        paddingBottom: 40,
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
    form: {
        marginBottom: 32,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        fontSize: 16,
        color: '#1A1D1F',
    },
    buttonContainer: {
        marginTop: 'auto',
    },
    button: {
        backgroundColor: '#F6B8A3',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: {
        color: '#1A1D1F',
        fontSize: 18,
        fontWeight: '600',
    },
    editButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    editText: {
        color: '#8B4513',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
