import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {ConfirmDialog} from '@/app/component/ConfirmDialog';
import {Feather, MaterialIcons} from '@expo/vector-icons';
import {useState, useEffect, useCallback} from 'react';
import {Audio} from 'expo-av';
import {getPatientTasks, Task} from '@/services/dashboardService';
import {getTaskLabels, TaskLabel} from '@/services/templateService';
import {submitAreaOfLifeFeedback, getAreaOfLifeFeedback} from '@/services/api';
import Toast from 'react-native-toast-message';

interface TaskWithStatus extends Task {
    feedbackStatus: 'done' | 'not-done' | null;
    labelName?: string;
    labelColor?: string;
    formattedTime?: string;
    formattedDate?: string;
}

export default function AreaOfLifeFeedbackScreen() {
    const [rating, setRating] = useState<number>(0);
    const [inputType, setInputType] = useState<'text' | 'voice'>('text');
    const [feedbackText, setFeedbackText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordingDuration, setRecordingDuration] = useState<number>(0);
    const [recordedUri, setRecordedUri] = useState<string | null>(null);
    const [showDeleteRecordingConfirm, setShowDeleteRecordingConfirm] = useState(false);

    // Task list state
    const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
    const [labels, setLabels] = useState<TaskLabel[]>([]);
    const [loading, setLoading] = useState(true);
    const [existingFeedback, setExistingFeedback] = useState<any>(null);
    const [loadingFeedback, setLoadingFeedback] = useState(true);

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

    // Load existing feedback for current week
    const loadExistingFeedback = useCallback(async () => {
        try {
            setLoadingFeedback(true);
            const {weekStart, weekEnd} = getCurrentWeekDates();

            const feedback = await getAreaOfLifeFeedback(
                weekStart.toISOString(),
                weekEnd.toISOString()
            );

            if (feedback) {
                setExistingFeedback(feedback);
                // Populate form with existing feedback
                if (feedback.rating) {
                    setRating(feedback.rating);
                }
                if (feedback.text) {
                    setFeedbackText(feedback.text);
                    setInputType('text');
                }
                if (feedback.voice_note_media_id) {
                    setInputType('voice');
                    // Note: We can't load the actual voice file URL here, but we can show it was recorded
                }
            } else {
                setExistingFeedback(null);
            }
        } catch (error: any) {
            console.error('Error loading existing feedback:', error);
            // Don't show error toast - it's okay if no feedback exists yet
            setExistingFeedback(null);
        } finally {
            setLoadingFeedback(false);
        }
    }, [getCurrentWeekDates]);

    // Load tasks and labels
    const loadTasks = useCallback(async () => {
        try {
            setLoading(true);
            const {weekStart, weekEnd} = getCurrentWeekDates();

            // Load tasks and labels in parallel
            const [allTasks, allLabels] = await Promise.all([
                getPatientTasks(),
                getTaskLabels(),
            ]);

            setLabels(allLabels);

            // Filter tasks for current week
            const weekTasks = allTasks.filter((task) => {
                if (!task.time_line?.start) return false;
                const taskDate = new Date(task.time_line.start);
                return taskDate >= weekStart && taskDate <= weekEnd;
            });

            // Format tasks with label info and time/date
            const formattedTasks: TaskWithStatus[] = weekTasks.map((task) => {
                const label = allLabels.find(
                    (l) => String(l._id || l.id) === String(task.label_id)
                );

                // Format time
                let formattedTime = '';
                if (task.time_line?.start) {
                    const startDate = new Date(task.time_line.start);
                    const startHours = startDate.getHours();
                    const startMins = startDate.getMinutes();
                    const startAmPm = startHours >= 12 ? 'PM' : 'AM';
                    const startHour12 = startHours % 12 || 12;
                    const startTimeStr = `${startHour12}:${startMins.toString().padStart(2, '0')} ${startAmPm}`;

                    if (task.time_line?.end) {
                        const endDate = new Date(task.time_line.end);
                        const endHours = endDate.getHours();
                        const endMins = endDate.getMinutes();
                        const endAmPm = endHours >= 12 ? 'PM' : 'AM';
                        const endHour12 = endHours % 12 || 12;
                        const endTimeStr = `${endHour12}:${endMins.toString().padStart(2, '0')} ${endAmPm}`;
                        formattedTime = `${startTimeStr} - ${endTimeStr}`;
                    } else {
                        formattedTime = startTimeStr;
                    }
                }

                // Format date
                let formattedDate = '';
                if (task.time_line?.start) {
                    const taskDate = new Date(task.time_line.start);
                    formattedDate = taskDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                    });
                }

                return {
                    ...task,
                    feedbackStatus: null, // Will be set from existing feedback or by user
                    labelName: label?.name || label?.title || 'Unlabeled',
                    labelColor: label?.color || '#9CA3AF',
                    formattedTime,
                    formattedDate,
                };
            });

            // Sort by date and time
            formattedTasks.sort((a, b) => {
                if (!a.time_line?.start || !b.time_line?.start) return 0;
                return new Date(a.time_line.start).getTime() - new Date(b.time_line.start).getTime();
            });

            setTasks(formattedTasks);
        } catch (error: any) {
            console.error('Error loading tasks:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to load tasks',
                position: 'top',
            });
        } finally {
            setLoading(false);
        }
    }, [getCurrentWeekDates]);

    useEffect(() => {
        // Load existing feedback first, then tasks
        loadExistingFeedback();
        loadTasks();
    }, [loadExistingFeedback, loadTasks]);

    // Apply existing feedback to tasks when both are loaded
    useEffect(() => {
        if (existingFeedback && tasks.length > 0 && existingFeedback.task_statuses) {
            setTasks((prevTasks) =>
                prevTasks.map((task) => {
                    const existingStatus = existingFeedback.task_statuses.find(
                        (ts: any) => String(ts.task_id?._id || ts.task_id) === String(task._id)
                    );
                    return {
                        ...task,
                        feedbackStatus: existingStatus ? existingStatus.status : null,
                    };
                })
            );
        }
    }, [existingFeedback, tasks.length]);

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

    const handleStarPress = (index: number) => {
        setRating(index + 1);
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

    const handleTaskStatusChange = (taskId: string, status: 'done' | 'not-done') => {
        setTasks((prevTasks) =>
            prevTasks.map((task) =>
                task._id === taskId ? {...task, feedbackStatus: status} : task
            )
        );
    };

    const handleSubmit = async () => {
        try {
            // Validate that at least one task has a status or feedback is provided
            const hasTaskStatuses = tasks.some(t => t.feedbackStatus !== null);
            const hasFeedback = feedbackText.trim().length > 0 || recordedUri !== null;

            if (!hasTaskStatuses && !hasFeedback) {
                Alert.alert(
                    'Validation Error',
                    'Please provide feedback (text or voice) or mark at least one task as done/not done.',
                    [{text: 'OK'}]
                );
                return;
            }

            // Prepare task statuses
            const taskStatuses = tasks
                .filter(t => t.feedbackStatus !== null)
                .map(t => ({
                    task_id: t._id,
                    status: t.feedbackStatus!,
                }));

            // TODO: Upload voice note if recordedUri exists and get media_id
            // For now, we'll submit without voice_note_media_id if it's voice type
            const submitData: any = {
                rating: rating > 0 ? rating : undefined,
                text: inputType === 'text' ? feedbackText : undefined,
                task_statuses: taskStatuses.length > 0 ? taskStatuses : undefined,
            };

            // If voice recording exists, we need to upload it first
            // For now, skip voice_note_media_id until upload is implemented
            if (inputType === 'voice' && recordedUri) {
                Alert.alert(
                    'Voice Recording',
                    'Voice recording upload is not yet implemented. Please use text feedback for now.',
                    [{text: 'OK'}]
                );
                return;
            }

            await submitAreaOfLifeFeedback(submitData);

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: existingFeedback ? 'Area of Life feedback updated successfully' : 'Area of Life feedback submitted successfully',
                position: 'top',
            });

            // Reload existing feedback and tasks to get fresh data
            await Promise.all([loadExistingFeedback(), loadTasks()]);
        } catch (error: any) {
            console.error('Error submitting feedback:', error);
            Alert.alert(
                'Submission Error',
                error.message || 'Failed to submit feedback. Please try again.',
                [{text: 'OK'}]
            );
        }
    };

    return (
        <AppWrapper headerTitle="Feedback" headerVariant="default">
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Area of Life Feedback Button */}
                <TouchableOpacity style={styles.feedbackTypeButton}>
                    <View style={styles.feedbackTypeHeader}>
                        <Text style={styles.feedbackTypeText}>Area of Life Feedback</Text>
                        {existingFeedback && (
                            <View style={styles.submittedBadge}>
                                <Feather name="check-circle" size={16} color="#10B981"/>
                                <Text style={styles.submittedText}>Submitted</Text>
                            </View>
                        )}
                    </View>
                    {existingFeedback && existingFeedback.submitted_at && (
                        <Text style={styles.submittedDate}>
                            Submitted on {new Date(existingFeedback.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Feedback Form Card */}
                <View style={styles.formCard}>
                    {/* Question */}
                    <Text style={styles.question}>
                        Did you complete this task?
                    </Text>
                    <Text style={styles.subQuestion}>How do you feel about this task?</Text>

                    {/* Star Rating */}
                    <View style={styles.starRatingContainer}>
                        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleStarPress(index)}
                                style={styles.starButton}
                            >
                                {rating > index ? (
                                    <MaterialIcons name="star" size={24} color="#F6B8A3"/>
                                ) : (
                                    <MaterialIcons name="star-border" size={24} color="#E5E7EB"/>
                                )}
                            </TouchableOpacity>
                        ))}
                        {rating === 0 && (
                            <Text style={styles.naText}>N/A</Text>
                        )}
                    </View>

                    {/* Task List */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F6B8A3"/>
                            <Text style={styles.loadingText}>Loading tasks...</Text>
                        </View>
                    ) : tasks.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Feather name="clipboard" size={48} color="#9CA3AF"/>
                            <Text style={styles.emptyText}>No tasks for this week</Text>
                            <Text style={styles.emptySubtext}>
                                Create tasks to provide feedback
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.taskListContainer}>
                            {tasks.map((task) => (
                                <View key={task._id} style={styles.taskItem}>
                                    <View style={styles.taskInfo}>
                                        <View style={styles.taskHeader}>
                                            <View style={[styles.labelBadge, {backgroundColor: task.labelColor}]}>
                                                <Text style={styles.labelBadgeText}>{task.labelName}</Text>
                                            </View>
                                            {task.formattedDate && (
                                                <Text style={styles.taskDate}>{task.formattedDate}</Text>
                                            )}
                                        </View>
                                        {task.formattedTime && (
                                            <Text style={styles.taskTime}>{task.formattedTime}</Text>
                                        )}
                                        <Text style={styles.taskTitle}>{task.title}</Text>
                                    </View>
                                    <View style={styles.taskActions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.taskButton,
                                                styles.doneButton,
                                                task.feedbackStatus === 'done' && styles.taskButtonActive,
                                                task.feedbackStatus === 'done' && {
                                                    backgroundColor: '#10B981',
                                                    borderColor: '#10B981'
                                                },
                                            ]}
                                            onPress={() => handleTaskStatusChange(task._id, 'done')}
                                        >
                                            <Feather
                                                name="check"
                                                size={16}
                                                color={task.feedbackStatus === 'done' ? '#fff' : '#10B981'}
                                            />
                                            <Text
                                                style={[
                                                    styles.taskButtonText,
                                                    task.feedbackStatus === 'done' && styles.taskButtonTextActive,
                                                ]}
                                            >
                                                Done
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.taskButton,
                                                styles.notDoneButton,
                                                task.feedbackStatus === 'not-done' && styles.taskButtonActive,
                                                task.feedbackStatus === 'not-done' && {
                                                    backgroundColor: '#EF4444',
                                                    borderColor: '#EF4444'
                                                },
                                            ]}
                                            onPress={() => handleTaskStatusChange(task._id, 'not-done')}
                                        >
                                            <Feather
                                                name="x"
                                                size={16}
                                                color={task.feedbackStatus === 'not-done' ? '#fff' : '#EF4444'}
                                            />
                                            <Text
                                                style={[
                                                    styles.taskButtonText,
                                                    task.feedbackStatus === 'not-done' && styles.taskButtonTextActive,
                                                ]}
                                            >
                                                Not Done
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

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
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#1A1D1F"/>
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {existingFeedback ? 'Update Feedback' : 'Submit'}
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
    },
    feedbackTypeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    feedbackTypeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    submittedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    submittedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    submittedDate: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
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
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    taskListContainer: {
        gap: 12,
        marginBottom: 24,
    },
    taskItem: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    taskInfo: {
        marginBottom: 12,
    },
    taskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    labelBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    labelBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    taskDate: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },
    taskTime: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 6,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        marginBottom: 24,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    taskActions: {
        flexDirection: 'row',
        gap: 8,
    },
    taskButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
    },
    doneButton: {
        backgroundColor: '#fff',
        borderColor: '#10B981',
    },
    notDoneButton: {
        backgroundColor: '#fff',
        borderColor: '#EF4444',
    },
    taskButtonActive: {
        // This will be overridden by specific button styles
    },
    taskButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    taskButtonTextActive: {
        color: '#fff',
    },
});

