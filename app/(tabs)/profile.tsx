import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useState, useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'expo-router';
import {clearUser} from '@/slices/userSlice';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import {
    getProfile,
    changePassword,
    updateLanguage,
    createDeleteRequest,
    updateProfile
} from '@/services/profileService';
import {logout} from '@/services/authService';
import {getUserData} from '@/services/authService';

export default function ProfileScreen() {
    const dispatch = useDispatch();
    const router = useRouter();
    const currentUser = useSelector((state: any) => state.user.currentUser);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
    const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
    const [showChangePINModal, setShowChangePINModal] = useState(false);
    const [showPINSuccessModal, setShowPINSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showLanguageConfirmModal, setShowLanguageConfirmModal] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [oldPIN, setOldPIN] = useState('');
    const [newPIN, setNewPIN] = useState('');
    const [confirmPIN, setConfirmPIN] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingLanguage, setIsSavingLanguage] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editAge, setEditAge] = useState('');
    const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const languages = ['English', 'German', 'French'];

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setIsLoading(true);
            const profile = await getProfile();
            setProfileData(profile);

            // Initialize edit fields
            setEditName(profile?.name || '');
            setEditEmail(profile?.email || '');
            // Calculate age from date if available (properly accounting for month and day)
            if (profile?.date) {
                const birthDate = new Date(profile.date);
                if (!isNaN(birthDate.getTime())) {
                    const today = new Date();
                    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        calculatedAge--;
                    }
                    setEditAge(calculatedAge > 0 ? calculatedAge.toString() : '');
                } else {
                    setEditAge('');
                }
            } else {
                setEditAge('');
            }

            // Set profile image if available
            if (profile?.media?.url) {
                setProfileImageUri(profile.media.url);
            } else {
                setProfileImageUri(null);
            }

            // Load language preference from backend
            if (profile?.meta?.language) {
                setSelectedLanguage(profile.meta.language);
            } else {
                // Default to English if no preference is set
                setSelectedLanguage('English');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            // Use stored user data as fallback
            const userData = await getUserData();
            if (userData) {
                setProfileData(userData);
                setEditName(userData.name || '');
                setEditEmail(userData.email || '');
                if (userData.date) {
                    const birthDate = new Date(userData.date);
                    const today = new Date();
                    const calculatedAge = today.getFullYear() - birthDate.getFullYear();
                    setEditAge(calculatedAge > 0 ? calculatedAge.toString() : '');
                }
                // Load language from stored user data
                if (userData?.meta?.language) {
                    setSelectedLanguage(userData.meta.language);
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenEditProfile = () => {
        setShowEditProfileModal(true);
    };

    const handlePickImage = async () => {
        try {
            // Show action sheet to choose between camera and library
            Alert.alert(
                'Select Photo',
                'Choose an option',
                [
                    {
                        text: 'Camera',
                        onPress: async () => {
                            try {
                                const {status} = await ImagePicker.requestCameraPermissionsAsync();
                                if (status !== 'granted') {
                                    Alert.alert(
                                        'Permission Required',
                                        'We need access to your camera to take a photo.',
                                        [{text: 'OK'}]
                                    );
                                    return;
                                }

                                const result = await ImagePicker.launchCameraAsync({
                                    mediaTypes: ['images'] as any,
                                    allowsEditing: true,
                                    aspect: [1, 1],
                                    quality: 0.8,
                                });

                                if (!result.canceled && result.assets && result.assets.length > 0) {
                                    const asset = result.assets[0];
                                    setProfileImageUri(asset.uri);
                                }
                            } catch (error: any) {
                                console.error('Error taking photo:', error);
                                Toast.show({
                                    type: 'error',
                                    text1: 'Error',
                                    text2: 'Failed to take photo',
                                    position: 'top',
                                });
                            }
                        },
                    },
                    {
                        text: 'Photo Library',
                        onPress: async () => {
                            try {
                                const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
                                if (status !== 'granted') {
                                    Alert.alert(
                                        'Permission Required',
                                        'We need access to your photos to set a profile picture.',
                                        [{text: 'OK'}]
                                    );
                                    return;
                                }

                                const result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ['images'] as any,
                                    allowsEditing: true,
                                    aspect: [1, 1],
                                    quality: 0.8,
                                });

                                if (!result.canceled && result.assets && result.assets.length > 0) {
                                    const asset = result.assets[0];
                                    setProfileImageUri(asset.uri);
                                }
                            } catch (error: any) {
                                console.error('Error picking image:', error);
                                Toast.show({
                                    type: 'error',
                                    text1: 'Error',
                                    text2: 'Failed to pick image',
                                    position: 'top',
                                });
                            }
                        },
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                ]
            );
        } catch (error: any) {
            console.error('Error showing image picker:', error);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setIsSavingProfile(true);

            const profileDataToUpdate: any = {};
            if (editName.trim()) profileDataToUpdate.name = editName.trim();
            if (editEmail.trim()) profileDataToUpdate.email = editEmail.trim().toLowerCase();

            // If age is provided, calculate date of birth (approximate)
            if (editAge.trim()) {
                const ageNum = parseInt(editAge.trim());
                if (!isNaN(ageNum) && ageNum > 0) {
                    const today = new Date();
                    const birthYear = today.getFullYear() - ageNum;
                    profileDataToUpdate.date = new Date(birthYear, 0, 1).toISOString();
                }
            }

            // Upload profile image if changed
            if (profileImageUri && profileImageUri.startsWith('file://')) {
                try {
                    setIsUploadingImage(true);
                    const fileName = profileImageUri.split('/').pop() || 'profile.jpg';
                    const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

                    const {uploadMedia} = await import('@/services/profileService');
                    const media = await uploadMedia(profileImageUri, fileName, mimeType);
                    profileDataToUpdate.media_id = media._id;
                } catch (uploadError: any) {
                    console.error('Error uploading image:', uploadError);
                    Toast.show({
                        type: 'error',
                        text1: 'Upload Error',
                        text2: uploadError.message || 'Failed to upload image',
                        position: 'top',
                    });
                    setIsUploadingImage(false);
                    return;
                } finally {
                    setIsUploadingImage(false);
                }
            }

            if (Object.keys(profileDataToUpdate).length > 0) {
                await updateProfile(profileDataToUpdate);
                await loadProfile(); // Reload profile to get updated data
                setShowEditProfileModal(false);
                Toast.show({
                    type: 'success',
                    text1: 'Profile Updated',
                    text2: 'Your profile has been updated successfully',
                    position: 'top',
                });
            } else if (!profileImageUri || !profileImageUri.startsWith('file://')) {
                Toast.show({
                    type: 'info',
                    text1: 'No Changes',
                    text2: 'Please make changes before saving',
                    position: 'top',
                });
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to update profile',
                position: 'top',
            });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleLanguageSelect = (language: string) => {
        // If selecting the same language, do nothing
        if (language === selectedLanguage) {
            return;
        }

        // Show confirmation modal
        setPendingLanguage(language);
        setShowLanguageConfirmModal(true);
    };

    const handleConfirmLanguageChange = async () => {
        if (!pendingLanguage) return;

        try {
            setIsSavingLanguage(true);
            // Save language preference to backend
            await updateLanguage(pendingLanguage);

            // Update local state
            setSelectedLanguage(pendingLanguage);
            setShowLanguageConfirmModal(false);
            setPendingLanguage(null);

            // Reload profile to get updated data
            await loadProfile();

            Toast.show({
                type: 'success',
                text1: 'Language Updated',
                text2: `Language changed to ${pendingLanguage}`,
                position: 'top',
            });
        } catch (error: any) {
            console.error('Error updating language:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to update language',
                position: 'top',
            });
        } finally {
            setIsSavingLanguage(false);
        }
    };

    const handleCancelLanguageChange = () => {
        setShowLanguageConfirmModal(false);
        setPendingLanguage(null);
    };

    const handleChangePIN = async () => {
        // Validate PINs
        if (!oldPIN || !newPIN || !confirmPIN) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please fill all fields',
                position: 'top',
            });
            return;
        }

        if (newPIN !== confirmPIN) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'New PINs do not match',
                position: 'top',
            });
            return;
        }

        if (newPIN.length < 4) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'PIN must be at least 4 digits',
                position: 'top',
            });
            return;
        }

        // Don't allow setting the same PIN
        if (oldPIN === newPIN) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'New PIN must be different from the old PIN',
                position: 'top',
            });
            return;
        }

        try {
            setIsLoading(true);
            // Change password in backend - now includes old password validation
            await changePassword(oldPIN, newPIN);

            setShowChangePINModal(false);
            setShowPINSuccessModal(true);
            setOldPIN('');
            setNewPIN('');
            setConfirmPIN('');

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'PIN changed successfully',
                position: 'top',
            });
        } catch (error: any) {
            console.error('Error changing PIN:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to change PIN',
                position: 'top',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setIsLoading(true);
            // Create delete request in backend
            await createDeleteRequest();

            setShowDeleteModal(false);

            Toast.show({
                type: 'success',
                text1: 'Delete Request Submitted',
                text2: 'Your account deletion request has been submitted. It will be processed soon.',
                position: 'top',
            });

            // Optionally logout after delete request
            // Uncomment if you want to logout immediately after delete request
            // await handleLogout();
        } catch (error: any) {
            console.error('Error creating delete request:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to submit delete request',
                position: 'top',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setIsLoading(true);
            // Call logout API
            await logout();

            Toast.show({
                type: 'success',
                text1: 'Logged Out',
                text2: 'You have been successfully logged out',
                position: 'top',
            });

            // Clear user authentication state
            dispatch(clearUser());
            // Navigate to login screen
            router.replace('/login');
        } catch (error: any) {
            console.error('Logout error:', error);
            // Still clear local state even if API call fails
            dispatch(clearUser());
            router.replace('/login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppWrapper headerTitle="Profile" headerVariant="default">
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {/* Profile Picture */}
                    <View style={styles.profilePictureContainer}>
                        {profileData?.media?.url ? (
                            <Image source={{uri: profileData.media.url}} style={styles.profilePictureImage}/>
                        ) : (
                            <View style={styles.profilePicture}>
                                <Feather name="user" size={48} color="#8B4513"/>
                            </View>
                        )}
                    </View>

                    {/* User Name */}
                    <Text style={styles.userName}>
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#1A1D1F"/>
                        ) : (
                            profileData?.name || currentUser?.name || 'User'
                        )}
                    </Text>
                    <Text style={styles.userId}>
                        {profileData?.email || currentUser?.email || 'No email'}
                    </Text>
                    {profileData?._id && (
                        <Text style={styles.userId}>ID: {profileData._id.toString().substring(0, 8)}...</Text>
                    )}

                    {/* Languages Section */}
                    <View style={styles.languagesSection}>
                        <Text style={styles.sectionTitle}>Languages</Text>
                        <View style={styles.languageButtons}>
                            {languages.map((language) => (
                                <TouchableOpacity
                                    key={language}
                                    style={[
                                        styles.languageButton,
                                        selectedLanguage === language && styles.languageButtonSelected,
                                    ]}
                                    onPress={() => handleLanguageSelect(language)}
                                    disabled={isSavingLanguage}
                                >
                                    <Text
                                        style={[
                                            styles.languageButtonText,
                                            selectedLanguage === language &&
                                            styles.languageButtonTextSelected,
                                        ]}
                                    >
                                        {language}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.editProfileButton}
                            onPress={handleOpenEditProfile}
                        >
                            <Feather name="edit-2" size={16} color="#8B4513"/>
                            <Text style={styles.editProfileButtonText}>Update Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.changePINButton}
                            onPress={() => setShowChangePINModal(true)}
                        >
                            <Text style={styles.changePINButtonText}>Change PIN</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.logoutButton, isLoading && styles.buttonDisabled]}
                            onPress={handleLogout}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff"/>
                            ) : (
                                <Text style={styles.logoutButtonText}>Log Out</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.deleteAccountButton, isLoading && styles.buttonDisabled]}
                            onPress={() => setShowDeleteModal(true)}
                            disabled={isLoading}
                        >
                            <Feather name="trash-2" size={16} color="#EF4444"/>
                            <Text style={styles.deleteAccountText}>Delete My Account</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Change PIN Modal */}
            <Modal
                visible={showChangePINModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowChangePINModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowChangePINModal(false)}
                    />
                    <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change PIN</Text>
                            <TouchableOpacity
                                onPress={() => setShowChangePINModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Feather name="x" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Old PIN</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter old PIN"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry
                                    value={oldPIN}
                                    onChangeText={setOldPIN}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>New PIN</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter new PIN"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry
                                    value={newPIN}
                                    onChangeText={setNewPIN}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Confirm PIN</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm new PIN"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry
                                    value={confirmPIN}
                                    onChangeText={setConfirmPIN}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.doneButton,
                                    (!oldPIN || !newPIN || !confirmPIN || isLoading) && styles.doneButtonDisabled,
                                ]}
                                onPress={handleChangePIN}
                                disabled={!oldPIN || !newPIN || !confirmPIN || isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#1A1D1F"/>
                                ) : (
                                    <Text style={styles.doneButtonText}>Done</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* PIN Change Success Modal */}
            <Modal
                visible={showPINSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPINSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowPINSuccessModal(false)}
                    />
                    <View style={styles.successModalContainer} onStartShouldSetResponder={() => true}>
                        <Text style={styles.successMessage}>PIN Change Successfully</Text>
                        <TouchableOpacity
                            style={styles.okayButton}
                            onPress={() => setShowPINSuccessModal(false)}
                        >
                            <Text style={styles.okayButtonText}>Okay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditProfileModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEditProfileModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowEditProfileModal(false)}
                    />
                    <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Profile</Text>
                            <TouchableOpacity
                                onPress={() => setShowEditProfileModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Feather name="x" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Profile Picture Section */}
                            <View style={styles.avatarSection}>
                                <TouchableOpacity
                                    style={styles.avatarContainer}
                                    onPress={handlePickImage}
                                    disabled={isSavingProfile || isUploadingImage}
                                >
                                    {profileImageUri ? (
                                        <Image source={{uri: profileImageUri}} style={styles.avatarImage}/>
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Feather name="user" size={40} color="#8B4513"/>
                                        </View>
                                    )}
                                    {isUploadingImage && (
                                        <View style={styles.avatarOverlay}>
                                            <ActivityIndicator size="small" color="#fff"/>
                                        </View>
                                    )}
                                    <View style={styles.avatarEditIcon}>
                                        <Feather name="camera" size={16} color="#fff"/>
                                    </View>
                                </TouchableOpacity>
                                <Text style={styles.avatarLabel}>Tap to change photo</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Enter your name"
                                    value={editName}
                                    onChangeText={setEditName}
                                    autoCapitalize="words"
                                    editable={!isSavingProfile}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Enter your email"
                                    value={editEmail}
                                    onChangeText={setEditEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!isSavingProfile}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Age</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Enter your age"
                                    value={editAge}
                                    onChangeText={setEditAge}
                                    keyboardType="number-pad"
                                    editable={!isSavingProfile}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.cancelButton, isSavingProfile && styles.buttonDisabled]}
                                onPress={() => setShowEditProfileModal(false)}
                                disabled={isSavingProfile}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.doneButton,
                                    (isSavingProfile || isUploadingImage) && styles.doneButtonDisabled,
                                ]}
                                onPress={handleSaveProfile}
                                disabled={isSavingProfile || isUploadingImage}
                            >
                                {(isSavingProfile || isUploadingImage) ? (
                                    <ActivityIndicator size="small" color="#1A1D1F"/>
                                ) : (
                                    <Text style={styles.doneButtonText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Account Modal */}
            <Modal
                visible={showDeleteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowDeleteModal(false)}
                    />
                    <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Are you sure?</Text>
                            <TouchableOpacity
                                onPress={() => setShowDeleteModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Feather name="x" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.deleteWarningText}>
                                Once you close your account, all your data will be permanently
                                deleted. You won't be able to recover it later.
                            </Text>

                            <View style={styles.deleteModalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowDeleteModal(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.deleteConfirmButton, isLoading && styles.deleteConfirmButtonDisabled]}
                                    onPress={handleDeleteAccount}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="#fff"/>
                                    ) : (
                                        <Text style={styles.deleteConfirmButtonText}>Yes, Close</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Language Change Confirmation Modal */}
            <Modal
                visible={showLanguageConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancelLanguageChange}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleCancelLanguageChange}
                    />
                    <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Language</Text>
                            <TouchableOpacity
                                onPress={handleCancelLanguageChange}
                                style={styles.modalCloseButton}
                            >
                                <Feather name="x" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.languageConfirmText}>
                                Are you sure you want to change the language from{' '}
                                <Text style={styles.languageConfirmBold}>{selectedLanguage}</Text> to{' '}
                                <Text style={styles.languageConfirmBold}>{pendingLanguage}</Text>?
                            </Text>

                            <View style={styles.deleteModalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleCancelLanguageChange}
                                    disabled={isSavingLanguage}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmButton, isSavingLanguage && styles.confirmButtonDisabled]}
                                    onPress={handleConfirmLanguageChange}
                                    disabled={isSavingLanguage}
                                >
                                    {isSavingLanguage ? (
                                        <ActivityIndicator size="small" color="#fff"/>
                                    ) : (
                                        <Text style={styles.confirmButtonText}>Confirm</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </AppWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f4f2',
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    profilePictureContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    profilePictureImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    profilePicture: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F6B8A3',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1D1F',
        textAlign: 'center',
        marginBottom: 8,
    },
    userId: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    languagesSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 12,
    },
    languageButtons: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    languageButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    languageButtonSelected: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    languageButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    languageButtonTextSelected: {
        fontWeight: '600',
    },
    actionButtons: {
        gap: 12,
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 8,
    },
    editProfileButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8B4513',
    },
    changePINButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    changePINButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    logoutButton: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    deleteAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    deleteAccountText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#EF4444',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalContent: {
        padding: 20,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 8,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    avatarOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarEditIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#8B4513',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1A1D1F',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1A1D1F',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    doneButton: {
        flex: 1,
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    doneButtonDisabled: {
        backgroundColor: '#E5E7EB',
        opacity: 0.5,
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    // Success Modal
    successModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 300,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    successMessage: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 24,
        textAlign: 'center',
    },
    okayButton: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 40,
        alignItems: 'center',
        width: '100%',
    },
    okayButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    // Delete Modal
    deleteWarningText: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 24,
        textAlign: 'center',
    },
    deleteModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteCancelButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    deleteCancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: '#E5E7EB',
        opacity: 0.5,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    deleteConfirmButton: {
        flex: 1,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    deleteConfirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Language Confirmation Modal
    languageConfirmText: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 24,
        textAlign: 'center',
    },
    languageConfirmBold: {
        fontWeight: '600',
        color: '#1A1D1F',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    deleteConfirmButtonDisabled: {
        opacity: 0.6,
    },
});

