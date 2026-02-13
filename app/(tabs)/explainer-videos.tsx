import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Dimensions,
    StatusBar,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Video, ResizeMode, AVPlaybackStatus} from 'expo-av';
import {useState, useRef, useEffect} from 'react';
import {Feather} from '@expo/vector-icons';

interface VideoItem {
    id: string;
    title: string;
    description: string;
    videoUri: string;
    duration: string; // Format: "16:28"
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

export default function ExplainerVideosScreen() {
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const [videoPositions, setVideoPositions] = useState<{ [key: string]: { current: number; duration: number } }>({});
    const [showControls, setShowControls] = useState<{ [key: string]: boolean }>({});
    const [fullscreenVideoId, setFullscreenVideoId] = useState<string | null>(null);
    const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
    const [progressBarWidths, setProgressBarWidths] = useState<{ [key: string]: number }>({});
    const videoRefs = useRef<{ [key: string]: Video | null }>({});
    const fullscreenVideoRef = useRef<Video | null>(null);

    const videos: VideoItem[] = [
        {
            id: '1',
            title: 'Introduction to Healthy Living',
            description:
                'Learn how to build sustainable habits that promote long-term wellness, energy, and overall life balance.',
            videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Sample video URL
            duration: '16:28',
        },
        {
            id: '2',
            title: 'Daily Nutrition Basics',
            description:
                'Discover the principles of balanced eating to support energy, immunity, and healthy living every day.',
            videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', // Sample video URL
            duration: '15:28',
        },
        {
            id: '3',
            title: 'Simple Home Workouts',
            description:
                'Explore easy, effective exercises you can do at home to stay active and improve strength.',
            videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', // Sample video URL
            duration: '15:28',
        },
    ];

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Auto-hide controls after 3 seconds
    useEffect(() => {
        if (playingVideoId && showControls[playingVideoId]) {
            if (controlsTimeout) {
                clearTimeout(controlsTimeout);
            }
            const timeout = setTimeout(() => {
                setShowControls((prev) => ({
                    ...prev,
                    [playingVideoId]: false,
                }));
            }, 3000);
            setControlsTimeout(timeout);
        }
        return () => {
            if (controlsTimeout) {
                clearTimeout(controlsTimeout);
            }
        };
    }, [playingVideoId, showControls]);

    const handleSeek = async (videoId: string, seekPosition: number) => {
        const video = fullscreenVideoId === videoId
            ? fullscreenVideoRef.current
            : videoRefs.current[videoId];
        if (!video) return;

        const videoPosition = videoPositions[videoId] || {current: 0, duration: 0};
        if (videoPosition.duration === 0) return;

        const newPosition = Math.max(0, Math.min(seekPosition, videoPosition.duration));
        await video.setPositionAsync(newPosition * 1000);
    };

    const handlePlayPause = async (videoId: string, isFullscreen = false) => {
        const video = isFullscreen
            ? fullscreenVideoRef.current
            : videoRefs.current[videoId];
        if (!video) return;

        if (playingVideoId === videoId) {
            // Pause current video
            await video.pauseAsync();
            setPlayingVideoId(null);
            setShowControls((prev) => ({...prev, [videoId]: false}));
        } else {
            // Pause any other playing video
            if (playingVideoId) {
                const otherVideo = fullscreenVideoId === playingVideoId
                    ? fullscreenVideoRef.current
                    : videoRefs.current[playingVideoId];
                if (otherVideo) {
                    await otherVideo.pauseAsync();
                }
                setShowControls((prev) => ({...prev, [playingVideoId]: false}));
            }
            // Play this video
            await video.playAsync();
            setPlayingVideoId(videoId);
            setShowControls((prev) => ({...prev, [videoId]: true}));
        }
    };

    const handleFullscreen = async (videoId: string) => {
        const video = videoRefs.current[videoId];
        if (!video) return;

        // Get current position before going fullscreen
        const status = await video.getStatusAsync();
        if (status.isLoaded) {
            const wasPlaying = playingVideoId === videoId;
            const currentPosition = status.positionMillis;
            setFullscreenVideoId(videoId);
            // Pause the original video
            await video.pauseAsync();
            // Sync position and play in fullscreen after a short delay
            setTimeout(async () => {
                if (fullscreenVideoRef.current) {
                    await fullscreenVideoRef.current.setPositionAsync(currentPosition);
                    if (wasPlaying) {
                        await fullscreenVideoRef.current.playAsync();
                        setPlayingVideoId(videoId);
                        setShowControls((prev) => ({...prev, [videoId]: true}));
                    }
                }
            }, 100);
        }
    };

    const handleExitFullscreen = async () => {
        if (fullscreenVideoRef.current && fullscreenVideoId) {
            await fullscreenVideoRef.current.pauseAsync();
        }
        setFullscreenVideoId(null);
        setPlayingVideoId(null);
    };

    const handleVideoStatusUpdate = (videoId: string, status: AVPlaybackStatus) => {
        if (status.isLoaded) {
            const currentTime = status.positionMillis / 1000;
            const duration = status.durationMillis ? status.durationMillis / 1000 : 0;
            setVideoPositions((prev) => ({
                ...prev,
                [videoId]: {current: currentTime, duration},
            }));

            if (status.didJustFinish) {
                setPlayingVideoId(null);
                setShowControls((prev) => ({...prev, [videoId]: false}));
                if (fullscreenVideoId === videoId) {
                    handleExitFullscreen();
                }
            }
        }
    };


    return (
        <AppWrapper headerTitle="Explainer Videos" headerVariant="default">
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {videos.map((video) => {
                    const isPlaying = playingVideoId === video.id;
                    const videoPosition = videoPositions[video.id] || {current: 0, duration: 0};
                    const progress = videoPosition.duration > 0
                        ? (videoPosition.current / videoPosition.duration) * 100
                        : 0;
                    const showVideoControls = showControls[video.id] || false;
                    const currentTimeFormatted = formatTime(videoPosition.current);
                    const durationFormatted = videoPosition.duration > 0
                        ? formatTime(videoPosition.duration)
                        : video.duration;

                    return (
                        <View key={video.id} style={styles.videoCard}>
                            {/* Video Player */}
                            <View style={styles.videoContainer}>
                                <Video
                                    ref={(ref) => {
                                        videoRefs.current[video.id] = ref;
                                    }}
                                    source={{uri: video.videoUri}}
                                    style={styles.video}
                                    resizeMode={ResizeMode.COVER}
                                    useNativeControls={false}
                                    shouldPlay={isPlaying}
                                    isLooping={false}
                                    onPlaybackStatusUpdate={(status) => handleVideoStatusUpdate(video.id, status)}
                                />

                                {/* Tap area to toggle controls */}
                                <TouchableOpacity
                                    style={styles.videoTapArea}
                                    activeOpacity={1}
                                    onPress={() => {
                                        if (isPlaying) {
                                            setShowControls((prev) => ({
                                                ...prev,
                                                [video.id]: !prev[video.id],
                                            }));
                                        } else {
                                            handlePlayPause(video.id);
                                        }
                                    }}
                                >
                                    {/* Center Play Button */}
                                    {!isPlaying && (
                                        <View style={styles.centerPlayButton}>
                                            <View style={styles.playButtonCircle}>
                                                <Feather name="play" size={32} color="#fff"/>
                                            </View>
                                        </View>
                                    )}

                                    {/* Controls Overlay (only when playing) */}
                                    {showVideoControls && isPlaying && (
                                        <View style={styles.controlsOverlay}>
                                            <TouchableOpacity
                                                style={styles.overlayPlayButton}
                                                onPress={() => handlePlayPause(video.id)}
                                            >
                                                <Feather name="pause" size={24} color="#fff"/>
                                            </TouchableOpacity>
                                            <View style={styles.controlsRow}>
                                                <TouchableOpacity
                                                    style={styles.progressBar}
                                                    activeOpacity={1}
                                                    onLayout={(evt) => {
                                                        const width = evt.nativeEvent.layout.width;
                                                        setProgressBarWidths((prev) => ({...prev, [video.id]: width}));
                                                    }}
                                                    onPress={(evt) => {
                                                        const videoPosition = videoPositions[video.id] || {
                                                            current: 0,
                                                            duration: 0
                                                        };
                                                        const progressBarWidth = progressBarWidths[video.id] || SCREEN_WIDTH - 40;
                                                        if (videoPosition.duration > 0 && progressBarWidth > 0) {
                                                            const touchX = evt.nativeEvent.locationX;
                                                            const seekRatio = Math.max(0, Math.min(1, touchX / progressBarWidth));
                                                            handleSeek(video.id, seekRatio * videoPosition.duration);
                                                        }
                                                    }}
                                                >
                                                    <View style={[styles.progressFill, {width: `${progress}%`}]}/>
                                                    <View
                                                        style={[
                                                            styles.progressThumb,
                                                            {left: `${progress}%`}
                                                        ]}
                                                    />
                                                </TouchableOpacity>
                                                <View style={styles.controlsRight}>
                                                    <Text style={styles.timeText}>
                                                        {currentTimeFormatted} / {durationFormatted}
                                                    </Text>
                                                    <View style={styles.controlBadges}>
                                                        <View style={styles.hdBadge}>
                                                            <Text style={styles.hdBadgeText}>HD</Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            onPress={() => handleFullscreen(video.id)}
                                                            style={styles.fullscreenButton}
                                                        >
                                                            <Feather name="maximize-2" size={18} color="#fff"/>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Video Info */}
                            <View style={styles.videoInfo}>
                                <Text style={styles.videoTitle}>{video.title}</Text>
                                <Text style={styles.videoDescription}>{video.description}</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Fullscreen Modal */}
            {fullscreenVideoId && (() => {
                const video = videos.find(v => v.id === fullscreenVideoId);
                if (!video) return null;

                const isPlaying = playingVideoId === fullscreenVideoId;
                const videoPosition = videoPositions[fullscreenVideoId] || {current: 0, duration: 0};
                const progress = videoPosition.duration > 0
                    ? (videoPosition.current / videoPosition.duration) * 100
                    : 0;
                const showVideoControls = showControls[fullscreenVideoId] || false;
                const currentTimeFormatted = formatTime(videoPosition.current);
                const durationFormatted = videoPosition.duration > 0
                    ? formatTime(videoPosition.duration)
                    : video.duration;

                return (
                    <Modal
                        visible={true}
                        animationType="fade"
                        supportedOrientations={['portrait', 'landscape']}
                        onRequestClose={handleExitFullscreen}
                    >
                        <StatusBar hidden/>
                        <View style={styles.fullscreenContainer}>
                            <Video
                                ref={(ref) => {
                                    fullscreenVideoRef.current = ref;
                                }}
                                source={{uri: video.videoUri}}
                                style={styles.fullscreenVideo}
                                resizeMode={ResizeMode.CONTAIN}
                                useNativeControls={false}
                                shouldPlay={isPlaying}
                                isLooping={false}
                                onPlaybackStatusUpdate={(status) => handleVideoStatusUpdate(fullscreenVideoId, status)}
                            />

                            {/* Fullscreen Controls */}
                            <TouchableOpacity
                                style={styles.fullscreenTapArea}
                                activeOpacity={1}
                                onPress={() => {
                                    if (isPlaying) {
                                        setShowControls((prev) => ({
                                            ...prev,
                                            [fullscreenVideoId]: !prev[fullscreenVideoId],
                                        }));
                                    } else {
                                        handlePlayPause(fullscreenVideoId, true);
                                    }
                                }}
                            >
                                {/* Center Play Button */}
                                {!isPlaying && (
                                    <View style={styles.fullscreenCenterPlayButton}>
                                        <View style={styles.fullscreenPlayButtonCircle}>
                                            <Feather name="play" size={48} color="#fff"/>
                                        </View>
                                    </View>
                                )}

                                {/* Top Bar */}
                                <View style={styles.fullscreenTopBar}>
                                    <TouchableOpacity
                                        onPress={handleExitFullscreen}
                                        style={styles.exitFullscreenButton}
                                    >
                                        <Feather name="x" size={24} color="#fff"/>
                                    </TouchableOpacity>
                                    <Text style={styles.fullscreenTitle}>{video.title}</Text>
                                    <View style={styles.fullscreenTopBarSpacer}/>
                                </View>

                                {/* Bottom Controls */}
                                {showVideoControls && isPlaying && (
                                    <View style={styles.fullscreenControlsOverlay}>
                                        <TouchableOpacity
                                            style={styles.fullscreenPlayPauseButton}
                                            onPress={() => handlePlayPause(fullscreenVideoId, true)}
                                        >
                                            <Feather name="pause" size={32} color="#fff"/>
                                        </TouchableOpacity>
                                        <View style={styles.fullscreenControlsRow}>
                                            <TouchableOpacity
                                                style={styles.fullscreenProgressBar}
                                                activeOpacity={1}
                                                onLayout={(evt) => {
                                                    const width = evt.nativeEvent.layout.width;
                                                    setProgressBarWidths((prev) => ({
                                                        ...prev,
                                                        [`fullscreen_${fullscreenVideoId}`]: width
                                                    }));
                                                }}
                                                onPress={(evt) => {
                                                    const videoPosition = videoPositions[fullscreenVideoId] || {
                                                        current: 0,
                                                        duration: 0
                                                    };
                                                    const progressBarWidth = progressBarWidths[`fullscreen_${fullscreenVideoId}`] || SCREEN_WIDTH - 40;
                                                    if (videoPosition.duration > 0 && progressBarWidth > 0) {
                                                        const touchX = evt.nativeEvent.locationX;
                                                        const seekRatio = Math.max(0, Math.min(1, touchX / progressBarWidth));
                                                        handleSeek(fullscreenVideoId, seekRatio * videoPosition.duration);
                                                    }
                                                }}
                                            >
                                                <View style={[styles.fullscreenProgressFill, {width: `${progress}%`}]}/>
                                                <View
                                                    style={[
                                                        styles.fullscreenProgressThumb,
                                                        {left: `${progress}%`}
                                                    ]}
                                                />
                                            </TouchableOpacity>
                                            <View style={styles.fullscreenControlsRight}>
                                                <Text style={styles.fullscreenTimeText}>
                                                    {currentTimeFormatted} / {durationFormatted}
                                                </Text>
                                                <View style={styles.fullscreenControlBadges}>
                                                    <View style={styles.fullscreenHdBadge}>
                                                        <Text style={styles.fullscreenHdBadgeText}>HD</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Modal>
                );
            })()}
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
    videoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    videoContainer: {
        width: '100%',
        height: 200,
        backgroundColor: '#000',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoTapArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    controlsOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 12,
    },
    centerPlayButton: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButtonCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayPlayButton: {
        alignSelf: 'center',
        marginBottom: 8,
        padding: 8,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        overflow: 'visible',
        position: 'relative',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#EF4444',
        borderRadius: 2,
        position: 'absolute',
        top: 0,
        left: 0,
    },
    progressThumb: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
        position: 'absolute',
        top: -4,
        marginLeft: -6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    controlsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    controlBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    hdBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    hdBadgeText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
    },
    videoInfo: {
        padding: 16,
    },
    videoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    videoDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    fullscreenButton: {
        padding: 4,
    },
    // Fullscreen styles
    fullscreenContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenVideo: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    fullscreenTapArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    fullscreenCenterPlayButton: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenPlayButtonCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenTopBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    exitFullscreenButton: {
        padding: 8,
    },
    fullscreenTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 16,
    },
    fullscreenTopBarSpacer: {
        width: 40,
    },
    fullscreenControlsOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
    },
    fullscreenPlayPauseButton: {
        alignSelf: 'center',
        marginBottom: 16,
        padding: 12,
    },
    fullscreenControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fullscreenProgressBar: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 3,
        overflow: 'visible',
        position: 'relative',
    },
    fullscreenProgressFill: {
        height: '100%',
        backgroundColor: '#EF4444',
        borderRadius: 3,
        position: 'absolute',
        top: 0,
        left: 0,
    },
    fullscreenProgressThumb: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        position: 'absolute',
        top: -5,
        marginLeft: -8,
        borderWidth: 3,
        borderColor: '#fff',
    },
    fullscreenControlsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    fullscreenTimeText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    fullscreenControlBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fullscreenHdBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    fullscreenHdBadgeText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
});

