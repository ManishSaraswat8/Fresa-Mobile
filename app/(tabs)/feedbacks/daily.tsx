import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {ConfirmDialog} from '@/app/component/ConfirmDialog';
import {Feather, MaterialIcons} from '@expo/vector-icons';
import {useState, useEffect, useCallback} from 'react';
import {Audio} from 'expo-av';
import {getDailyFeedback, submitDailyFeedback} from '@/services/api';
import Toast from 'react-native-toast-message';
import {ActivityIndicator} from 'react-native';

interface DailyFeedbackData {
    _id?: string;
    rating?: number;
    text?: string;
    voice_note_media_id?: string;
    submitted_at?: string;
    created_at?: string;
}

interface WeekDay {
    date: Date;
    dayName: string;
    dayNumber: string;
    feedback: DailyFeedbackData | null;
}

export default function DailyFeedbackScreen() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [satisfactionRating, setSatisfactionRating] = useState<number>(0);
    const [wellbeingRating, setWellbeingRating] = useState<number>(0);
    const [inputType, setInputType] = useState<'text' | 'voice'>('voice');
    const [feedbackText, setFeedbackText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordingDuration, setRecordingDuration] = useState<number>(0);
    const [recordedUri, setRecordedUri] = useState<string | null>(null);
    const [showDeleteRecordingConfirm, setShowDeleteRecordingConfirm] = useState(false);
    const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Get current week dates
    const getCurrentWeekDates = useCallback(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(today);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return {weekStart, weekEnd};
    }, []);

    // Load daily feedback for the week
    const loadWeekFeedback = useCallback(async () => {
        try {
            setLoading(true);
            const {weekStart, weekEnd} = getCurrentWeekDates();

            const feedbacks = await getDailyFeedback(
                weekStart.toISOString(),
                weekEnd.toISOString()
            ) || [];

            // Create week days array
            const days: WeekDay[] = [];
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                date.setHours(0, 0, 0, 0);

                // Find feedback for this date
                const feedback = feedbacks.find((fb: DailyFeedbackData) => {
                    if (!fb.submitted_at) return false;
                    const fbDate = new Date(fb.submitted_at);
                    fbDate.setHours(0, 0, 0, 0);
                    return fbDate.getTime() === date.getTime();
                }) || null;

                days.push({
                    date,
                    dayName: dayNames[date.getDay()],
                    dayNumber: date.getDate().toString(),
                    feedback,
                });
            }

            setWeekDays(days);
        } catch (error: any) {
            console.error('Error loading week feedback:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to load daily feedback',
                position: 'top',
            });
        } finally {
            setLoading(false);
        }
    }, [getCurrentWeekDates]);

    // Load feedback for selected date
    const loadSelectedDateFeedback = useCallback(() => {
        const selectedDay = weekDays.find(day => {
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            const selectedDateOnly = new Date(selectedDate);
            selectedDateOnly.setHours(0, 0, 0, 0);
            return dayDate.getTime() === selectedDateOnly.getTime();
        });

        if (selectedDay?.feedback) {
            const fb = selectedDay.feedback;
            if (fb.rating) {
                setSatisfactionRating(fb.rating);
                setWellbeingRating(fb.rating); // Using same rating for both for now
            }
            if (fb.text) {
                setFeedbackText(fb.text);
                setInputType('text');
            }
            if (fb.voice_note_media_id) {
                setInputType('voice');
            }
        } else {
            // Reset form if no feedback
            setSatisfactionRating(0);
            setWellbeingRating(0);
            setFeedbackText('');
            setRecordedUri(null);
            setRecordingDuration(0);
        }
    }, [weekDays, selectedDate]);

    useEffect(() => {
        loadWeekFeedback();
    }, [loadWeekFeedback]);

    useEffect(() => {
        loadSelectedDateFeedback();
    }, [selectedDate, weekDays]);

    useEffect(() => {
        // Request audio permissions on mount (optional, will be requested again before recording)
        (async () => {
            try {
                await Audio.requestPermissionsAsync();
            } catch (err) {
                console.error('Failed to get audio permissions', err);
            }
        })();
    }, []);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
        };
    }, [recording]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } else {
            if (interval) clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording]);

    const handleSatisfactionStarPress = (index: number) => {
        setSatisfactionRating(index + 1);
    };

    const handleWellbeingStarPress = (index: number) => {
        setWellbeingRating(index + 1);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            // Request permissions and set audio mode right before recording
            const permissionResponse = await Audio.requestPermissionsAsync();

            if (permissionResponse.status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant microphone permission to record audio.',
                    [{text: 'OK'}]
                );
                return;
            }

            // Set audio mode before creating recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            const {recording: newRecording} = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);
            setRecordingDuration(0);
            setRecordedUri(null);
        } catch (err: any) {
            console.error('Failed to start recording', err);
            Alert.alert(
                'Recording Error',
                err.message || 'Failed to start recording. Please try again.',
                [{text: 'OK'}]
            );
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecordedUri(uri);
            setRecording(null);
        } catch (err) {
            console.error('Failed to stop recording', err);
            Alert.alert('Error', 'Failed to stop recording');
        }
    };

    const handleRecordPress = async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    const handleDeleteRecording = () => {
        setShowDeleteRecordingConfirm(true);
    };

    const confirmDeleteRecording = () => {
        setRecordedUri(null);
        setRecordingDuration(0);
        setShowDeleteRecordingConfirm(false);
    };

    const handleSubmit = async () => {
        try {
            // Validation
            if (!feedbackText.trim() && !recordedUri && satisfactionRating === 0 && wellbeingRating === 0) {
                Alert.alert(
                    'Validation Error',
                    'Please provide at least a rating or feedback (text or voice).',
                    [{text: 'OK'}]
                );
                return;
            }

            setSubmitting(true);

            // TODO: Upload voice note if recordedUri exists and get media_id
            if (inputType === 'voice' && recordedUri) {
                Alert.alert(
                    'Voice Recording',
                    'Voice recording upload is not yet implemented. Please use text feedback for now.',
                    [{text: 'OK'}]
                );
                setSubmitting(false);
                return;
            }

            // Use satisfaction rating as the main rating (or average if both are set)
            const rating = satisfactionRating > 0 ? satisfactionRating : wellbeingRating;

            await submitDailyFeedback({
                rating: rating > 0 ? rating : undefined,
                text: inputType === 'text' ? feedbackText : undefined,
                voice_note_media_id: inputType === 'voice' && recordedUri ? undefined : undefined, // TODO: Add when voice upload is implemented
            });

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Daily feedback submitted successfully',
                position: 'top',
            });

            // Reload week feedback
            await loadWeekFeedback();
        } catch (error: any) {
            console.error('Error submitting feedback:', error);
            Alert.alert(
                'Submission Error',
                error.message || 'Failed to submit feedback. Please try again.',
                [{text: 'OK'}]
            );
        } finally {
            setSubmitting(false);
        }
    };

    const isSelectedDate = (day: WeekDay) => {
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        const selectedDateOnly = new Date(selectedDate);
        selectedDateOnly.setHours(0, 0, 0, 0);
        return dayDate.getTime() === selectedDateOnly.getTime();
    };

    return (
        <AppWrapper headerTitle="Feedback" headerVariant="default">
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Daily Feedback Button */}
                <TouchableOpacity style={styles.feedbackTypeButton}>
                    <Text style={styles.feedbackTypeText}>Daily Feedback</Text>
                </TouchableOpacity>

                {/* Week View */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#F6B8A3"/>
                        <Text style={styles.loadingText}>Loading week feedback...</Text>
                    </View>
                ) : (
                    <View style={styles.weekContainer}>
                        <Text style={styles.weekTitle}>This Week</Text>
                        <View style={styles.weekDaysContainer}>
                            {weekDays.map((day, index) => {
                                const isSelected = isSelectedDate(day);
                                const hasFeedback = day.feedback !== null;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dayButton,
                                            isSelected && styles.dayButtonSelected,
                                            hasFeedback && styles.dayButtonHasFeedback,
                                        ]}
                                        onPress={() => setSelectedDate(new Date(day.date))}
                                    >
                                        <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                                            {day.dayName}
                                        </Text>
                                        <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                                            {day.dayNumber}
                                        </Text>
                                        {hasFeedback && (
                                            <View style={styles.feedbackIndicator}>
                                                <Feather name="check-circle" size={12} color="#10B981"/>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <Text style={styles.selectedDateText}>
                            {selectedDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </Text>
                    </View>
                )}

                {/* Feedback Form Card */}
                <View style={styles.formCard}>
                    {/* Satisfaction Section */}
                    <View style={styles.ratingSection}>
                        <View style={styles.ratingHeader}>
                            <MaterialIcons name="star-outline" size={20} color="#1A1D1F"/>
                            <Text style={styles.ratingTitle}>Satisfaction</Text>
                        </View>
                        <Text style={styles.question}>
                            How satisfied are you with your balance today?
                        </Text>
                        <View style={styles.starRatingContainer}>
                            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleSatisfactionStarPress(index)}
                                    style={styles.starButton}
                                >
                                    {satisfactionRating > index ? (
                                        <MaterialIcons name="star" size={24} color="#F6B8A3"/>
                                    ) : (
                                        <MaterialIcons name="star-border" size={24} color="#E5E7EB"/>
                                    )}
                                </TouchableOpacity>
                            ))}
                            {satisfactionRating === 0 && (
                                <Text style={styles.naText}>N/A</Text>
                            )}
                        </View>
                        {satisfactionRating > 0 && (
                            <Text style={styles.ratingLabel}>
                                {satisfactionRating === 1 ? 'Poor' : satisfactionRating === 2 ? 'Fair' : satisfactionRating === 3 ? 'Average' : satisfactionRating === 4 ? 'Good' : satisfactionRating === 5 ? 'Very Good' : satisfactionRating === 6 ? 'Excellent' : 'Outstanding'}
                            </Text>
                        )}
                    </View>

                    {/* Well-being Section */}
                    <View style={styles.ratingSection}>
                        <View style={styles.ratingHeader}>
                            <MaterialIcons name="star-outline" size={20} color="#1A1D1F"/>
                            <Text style={styles.ratingTitle}>Well-being</Text>
                        </View>
                        <Text style={styles.question}>
                            How did you feel overall today?
                        </Text>
                        <View style={styles.starRatingContainer}>
                            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleWellbeingStarPress(index)}
                                    style={styles.starButton}
                                >
                                    {wellbeingRating > index ? (
                                        <MaterialIcons name="star" size={24} color="#F6B8A3"/>
                                    ) : (
                                        <MaterialIcons name="star-border" size={24} color="#E5E7EB"/>
                                    )}
                                </TouchableOpacity>
                            ))}
                            {wellbeingRating === 0 && (
                                <Text style={styles.naText}>N/A</Text>
                            )}
                        </View>
                        {wellbeingRating > 0 && (
                            <Text style={styles.ratingLabel}>
                                {wellbeingRating === 1 ? 'Poor' : wellbeingRating === 2 ? 'Fair' : wellbeingRating === 3 ? 'Average' : wellbeingRating === 4 ? 'Good' : wellbeingRating === 5 ? 'Very Good' : wellbeingRating === 6 ? 'Excellent' : 'Outstanding'}
                            </Text>
                        )}
                    </View>

                    {/* Input Type Toggle */}
                    <View style={styles.inputTypeContainer}>
                        <TouchableOpacity
                            style={[
                                styles.inputTypeButton,
                                inputType === 'text' && styles.inputTypeButtonSelected,
                            ]}
                            onPress={() => setInputType('text')}
                        >
                            <Text
                                style={[
                                    styles.inputTypeText,
                                    inputType === 'text' && styles.inputTypeTextSelected,
                                ]}
                            >
                                Text
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.inputTypeButton,
                                inputType === 'voice' && styles.inputTypeButtonSelected,
                            ]}
                            onPress={() => setInputType('voice')}
                        >
                            <Text
                                style={[
                                    styles.inputTypeText,
                                    inputType === 'voice' && styles.inputTypeTextSelected,
                                ]}
                            >
                                Voice
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Text Input Field or Voice Recording */}
                    {inputType === 'text' ? (
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Type your feedback"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={6}
                                value={feedbackText}
                                onChangeText={setFeedbackText}
                                textAlignVertical="top"
                            />
                        </View>
                    ) : (
                        <View style={styles.voiceContainer}>
                            <TouchableOpacity
                                style={styles.voiceButton}
                                onPress={handleRecordPress}
                                activeOpacity={0.8}
                            >
                                <View
                                    style={[
                                        styles.voiceButtonOuter,
                                        isRecording && styles.voiceButtonOuterRecording,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.voiceButtonMiddle,
                                            isRecording && styles.voiceButtonMiddleRecording,
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.voiceButtonInner,
                                                isRecording && styles.voiceButtonInnerRecording,
                                            ]}
                                        >
                                            {isRecording ? (
                                                <Feather name="square" size={32} color="#8B4513"/>
                                            ) : (
                                                <Feather name="mic" size={48} color="#8B4513"/>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                            {(isRecording || recordedUri) && (
                                <View style={styles.recordingInfo}>
                                    {isRecording && (
                                        <Text style={styles.recordingText}>
                                            Recording... {formatTime(recordingDuration)}
                                        </Text>
                                    )}
                                    {recordedUri && !isRecording && (
                                        <View style={styles.recordedActions}>
                                            <Text style={styles.recordedText}>
                                                Recorded ({formatTime(recordingDuration)})
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={handleDeleteRecording}
                                            >
                                                <Feather name="trash-2" size={18} color="#EF4444"/>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#1A1D1F"/>
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {weekDays.find(d => isSelectedDate(d))?.feedback ? 'Update Feedback' : 'Submit'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Delete Recording Confirmation Dialog */}
            <ConfirmDialog
                visible={showDeleteRecordingConfirm}
                title="Delete Recording"
                message="Are you sure you want to delete this recording? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDeleteRecording}
                onCancel={() => setShowDeleteRecordingConfirm(false)}
                type="danger"
            />
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
        paddingBottom: 40,
    },
    feedbackTypeButton: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        alignItems: 'center',
    },
    feedbackTypeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    question: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    subQuestion: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    starRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 8,
    },
    starButton: {
        padding: 4,
    },
    naText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginLeft: 8,
    },
    inputTypeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    inputTypeButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    inputTypeButtonSelected: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    inputTypeText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    inputTypeTextSelected: {
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 24,
    },
    textInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1A1D1F',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minHeight: 120,
    },
    voiceContainer: {
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    voiceButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    voiceButtonOuter: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#f9f4f2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#f9f4f2',
    },
    voiceButtonMiddle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#f9f4f2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#f9f4f2',
    },
    voiceButtonInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    voiceButtonOuterRecording: {
        borderColor: '#F6B8A3',
        backgroundColor: '#F6B8A3',
    },
    voiceButtonMiddleRecording: {
        borderColor: '#F6B8A3',
        backgroundColor: '#F6B8A3',
    },
    voiceButtonInnerRecording: {
        backgroundColor: '#fff',
    },
    recordingInfo: {
        marginTop: 20,
        alignItems: 'center',
    },
    recordingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
    recordedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    recordedText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#10B981',
    },
    deleteButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FEE2E2',
    },
    submitButton: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    ratingSection: {
        marginBottom: 32,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    ratingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    ratingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    ratingLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        marginBottom: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    weekContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    weekTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 16,
    },
    weekDaysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    dayButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginHorizontal: 2,
        position: 'relative',
    },
    dayButtonSelected: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    dayButtonHasFeedback: {
        borderColor: '#10B981',
    },
    dayName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 4,
    },
    dayNameSelected: {
        color: '#1A1D1F',
        fontWeight: '600',
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    dayNumberSelected: {
        color: '#1A1D1F',
    },
    feedbackIndicator: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    selectedDateText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
});

