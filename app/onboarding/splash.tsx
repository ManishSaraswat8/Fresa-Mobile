import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
    ImageBackground,
    ActivityIndicator,
} from 'react-native';
import {useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useEffect} from 'react';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

export default function SplashScreen() {
    const router = useRouter();

    useEffect(() => {
        // Auto-redirect after 3 seconds
        const timer = setTimeout(() => {
            router.push('/onboarding/phone-number');
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <ImageBackground
                source={require('@/assets/splash-icon.png')}
                style={styles.backgroundImage}
                resizeMode="contain"
            >
                <View style={styles.content}>
                    <ActivityIndicator size="large" color="#F6B8A3"/>
                </View>
            </ImageBackground>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    backgroundImage: {
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
});
