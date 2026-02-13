import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Alert,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';

export default function EmergencyHelpScreen() {

    const handlePhoneCall = (phoneNumber: string) => {
        const cleanNumber = phoneNumber.replace(/\s/g, '');
        const url = `tel:${cleanNumber}`;
        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Alert.alert('Error', 'Phone calls are not supported on this device.');
                }
            })
            .catch((err) => {
                console.error('Error opening phone dialer:', err);
                Alert.alert('Error', 'Unable to make phone call.');
            });
    };

    const handleWebsitePress = () => {
        const url = 'https://www.telefonseelsorge.de/telefon/';
        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Alert.alert('Error', 'Unable to open website.');
                }
            })
            .catch((err) => {
                console.error('Error opening website:', err);
                Alert.alert('Error', 'Unable to open website.');
            });
    };

    const handleSOSPress = () => {
        // Call the first emergency number
        handlePhoneCall('0800 1110111');
    };

    return (
        <AppWrapper headerTitle="Emergency Help" headerVariant="default" hideBadge={true}>
            <View style={styles.container}>
                <View style={styles.helplineCard}>
                    {/* Helpline Header */}
                    <View style={styles.helplineHeader}>
                        <Text style={styles.helplineTitle}>Helpline Number</Text>
                    </View>

                    {/* SOS Button */}
                    <TouchableOpacity style={styles.sosButton} onPress={handleSOSPress}>
                        <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>

                    {/* Organization Name */}
                    <Text style={styles.organizationName}>TelefonSeelsorge</Text>

                    {/* Phone Numbers */}
                    <View style={styles.phoneNumbersContainer}>
                        <TouchableOpacity
                            onPress={() => handlePhoneCall('0800 1110111')}
                            style={styles.phoneNumberLink}
                        >
                            <Text style={styles.phoneNumber}>0800 1110111</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handlePhoneCall('0800 1110222')}
                            style={styles.phoneNumberLink}
                        >
                            <Text style={styles.phoneNumber}>0800 1110222</Text>
                        </TouchableOpacity>
                        <Text style={styles.orText}>or</Text>
                        <TouchableOpacity
                            onPress={() => handlePhoneCall('116 123')}
                            style={styles.phoneNumberLink}
                        >
                            <Text style={styles.phoneNumber}>116 123</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Website URL */}
                    <TouchableOpacity
                        onPress={handleWebsitePress}
                        style={styles.websiteLink}
                    >
                        <Text style={styles.websiteText}>
                            https://www.telefonseelsorge.de/telefon/
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </AppWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f4f2',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    helplineCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    helplineHeader: {
        marginBottom: 24,
    },
    helplineTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    sosButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 24,
        shadowColor: '#EF4444',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    sosText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 2,
    },
    organizationName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1D1F',
        textAlign: 'center',
        marginBottom: 24,
    },
    phoneNumbersContainer: {
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    phoneNumberLink: {
        paddingVertical: 8,
    },
    phoneNumber: {
        fontSize: 18,
        fontWeight: '500',
        color: '#1A1D1F',
        textDecorationLine: 'underline',
        textAlign: 'center',
    },
    orText: {
        fontSize: 16,
        color: '#6B7280',
        marginVertical: 4,
    },
    websiteLink: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    websiteText: {
        fontSize: 14,
        color: '#1A1D1F',
        textDecorationLine: 'underline',
        textAlign: 'center',
    },
});

