import {ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AVPlaybackStatus, ResizeMode, Video} from 'expo-av';
import {useDispatch} from 'react-redux';
import {setOnboardingComplete} from '@/slices/userSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '@/config/api';
import {getPublicOnboardingVideos} from '@/services/mediaService';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Fallback video when no clinic-specific onboarding video is configured
const FALLBACK_VIDEO_URI =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export default function OnboardingVideoScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const videoRef = useRef<Video>(null);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [isFetchingVideo, setIsFetchingVideo] = useState(true);
    const [hasWatchedComplete, setHasWatchedComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(
        null
    );

    useEffect(() => {
        let cancelled = false;
        const loadClinicVideo = async () => {
            try {
                const clinicId = await AsyncStorage.getItem(STORAGE_KEYS.CLINIC_ID);
                if (clinicId) {
                    const items = await getPublicOnboardingVideos(clinicId);
                    const firstVideo = items.find((i) => i.url);
                    if (!cancelled && firstVideo?.url) {
                        setVideoUri(firstVideo.url);
                        return;
                    }
                }
                if (!cancelled) {
                    setVideoUri(FALLBACK_VIDEO_URI);
                }
            } catch {
                if (!cancelled) {
                    setVideoUri(FALLBACK_VIDEO_URI);
                }
            } finally {
                if (!cancelled) {
                    setIsFetchingVideo(false);
                }
            }
        };
        loadClinicVideo();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            videoRef.current?.unloadAsync();
        };
    }, []);

    const handleVideoStatusUpdate = (status: AVPlaybackStatus) => {
        setVideoStatus(status);
        setIsLoading(false);

        if (status.isLoaded) {
            const {didJustFinish, positionMillis, durationMillis} = status;

            // Check if video has been watched completely
            if (didJustFinish || (durationMillis && positionMillis >= durationMillis - 1000)) {
                setHasWatchedComplete(true);
            }
        }
    };

    const handleContinue = async () => {
        // Mark onboarding as complete
        dispatch(setOnboardingComplete());
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');

        // Navigate to login screen
        router.replace('/login');
    };


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Onboarding Video</Text>
                <Text style={styles.subtitle}>
                    First, watch this onboarding video to get started
                </Text>

                <View style={styles.videoContainer}>
                    {(isFetchingVideo || isLoading) && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F6B8A3"/>
                        </View>
                    )}
                    {!isFetchingVideo && videoUri && (
                        <Video
                            ref={videoRef}
                            source={{uri: videoUri}}
                            style={styles.video}
                            resizeMode={ResizeMode.CONTAIN}
                            useNativeControls={false}
                            onPlaybackStatusUpdate={handleVideoStatusUpdate}
                            shouldPlay
                        />
                    )}
                </View>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleContinue}
                >
                    <Text style={styles.buttonText}>
                        Skip & Continue
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f4f2',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
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
        marginBottom: 32,
        textAlign: 'center',
    },
    videoContainer: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.6,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        position: 'absolute',
        zIndex: 1,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    button: {
        backgroundColor: '#F6B8A3',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 'auto',
    },
    buttonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    buttonText: {
        color: '#1A1D1F',
        fontSize: 18,
        fontWeight: '600',
    },
});
