import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    Image,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useRouter, useLocalSearchParams} from 'expo-router';
import {useState, useEffect} from 'react';
import {getPatientTaskById, Task, formatTaskTime, getStatusLabel, getStatusColor} from '@/services/dashboardService';
import {deletePatientTask, updatePatientTask} from '@/services/api';
import Toast from 'react-native-toast-message';
import {ConfirmDialog} from '@/app/component/ConfirmDialog';

export default function TaskDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const taskId = params.id as string;

    const [task, setTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        if (taskId) {
            loadTask();
        }
    }, [taskId]);

    const loadTask = async () => {
        try {
            setIsLoading(true);
            const fetchedTask = await getPatientTaskById(taskId);
            if (fetchedTask) {
                setTask(fetchedTask);
            } else {
                Alert.alert(
                    'Error',
                    'Task not found',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back(),
                        },
                    ]
                );
            }
        } catch (error: any) {
            console.error('Error loading task:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to load task details',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deletePatientTask(taskId);

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Task deleted successfully',
                position: 'top',
            });

            // Navigate back after a short delay
            setTimeout(() => {
                router.back();
            }, 500);
        } catch (error: any) {
            console.error('Error deleting task:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to delete task'
            );
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleEdit = () => {
        // Navigate to edit task screen (you can create this later)
        router.push(`/(tabs)/tasks/create-task?taskId=${taskId}&mode=edit`);
    };

    const handleReschedule = () => {
        // Navigate to reschedule screen (similar to edit but focused on date/time)
        router.push(`/(tabs)/tasks/create-task?taskId=${taskId}&mode=reschedule`);
    };

    const handleRemove = () => {
        setShowDeleteConfirm(true);
    };

    const handleReuse = async () => {
        if (!task || task.status !== 'COMPLETED') return;

        try {
            // Create a new task based on the completed one
            const newTaskData = {
                title: task.title,
                sections: task.sections,
                time_line: {
                    start: new Date().toISOString(), // Start now or set a future date
                    end: task.time_line?.end ? new Date(new Date().getTime() + (new Date(task.time_line.end).getTime() - new Date(task.time_line.start || new Date()).getTime())).toISOString() : undefined,
                },
                status: 'PENDING',
                user_id: task.user_id,
            };

            // You'll need to implement createPatientTask or use the API
            Alert.alert('Info', 'Reuse functionality will create a new task based on this one.');
        } catch (error: any) {
            console.error('Error reusing task:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to reuse task',
                position: 'top',
            });
        }
    };

    const handleStartTask = async () => {
        await handleStatusChange('IN_PROGRESS');
    };

    const handleCompleteTask = async () => {
        await handleStatusChange('COMPLETED');
    };

    const handleStatusChange = async (newStatus: 'COMPLETED' | 'IN_PROGRESS' | 'ON_HOLD' | 'PENDING') => {
        if (!task || isUpdatingStatus) return;

        try {
            setIsUpdatingStatus(true);

            // Update task status using the API
            const updateData = {
                status: newStatus,
            };

            console.log('Updating task status:', {taskId, updateData});

            const updatedTask = await updatePatientTask(taskId, updateData);

            // Reload task to get latest data from server
            await loadTask();

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: newStatus === 'COMPLETED' ? 'Task completed!' : 'Task started!',
                position: 'top',
            });
        } catch (error: any) {
            console.error('Error updating task status:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            // Extract error message
            let errorMessage = 'Failed to update task status';
            if (error?.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error?.error) {
                errorMessage = error.error;
            }

            // Check for permission errors
            if (errorMessage.includes('Permission') || errorMessage.includes('Unauthorized')) {
                errorMessage = 'You do not have permission to update this task';
            } else if (errorMessage.includes('wrapper')) {
                errorMessage = 'Server error. Please try again later.';
            }

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: errorMessage,
                position: 'top',
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const handleEmail = (email: string) => {
        Linking.openURL(`mailto:${email}`);
    };

    const getLabelName = (task: Task): string => {
        if ((task as any).label?.title) {
            return (task as any).label.title;
        } else if (task.sections?.[0]?.name) {
            return task.sections[0].name;
        }
        return 'Task';
    };

    const getLabelColor = (labelName: string): string => {
        const labelColors: { [key: string]: string } = {
            'Partner': '#E9D5FF',
            'Family': '#FEF3C7',
            'Career': '#FCE7F3',
            'Fitness': '#D1FAE5',
            'Friends': '#DBEAFE',
            'Relaxation': '#FEF3C7',
        };
        return labelColors[labelName] || '#E9D5FF';
    };

    const getGoalText = (task: Task): string => {
        const goalSection = task.sections?.find(s => s.name === 'Goals' || s.type === 'goal');
        return goalSection?.short_description || goalSection?.value || '';
    };

    const getChallengeText = (task: Task): string => {
        const challengeSection = task.sections?.find(s => s.name === 'Challenges' || s.type === 'challenge');
        return challengeSection?.short_description || challengeSection?.value || '';
    };

    const isTaskMissed = (task: Task): boolean => {
        if (task.status === 'COMPLETED') {
            return false;
        }
        if (!task.time_line?.start) {
            return false;
        }
        const now = new Date();
        const taskEndDate = task.time_line?.end
            ? new Date(task.time_line.end)
            : new Date(task.time_line.start);
        return taskEndDate < now;
    };

    const getTaskType = (task: Task): 'Goal' | 'Challenge' => {
        // Check if task has Goals section or goal_ids
        const hasGoals = getGoalText(task) || (task.goal_ids && task.goal_ids.length > 0);
        // Check if task has Challenges section or challenge_ids
        const hasChallenges = getChallengeText(task) || (task.challenge_ids && task.challenge_ids.length > 0);

        // If it has goals but no challenges, it's a Goal
        if (hasGoals && !hasChallenges) {
            return 'Goal';
        }
        // If it has challenges but no goals, it's a Challenge
        if (hasChallenges && !hasGoals) {
            return 'Challenge';
        }
        // If it has both or neither, default to Goal (or you could check goal_ids vs challenge_ids)
        if (hasGoals) return 'Goal';
        if (hasChallenges) return 'Challenge';
        // Default fallback
        return 'Goal';
    };

    const getMitigationText = (task: Task): string => {
        return (task as any).mitigation || '';
    };

    const getContactEmail = (task: Task): string => {
        return (task as any).contacts?.email || '';
    };

    const getContactPhone = (task: Task): string => {
        return (task as any).contacts?.phone || '';
    };

    const getAttachment = (task: Task): { name: string; uri?: string; mimeType?: string } | null => {
        if (!task.sections || task.sections.length === 0) {
            return null;
        }

        const attachmentSection = task.sections.find(s =>
            s.name === 'Attachment' ||
            s.type === 'attachment' ||
            (s.name && s.name.toLowerCase().includes('attachment'))
        );

        if (!attachmentSection) {
            console.log('No attachment section found. Available sections:', task.sections.map(s => ({
                name: s.name,
                type: s.type
            })));
            return null;
        }

        console.log('Attachment section found:', {
            name: attachmentSection.name,
            type: attachmentSection.type,
            short_description: attachmentSection.short_description,
            value: attachmentSection.value,
            valueType: typeof attachmentSection.value,
        });

        // Handle object value (most common case)
        if (typeof attachmentSection.value === 'object' && attachmentSection.value !== null) {
            const value = attachmentSection.value as any;
            return {
                name: value.name || attachmentSection.short_description || 'Attachment',
                uri: value.uri || value.url || value.link,
                mimeType: value.mimeType || value.contentType || value.type,
            };
        }

        // Handle string value (fallback)
        if (typeof attachmentSection.value === 'string') {
            return {
                name: attachmentSection.short_description || attachmentSection.value || 'Attachment',
            };
        }

        // Fallback to short_description
        if (attachmentSection.short_description) {
            return {
                name: attachmentSection.short_description,
            };
        }

        return null;
    };

    if (isLoading) {
        return (
            <AppWrapper headerTitle="Task Details" headerVariant="default">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F6B8A3"/>
                    <Text style={styles.loadingText}>Loading task details...</Text>
                </View>
            </AppWrapper>
        );
    }

    if (!task) {
        return (
            <AppWrapper headerTitle="Task Details" headerVariant="default">
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={48} color="#EF4444"/>
                    <Text style={styles.errorText}>Task not found</Text>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </AppWrapper>
        );
    }

    const labelName = getLabelName(task);
    const labelColor = getLabelColor(labelName);
    const goalText = getGoalText(task);
    const challengeText = getChallengeText(task);
    const mitigationText = getMitigationText(task);
    const contactEmail = getContactEmail(task);
    const contactPhone = getContactPhone(task);
    const attachment = getAttachment(task);
    const taskType = getTaskType(task);
    const statusColor = getStatusColor(task.status, task);
    const statusLabel = getStatusLabel(task.status, task);
    const isMissed = isTaskMissed(task);
    const isUpcoming = task.status === 'PENDING' && !isMissed;
    const isInProgress = task.status === 'IN_PROGRESS';
    const isCompleted = task.status === 'COMPLETED';

    return (
        <AppWrapper headerTitle="Task Details" headerVariant="default">
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Task Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerTop}>
                        <View style={styles.typeContainer}>
                            <Feather
                                name={taskType === 'Goal' ? 'target' : 'award'}
                                size={16}
                                color="#1A1D1F"
                            />
                            <Text style={styles.typeText}>{taskType}</Text>
                        </View>
                        <View style={[styles.labelTag, {backgroundColor: labelColor}]}>
                            <Text style={styles.labelText}>{labelName}</Text>
                        </View>
                    </View>
                    <Text style={styles.taskName}>{task.title || 'Untitled Task'}</Text>

                    {/* Status Badge */}
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
                            <View style={[styles.statusDot, {backgroundColor: statusColor}]}/>
                            <Text style={[styles.statusText, {color: statusColor}]}>
                                {statusLabel}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons - Based on Status */}
                {isMissed && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rescheduleButton]}
                            onPress={handleReschedule}
                        >
                            <Feather name="calendar" size={18} color="#1A1D1F"/>
                            <Text style={styles.actionButtonText}>Reschedule</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={handleRemove}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#fff"/>
                            ) : (
                                <>
                                    <Feather name="trash-2" size={18} color="#fff"/>
                                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Remove</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {isUpcoming && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rescheduleButton]}
                            onPress={handleReschedule}
                        >
                            <Feather name="calendar" size={18} color="#1A1D1F"/>
                            <Text style={styles.actionButtonText}>Reschedule</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={handleEdit}
                        >
                            <Feather name="edit-2" size={18} color="#1A1D1F"/>
                            <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={handleRemove}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#fff"/>
                            ) : (
                                <>
                                    <Feather name="trash-2" size={18} color="#fff"/>
                                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Remove</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {isInProgress && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.reuseButton]}
                            onPress={handleReuse}
                            disabled={true}
                        >
                            <Feather name="refresh-cw" size={18} color="#9CA3AF"/>
                            <Text style={[styles.actionButtonText, styles.disabledButtonText]}>Reuse</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={handleRemove}
                            disabled={true}
                        >
                            <Feather name="trash-2" size={18} color="#9CA3AF"/>
                            <Text
                                style={[styles.actionButtonText, styles.deleteButtonText, styles.disabledDeleteButtonText]}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Quick Actions - Based on Status */}
                {isUpcoming && (
                    <View style={styles.quickActions}>
                        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                        <TouchableOpacity
                            style={[
                                styles.quickActionButton,
                                isUpdatingStatus && styles.quickActionButtonDisabled,
                            ]}
                            onPress={handleStartTask}
                            disabled={isUpdatingStatus}
                        >
                            {isUpdatingStatus ? (
                                <ActivityIndicator size="small" color="#2196F3"/>
                            ) : (
                                <Feather name="play-circle" size={20} color="#2196F3"/>
                            )}
                            <Text style={styles.quickActionButtonText}>
                                {isUpdatingStatus ? 'Starting...' : 'Start Task'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isInProgress && (
                    <View style={styles.quickActions}>
                        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                        <TouchableOpacity
                            style={[
                                styles.quickActionButton,
                                isUpdatingStatus && styles.quickActionButtonDisabled,
                            ]}
                            onPress={handleCompleteTask}
                            disabled={isUpdatingStatus}
                        >
                            {isUpdatingStatus ? (
                                <ActivityIndicator size="small" color="#4CAF50"/>
                            ) : (
                                <Feather name="check-circle" size={20} color="#4CAF50"/>
                            )}
                            <Text style={styles.quickActionButtonText}>
                                {isUpdatingStatus ? 'Completing...' : 'Complete Task'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Date & Time Section */}
                {task.time_line?.start && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="calendar" size={20} color="#8B4513"/>
                            <Text style={styles.sectionTitle}>Date & Time</Text>
                        </View>
                        <Text style={styles.descriptionText}>
                            {formatTaskTime(task)}
                        </Text>
                    </View>
                )}

                {/* Goals Section */}
                {goalText && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="target" size={20} color="#8B4513"/>
                            <Text style={styles.sectionTitle}>Goals</Text>
                        </View>
                        <Text style={styles.descriptionText}>{goalText}</Text>
                    </View>
                )}

                {/* Challenges Section */}
                {challengeText && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="alert-circle" size={20} color="#8B4513"/>
                            <Text style={styles.sectionTitle}>Challenges</Text>
                        </View>
                        <Text style={styles.descriptionText}>{challengeText}</Text>
                    </View>
                )}

                {/* Mitigations Section */}
                {mitigationText && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="shield" size={20} color="#8B4513"/>
                            <Text style={styles.sectionTitle}>Mitigations</Text>
                        </View>
                        <Text style={styles.descriptionText}>{mitigationText}</Text>
                    </View>
                )}

                {/* Contact Information */}
                {(contactEmail || contactPhone) && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="user" size={20} color="#8B4513"/>
                            <Text style={styles.sectionTitle}>Contact Information</Text>
                        </View>
                        {contactEmail && (
                            <TouchableOpacity
                                style={styles.infoRow}
                                onPress={() => handleEmail(contactEmail)}
                            >
                                <Feather name="mail" size={16} color="#6B7280"/>
                                <Text style={styles.infoValue}>{contactEmail}</Text>
                                <Feather name="external-link" size={14} color="#6B7280"/>
                            </TouchableOpacity>
                        )}
                        {contactPhone && (
                            <TouchableOpacity
                                style={styles.infoRow}
                                onPress={() => handleCall(contactPhone)}
                            >
                                <Feather name="phone" size={16} color="#6B7280"/>
                                <Text style={styles.infoValue}>{contactPhone}</Text>
                                <Feather name="external-link" size={14} color="#6B7280"/>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Attachment Section */}
                {attachment && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="paperclip" size={20} color="#8B4513"/>
                            <Text style={styles.sectionTitle}>Attachment</Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                if (attachment.uri) {
                                    Linking.openURL(attachment.uri).catch((err) => {
                                        console.error('Error opening attachment:', err);
                                        Alert.alert('Error', 'Could not open attachment');
                                    });
                                }
                            }}
                            disabled={!attachment.uri}
                        >
                            {attachment.mimeType?.startsWith('image/') && attachment.uri ? (
                                <View style={styles.imagePreviewContainer}>
                                    <Image
                                        source={{uri: attachment.uri}}
                                        style={styles.attachmentPreviewImage}
                                        resizeMode="cover"
                                        onError={() => {
                                            console.error('Failed to load image:', attachment.uri);
                                        }}
                                    />
                                    <View style={styles.imageOverlay}>
                                        <View style={styles.imageInfo}>
                                            <Text style={styles.imageFileName} numberOfLines={1}>
                                                {attachment.name}
                                            </Text>
                                            <View style={styles.openImageButton}>
                                                <Feather name="external-link" size={16} color="#fff"/>
                                                <Text style={styles.openImageText}>Open</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.filePreviewContainer}>
                                    <View style={styles.fileIconContainer}>
                                        <Feather name="file" size={24} color="#8B4513"/>
                                    </View>
                                    <View style={styles.fileInfoContainer}>
                                        <Text style={styles.fileName} numberOfLines={1}>
                                            {attachment.name}
                                        </Text>
                                        <Text style={styles.fileType}>
                                            {attachment.mimeType || 'File'}
                                        </Text>
                                    </View>
                                    {attachment.uri && (
                                        <View style={styles.openFileButton}>
                                            <Feather name="external-link" size={18} color="#2196F3"/>
                                            <Text style={styles.openFileText}>Open</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Additional Info */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="info" size={20} color="#8B4513"/>
                        <Text style={styles.sectionTitle}>Additional Information</Text>
                    </View>
                    {task.createdAt && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Created:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(task.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </Text>
                        </View>
                    )}
                    {task.updatedAt && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Last Updated:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(task.updatedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </Text>
                        </View>
                    )}
                </View>

            </ScrollView>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                visible={showDeleteConfirm}
                title="Delete Task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1D1F',
        textAlign: 'center',
    },
    backButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    headerCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginTop: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    typeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    labelTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    labelText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    taskName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1D1F',
        marginBottom: 12,
    },
    statusContainer: {
        marginTop: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
    },
    editButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    rescheduleButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    reuseButton: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    deleteButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    deleteButtonText: {
        color: '#fff',
    },
    disabledButtonText: {
        color: '#9CA3AF',
    },
    disabledDeleteButtonText: {
        color: '#fff',
    },
    quickActions: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    quickActionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 12,
    },
    quickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    quickActionButtonDisabled: {
        opacity: 0.6,
    },
    quickActionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    descriptionText: {
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 22,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        minWidth: 100,
    },
    infoValue: {
        fontSize: 15,
        color: '#1A1D1F',
        flex: 1,
    },
    attachmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    attachmentName: {
        fontSize: 15,
        color: '#1A1D1F',
        flex: 1,
    },
    openAttachmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
    },
    openAttachmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2196F3',
    },
    // Image preview styles
    imagePreviewContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    attachmentPreviewImage: {
        width: '100%',
        height: 200,
        backgroundColor: '#F9FAFB',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 12,
    },
    imageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    imageFileName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    openImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
    },
    openImageText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    // File preview styles
    filePreviewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
    },
    fileIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    fileInfoContainer: {
        flex: 1,
        gap: 4,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    fileType: {
        fontSize: 12,
        color: '#6B7280',
    },
    openFileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
    },
    openFileText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2196F3',
    },
});
