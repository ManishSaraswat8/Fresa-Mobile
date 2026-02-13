import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Modal,
    Platform,
    Alert,
    Image,
    ActivityIndicator,
    useColorScheme,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {ConfirmDialog} from '@/app/component/ConfirmDialog';
import {Feather} from '@expo/vector-icons';
import {useState, useEffect, useRef} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import {createPatientTask, getTaskLabels, updatePatientTask} from '@/services/api';
import {getPatientTaskById} from '@/services/dashboardService';
import {getUserData} from '@/services/authService';
import {getTemplates, GoalTemplate, ChallengeTemplate} from '@/services/templateService';
import Toast from 'react-native-toast-message';

interface Label {
    name: string;
    color: string;
    id?: string;
    _id?: string;
    title?: string;
}

export default function CreateTaskScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const templateLoadedRef = useRef<string | null>(null); // Track which templateId was loaded
    const scrollViewRef = useRef<ScrollView>(null);
    const [showDeleteAttachmentConfirm, setShowDeleteAttachmentConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingTask, setIsLoadingTask] = useState(false);
    const [labels, setLabels] = useState<Label[]>([]);
    const [isLoadingLabels, setIsLoadingLabels] = useState(true);
    const taskId = params.taskId as string;
    const mode = params.mode as string; // 'edit' or 'reschedule'
    const isEditMode = mode === 'edit' || mode === 'reschedule';
    const [formData, setFormData] = useState({
        label: '',
        taskName: '',
        goals: '',
        challenges: '',
        mitigations: '',
        email: '',
        phone: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        attachment: '',
    });
    const [attachmentFile, setAttachmentFile] = useState<{
        name: string;
        uri: string;
        mimeType: string;
    } | null>(null);

    // Template selection modals
    const [showGoalTemplateModal, setShowGoalTemplateModal] = useState(false);
    const [showChallengeTemplateModal, setShowChallengeTemplateModal] = useState(false);
    const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([]);
    const [challengeTemplates, setChallengeTemplates] = useState<ChallengeTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templateTab, setTemplateTab] = useState<'Mine' | 'Pre-Built'>('Pre-Built');
    const [selectedGoalTemplateId, setSelectedGoalTemplateId] = useState<string | null>(null);


    // Load template data if provided (only once, and not when editing/rescheduling)
    // Wait for labels to load before setting the label field
    useEffect(() => {
        const currentTemplateId = params.templateId as string;
        const hasTemplateChanged = currentTemplateId && templateLoadedRef.current !== currentTemplateId;

        // Reset form data when template changes
        if (hasTemplateChanged && !isEditMode) {
            console.log('Template changed, resetting form data. Old:', templateLoadedRef.current, 'New:', currentTemplateId);
            setFormData({
                label: '',
                taskName: '',
                goals: '',
                challenges: '',
                mitigations: '',
                email: '',
                phone: '',
                startDate: '',
                startTime: '',
                endDate: '',
                endTime: '',
                attachment: '',
            });
            setAttachmentFile(null);
        }

        if (currentTemplateId && hasTemplateChanged && !isEditMode && !isLoadingLabels && labels.length > 0) {
            const templateCategory = params.templateCategory as string;
            const templateType = params.templateType as string;
            const templateText = params.templateText as string;
            const templateLabelId = params.templateLabelId as string;
            const templateLabelName = params.templateLabelName as string;
            const templateChallenge = params.templateChallenge as string;
            const templateMitigation = params.templateMitigation as string;
            const templateGoalTitle = params.templateGoalTitle as string;
            const templateGoalDescription = params.templateGoalDescription as string;

            // Find the label from database - prefer labelId if provided, otherwise match by name
            let matchingLabel = null;
            if (templateLabelId) {
                matchingLabel = labels.find((label) =>
                    String(label.id || label._id) === String(templateLabelId)
                );
            }

            // If not found by ID, try to match by name
            if (!matchingLabel && templateLabelName) {
                matchingLabel = labels.find((label) => {
                    const labelName = (label.name || label.title || '').toLowerCase().trim();
                    const templateName = (templateLabelName || '').toLowerCase().trim();
                    return labelName === templateName && labelName !== '';
                });
            }

            // Fallback to category name matching
            if (!matchingLabel && templateCategory) {
                matchingLabel = labels.find((label) => {
                    const labelName = (label.name || label.title || '').toLowerCase().trim();
                    const categoryName = (templateCategory || '').toLowerCase().trim();
                    return labelName === categoryName && labelName !== '';
                });
            }

            // Use the label name from database, or fallback to templateLabelName or templateCategory
            const labelName = matchingLabel?.name || templateLabelName || templateCategory || '';

            console.log('Template data:', {
                category: templateCategory,
                type: templateType,
                labelId: templateLabelId,
                labelName: templateLabelName,
                challenge: templateChallenge,
                mitigation: templateMitigation,
                goalTitle: templateGoalTitle,
                templateText: templateText,
            });
            console.log('Matching label found:', matchingLabel);
            console.log('Setting label to:', labelName);
            console.log('⚠️ taskName will be cleared - NOT filled from template');

            // Set default dates and times
            const now = new Date();
            const endTime = new Date(now);
            endTime.setMinutes(now.getMinutes() + 30); // Default end time is 30 minutes after start (minimum)

            const formatDate = (date: Date): string => {
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                return `${month}/${day}/${year}`;
            };

            const formatTime = (date: Date): string => {
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            };

            setFormData((prev) => {
                const updatedData: any = {
                    ...prev,
                    label: labelName,
                    taskName: '', // Explicitly clear taskName - user must enter it manually
                    startDate: formatDate(now),
                    startTime: formatTime(now),
                    endDate: formatDate(endTime),
                    endTime: formatTime(endTime),
                };

                if (templateType === 'Goal') {
                    // For Goal templates, set goals field
                    updatedData.goals = templateText || '';
                } else {
                    // For Challenge templates, set goals (from related goal), challenges, and mitigations
                    if (templateGoalTitle) {
                        updatedData.goals = templateGoalDescription
                            ? `${templateGoalTitle}\n${templateGoalDescription}`
                            : templateGoalTitle;
                    }
                    if (templateChallenge) {
                        updatedData.challenges = templateChallenge;
                    }
                    if (templateMitigation) {
                        updatedData.mitigations = templateMitigation;
                    }
                }

                console.log('Form data after template load:', {
                    taskName: updatedData.taskName,
                    label: updatedData.label,
                    goals: updatedData.goals,
                    challenges: updatedData.challenges,
                    mitigations: updatedData.mitigations,
                });
                return updatedData;
            });

            templateLoadedRef.current = currentTemplateId; // Store the templateId that was loaded
        }
    }, [
        params.templateId,
        params.templateCategory,
        params.templateType,
        params.templateText,
        params.templateLabelId,
        params.templateLabelName,
        params.templateChallenge,
        params.templateMitigation,
        params.templateGoalTitle,
        params.templateGoalDescription,
        labels,
        isLoadingLabels,
        isEditMode
    ]);

    const [showLabelModal, setShowLabelModal] = useState(false);

    // Date/Time Picker States
    const [showStartDateModal, setShowStartDateModal] = useState(false);
    const [showStartTimeModal, setShowStartTimeModal] = useState(false);
    const [showEndDateModal, setShowEndDateModal] = useState(false);
    const [showEndTimeModal, setShowEndTimeModal] = useState(false);
    const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
    const [tempStartTime, setTempStartTime] = useState<Date>(new Date());
    const [tempEndDate, setTempEndDate] = useState<Date>(new Date());
    const [tempEndTime, setTempEndTime] = useState<Date>(new Date());

    // Load labels from backend
    useEffect(() => {
        loadLabels();
    }, []);

    // Load task data if editing/rescheduling
    useEffect(() => {
        if (taskId && isEditMode && !templateLoadedRef.current) {
            loadTaskData();
        }
    }, [taskId, isEditMode]);

    // Load task data if editing/rescheduling
    useEffect(() => {
        // Reset template loaded ref when taskId changes to allow reloading
        if (taskId && isEditMode) {
            templateLoadedRef.current = null;

            // Reset form data when taskId changes to prevent showing cached data
            setFormData({
                label: '',
                taskName: '',
                goals: '',
                challenges: '',
                mitigations: '',
                email: '',
                phone: '',
                startDate: '',
                startTime: '',
                endDate: '',
                endTime: '',
                attachment: '',
            });
            setAttachmentFile(null);

            // Load new task data
            loadTaskData();
        }
    }, [taskId, isEditMode]);

    const loadTaskData = async () => {
        if (!taskId) return;

        // Prevent multiple simultaneous loads
        if (templateLoadedRef.current !== null) return;

        try {
            setIsLoadingTask(true);
            const task = await getPatientTaskById(taskId);

            if (!task) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Task not found',
                    position: 'top',
                });
                router.back();
                return;
            }

            // Parse date and time from task
            const formatDateFromString = (dateStr: string): string => {
                const date = new Date(dateStr);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                return `${month}/${day}/${year}`;
            };

            const formatTimeFromString = (dateStr: string): string => {
                const date = new Date(dateStr);
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            };

            // Get label name
            let labelName = 'Partner';
            if ((task as any).label?.title) {
                labelName = (task as any).label.title;
            } else if (task.sections?.[0]?.name) {
                labelName = task.sections[0].name;
            }

            // Get goals and challenges from sections
            const goalSection = task.sections?.find(s => s.name === 'Goals' || s.type === 'goal');
            const challengeSection = task.sections?.find(s => s.name === 'Challenges' || s.type === 'challenge');
            const attachmentSection = task.sections?.find(s => s.name === 'Attachment' || s.type === 'attachment');
            const goals = goalSection?.short_description || goalSection?.value || '';
            const challenges = challengeSection?.short_description || challengeSection?.value || '';
            const mitigation = (task as any).mitigation || '';
            const contacts = (task as any).contacts || {};

            // Extract attachment data if present
            let attachmentName = '';
            let attachmentData = null;
            if (attachmentSection) {
                if (typeof attachmentSection.value === 'object' && attachmentSection.value !== null) {
                    attachmentName = attachmentSection.value.name || attachmentSection.short_description || '';
                    attachmentData = {
                        name: attachmentSection.value.name || attachmentSection.short_description || 'Attachment',
                        uri: attachmentSection.value.uri,
                        mimeType: attachmentSection.value.mimeType,
                    };
                } else {
                    attachmentName = attachmentSection.short_description || attachmentSection.value || '';
                }
            }

            setFormData({
                label: labelName,
                taskName: task.title || '',
                goals: goals,
                challenges: challenges,
                mitigations: mitigation,
                email: contacts.email || '',
                phone: contacts.phone || '',
                startDate: task.time_line?.start ? formatDateFromString(task.time_line.start) : '',
                startTime: task.time_line?.start ? formatTimeFromString(task.time_line.start) : '',
                endDate: task.time_line?.end ? formatDateFromString(task.time_line.end) : '',
                endTime: task.time_line?.end ? formatTimeFromString(task.time_line.end) : '',
                attachment: attachmentName,
            });

            // Set attachment file if available
            if (attachmentData) {
                setAttachmentFile(attachmentData);
            } else {
                setAttachmentFile(null);
            }

            templateLoadedRef.current = taskId; // Mark that this task was loaded
        } catch (error: any) {
            console.error('Error loading task data:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to load task data',
                position: 'top',
            });
            router.back();
        } finally {
            setIsLoadingTask(false);
        }
    };

    const loadLabels = async () => {
        try {
            setIsLoadingLabels(true);
            const response = await getTaskLabels();

            // fetchData already extracts data.data from backend response
            // Backend returns: { type: 'success', message: '...', data: [...] }
            // fetchData extracts: data.data which is the array
            const fetchedLabels = Array.isArray(response) ? response : [];

            console.log('Fetched labels from backend:', fetchedLabels);
            console.log('Number of labels:', fetchedLabels.length);

            // Transform backend labels to UI format
            const transformedLabels: Label[] = fetchedLabels
                .filter((label: any) => {
                    // Filter out deleted labels and inactive labels
                    const isActive = label.isActive !== false;
                    const isNotDeleted = label.is_deleted !== true;
                    return isActive && isNotDeleted;
                })
                .map((label: any) => ({
                    name: label.title || label.name || '',
                    color: label.color || '#E9D5FF',
                    id: label._id || label.id, // Store ID for reference
                }));

            console.log('Transformed labels:', transformedLabels);
            console.log('Number of transformed labels:', transformedLabels.length);

            // Only set labels from backend - no fallback defaults
            setLabels(transformedLabels);
        } catch (error: any) {
            console.error('Error loading labels:', error);
            console.error('Error details:', error.message);
            // Don't use fallback labels - show empty state instead
            setLabels([]);
        } finally {
            setIsLoadingLabels(false);
        }
    };


    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({...prev, [field]: value}));
    };

    // Load templates when label is selected
    const loadTemplatesForLabel = async (labelId: string, goalId?: string | null) => {
        try {
            setLoadingTemplates(true);
            const selectedLabel = labels.find((l) => String(l._id || l.id) === labelId);
            if (!selectedLabel) return;

            const labelIdStr = String(selectedLabel._id || selectedLabel.id);

            // Fetch templates based on current tab (Mine or Pre-Built)
            const result = await getTemplates({
                isPrebuilt: templateTab === 'Pre-Built',
            });

            // Filter goals by label
            const filteredGoals = result.goals.filter((goal) =>
                String(goal.label_id || '') === labelIdStr
            );

            // Filter challenges
            let filteredChallenges: ChallengeTemplate[] = [];

            if (goalId) {
                // If a goal template was selected, filter challenges by that specific goal
                filteredChallenges = result.challenges.filter((challenge) =>
                    challenge.goal_id && String(challenge.goal_id) === String(goalId)
                );
            } else {
                // If goals were entered manually or no goal selected, filter challenges by label
                // Get all goal IDs that match the selected label
                const goalIdsWithLabel = new Set(
                    filteredGoals.map((g) => String(g._id || g.id))
                );

                // Filter challenges that are related to goals with this label
                filteredChallenges = result.challenges.filter((challenge) => {
                    if (!challenge.goal_id) return false;
                    return goalIdsWithLabel.has(String(challenge.goal_id));
                });
            }

            setGoalTemplates(filteredGoals);
            setChallengeTemplates(filteredChallenges);
        } catch (error: any) {
            console.error('Error loading templates:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load templates',
                position: 'top',
            });
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleLabelSelect = (labelName: string) => {
        handleInputChange('label', labelName);
        setShowLabelModal(false);

        // Reset selected goal template when label changes
        setSelectedGoalTemplateId(null);

        // Load templates for the selected label
        const selectedLabel = labels.find((l) => l.name === labelName);
        if (selectedLabel) {
            const labelId = String(selectedLabel._id || selectedLabel.id);
            loadTemplatesForLabel(labelId);
        }
    };

    // Handle goal template selection
    const handleGoalTemplateSelect = (goal: GoalTemplate) => {
        const goalText = goal.description
            ? `${goal.title}\n${goal.description}`
            : goal.title;
        handleInputChange('goals', goalText);
        const goalId = String(goal._id || goal.id);
        setSelectedGoalTemplateId(goalId);
        setShowGoalTemplateModal(false);

        // Reload challenges filtered by selected goal
        if (formData.label) {
            const selectedLabel = labels.find((l) => l.name === formData.label);
            if (selectedLabel) {
                loadTemplatesForLabel(String(selectedLabel._id || selectedLabel.id), goalId);
            }
        }
    };

    // Handle challenge template selection
    const handleChallengeTemplateSelect = (challenge: ChallengeTemplate) => {
        const challengeText = challenge.challenge || challenge.description || challenge.title || '';
        handleInputChange('challenges', challengeText);
        // Auto-fill mitigations if available (user can modify)
        if (challenge.mitigation) {
            handleInputChange('mitigations', challenge.mitigation);
        }
        setShowChallengeTemplateModal(false);
    };

    // Open goal template modal
    const handleOpenGoalTemplateModal = async () => {
        if (!formData.label) {
            Alert.alert('Label Required', 'Please select a label first');
            return;
        }

        const selectedLabel = labels.find((l) => l.name === formData.label);
        if (selectedLabel) {
            // Load goals filtered by label (no specific goal filter for goals modal)
            await loadTemplatesForLabel(String(selectedLabel._id || selectedLabel.id));
            setShowGoalTemplateModal(true);
        }
    };

    // Open challenge template modal
    const handleOpenChallengeTemplateModal = async () => {
        if (!formData.label) {
            Alert.alert('Label Required', 'Please select a label first');
            return;
        }

        const selectedLabel = labels.find((l) => l.name === formData.label);
        if (selectedLabel) {
            // If a goal template was selected, filter challenges by that goal
            // Otherwise, filter by label (for manually entered goals)
            const goalId = selectedGoalTemplateId || null;
            await loadTemplatesForLabel(String(selectedLabel._id || selectedLabel.id), goalId);
            setShowChallengeTemplateModal(true);
        }
    };

    // Reload templates when tab changes
    useEffect(() => {
        if ((showGoalTemplateModal || showChallengeTemplateModal) && formData.label) {
            const selectedLabel = labels.find((l) => l.name === formData.label);
            if (selectedLabel) {
                // For challenge modal, use selected goal ID if available
                const goalId = showChallengeTemplateModal ? selectedGoalTemplateId : null;
                loadTemplatesForLabel(String(selectedLabel._id || selectedLabel.id), goalId);
            }
        }
    }, [templateTab]);


    const formatDate = (date: Date): string => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const formatTime = (date: Date): string => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const handleStartDateOpen = () => {
        setTempStartDate(
            formData.startDate
                ? new Date(
                    formData.startDate.split('/')[2] +
                    '-' +
                    formData.startDate.split('/')[0] +
                    '-' +
                    formData.startDate.split('/')[1]
                )
                : new Date()
        );
        setShowStartDateModal(true);
    };

    const handleStartTimeOpen = () => {
        setTempStartTime(
            formData.startTime
                ? (() => {
                    const [hours, minutes] = formData.startTime.split(':');
                    const date = new Date();
                    date.setHours(parseInt(hours), parseInt(minutes));
                    return date;
                })()
                : new Date()
        );
        setShowStartTimeModal(true);
    };

    const handleEndDateOpen = () => {
        setTempEndDate(
            formData.endDate
                ? new Date(
                    formData.endDate.split('/')[2] +
                    '-' +
                    formData.endDate.split('/')[0] +
                    '-' +
                    formData.endDate.split('/')[1]
                )
                : new Date()
        );
        setShowEndDateModal(true);
    };

    const handleEndTimeOpen = () => {
        setTempEndTime(
            formData.endTime
                ? (() => {
                    const [hours, minutes] = formData.endTime.split(':');
                    const date = new Date();
                    date.setHours(parseInt(hours), parseInt(minutes));
                    return date;
                })()
                : new Date()
        );
        setShowEndTimeModal(true);
    };

    const handleStartDateSave = (date?: Date) => {
        // Use provided date or fall back to tempStartDate
        const dateToUse = date || tempStartDate;
        // Validate: Start date cannot be in the past
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const selectedDate = new Date(dateToUse);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < now) {
            Alert.alert(
                'Invalid Date',
                'Start date cannot be in the past. Please select today or a future date.',
                [{text: 'OK'}]
            );
            return;
        }

        // Validate: If end date/time is set, ensure it's still at least 30 minutes after start
        if (formData.endDate && formData.endTime && formData.startTime) {
            const parseDateTime = (dateStr: string, timeStr: string): Date => {
                const [month, day, year] = dateStr.split('/').map(Number);
                const [hours, minutes] = timeStr.split(':').map(Number);
                return new Date(year, month - 1, day, hours, minutes);
            };

            const startDateTime = new Date(dateToUse);
            const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
            startDateTime.setHours(startHours, startMinutes, 0, 0);

            const endDateTime = parseDateTime(formData.endDate, formData.endTime);
            const diffMs = endDateTime.getTime() - startDateTime.getTime();
            const diffMinutes = diffMs / (1000 * 60);

            if (diffMinutes < 30) {
                Alert.alert(
                    'Invalid Date',
                    'Start date is too close to end date/time. End time must be at least 30 minutes after start time. Please adjust the end date/time.',
                    [{text: 'OK'}]
                );
                return;
            }
        }

        // Update temp state for consistency
        setTempStartDate(dateToUse);
        handleInputChange('startDate', formatDate(dateToUse));
        setShowStartDateModal(false);
    };

    const handleStartTimeSave = (time?: Date) => {
        // Use provided time or fall back to tempStartTime
        const timeToUse = time || tempStartTime;
        // Validate: Start date/time cannot be in the past
        const now = new Date();
        const startDateTime = new Date(tempStartDate);
        startDateTime.setHours(timeToUse.getHours(), timeToUse.getMinutes(), 0, 0);

        if (startDateTime < now) {
            Alert.alert(
                'Invalid Time',
                'Start date and time cannot be in the past. Please select a future date and time.',
                [{text: 'OK'}]
            );
            return;
        }

        // Validate: If end date/time is set, ensure it's still at least 30 minutes after start
        if (formData.endDate && formData.endTime) {
            const parseDateTime = (dateStr: string, timeStr: string): Date => {
                const [month, day, year] = dateStr.split('/').map(Number);
                const [hours, minutes] = timeStr.split(':').map(Number);
                return new Date(year, month - 1, day, hours, minutes);
            };

            const endDateTime = parseDateTime(formData.endDate, formData.endTime);
            const diffMs = endDateTime.getTime() - startDateTime.getTime();
            const diffMinutes = diffMs / (1000 * 60);

            if (diffMinutes < 30) {
                Alert.alert(
                    'Invalid Time',
                    'Start time is too close to end time. End time must be at least 30 minutes after start time. Please adjust the end time.',
                    [{text: 'OK'}]
                );
                return;
            }
        }

        // Update temp state for consistency
        setTempStartTime(timeToUse);
        handleInputChange('startTime', formatTime(timeToUse));
        setShowStartTimeModal(false);
    };

    const handleEndDateSave = (date?: Date) => {
        // Use provided date or fall back to tempEndDate
        const dateToUse = date || tempEndDate;
        // Validate: End date cannot be before start date
        if (formData.startDate) {
            const startDate = new Date(
                formData.startDate.split('/')[2] +
                '-' +
                formData.startDate.split('/')[0] +
                '-' +
                formData.startDate.split('/')[1]
            );
            const endDate = new Date(dateToUse);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            if (endDate < startDate) {
                Alert.alert(
                    'Invalid Date',
                    'End date cannot be before start date.',
                    [{text: 'OK'}]
                );
                return;
            }

            // Validate: If start and end times are set, ensure at least 30 minutes difference
            if (formData.startTime && formData.endTime) {
                const parseDateTime = (dateStr: string, timeStr: string): Date => {
                    const [month, day, year] = dateStr.split('/').map(Number);
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    return new Date(year, month - 1, day, hours, minutes);
                };

                const startDateTime = parseDateTime(formData.startDate, formData.startTime);
                const endDateTime = parseDateTime(formatDate(dateToUse), formData.endTime);
                const diffMs = endDateTime.getTime() - startDateTime.getTime();
                const diffMinutes = diffMs / (1000 * 60);

                if (diffMinutes < 30) {
                    Alert.alert(
                        'Invalid Date',
                        'End date/time must be at least 30 minutes after start date/time. Please adjust the end time.',
                        [{text: 'OK'}]
                    );
                    return;
                }
            }
        }

        // Also validate: End date cannot be in the past
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const selectedDate = new Date(dateToUse);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < now) {
            Alert.alert(
                'Invalid Date',
                'End date cannot be in the past. Please select today or a future date.',
                [{text: 'OK'}]
            );
            return;
        }

        // Update temp state for consistency
        setTempEndDate(dateToUse);
        handleInputChange('endDate', formatDate(dateToUse));
        setShowEndDateModal(false);
    };

    const handleEndTimeSave = (time?: Date) => {
        // Use provided time or fall back to tempEndTime
        const timeToUse = time || tempEndTime;
        // Validate: End date/time cannot be before start date/time
        if (formData.startDate && formData.startTime) {
            const parseDateTime = (dateStr: string, timeStr: string): Date => {
                const [month, day, year] = dateStr.split('/').map(Number);
                const [hours, minutes] = timeStr.split(':').map(Number);
                return new Date(year, month - 1, day, hours, minutes);
            };

            const startDateTime = parseDateTime(formData.startDate, formData.startTime);
            const endDateTime = new Date(tempEndDate);
            endDateTime.setHours(timeToUse.getHours(), timeToUse.getMinutes(), 0, 0);

            // Calculate difference in milliseconds
            const diffMs = endDateTime.getTime() - startDateTime.getTime();
            const diffMinutes = diffMs / (1000 * 60);

            if (endDateTime <= startDateTime) {
                Alert.alert(
                    'Invalid Time',
                    'End date and time must be after start date and time.',
                    [{text: 'OK'}]
                );
                return;
            }

            // Validate: Minimum 30 minutes difference
            if (diffMinutes < 30) {
                Alert.alert(
                    'Invalid Time',
                    'End time must be at least 30 minutes after start time.',
                    [{text: 'OK'}]
                );
                return;
            }
        }

        // Also validate: End date/time cannot be in the past
        const now = new Date();
        const endDateTime = new Date(tempEndDate);
        endDateTime.setHours(timeToUse.getHours(), timeToUse.getMinutes(), 0, 0);

        if (endDateTime < now) {
            Alert.alert(
                'Invalid Time',
                'End date and time cannot be in the past. Please select a future date and time.',
                [{text: 'OK'}]
            );
            return;
        }

        // Update temp state for consistency
        setTempEndTime(timeToUse);
        handleInputChange('endTime', formatTime(timeToUse));
        setShowEndTimeModal(false);
    };

    const handleFilePicker = async () => {
        try {
            // expo-document-picker uses the system picker which handles permissions automatically
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                handleInputChange('attachment', file.name);
                setAttachmentFile({
                    name: file.name,
                    uri: file.uri,
                    mimeType: file.mimeType || '',
                });
            }
        } catch (error: any) {
            console.error('Error picking file:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to pick file. Please try again.',
                [{text: 'OK'}]
            );
        }
    };

    const handleSaveTask = async () => {
        // Validate mandatory fields
        if (!formData.label) {
            Alert.alert('Validation Error', 'Label (Area of Life) is required.');
            return;
        }

        if (!formData.startDate) {
            Alert.alert('Validation Error', 'Start Date is required.');
            return;
        }

        if (!formData.startTime) {
            Alert.alert('Validation Error', 'Start Time is required.');
            return;
        }

        if (!formData.endDate) {
            Alert.alert('Validation Error', 'End Date is required.');
            return;
        }

        if (!formData.endTime) {
            Alert.alert('Validation Error', 'End Time is required.');
            return;
        }

        // Validate mitigation if challenge is written
        if (formData.challenges.trim() && !formData.mitigations.trim()) {
            Alert.alert('Validation Error', 'Mitigation is required when Challenge is provided.');
            return;
        }

        try {
            setIsSaving(true);

            // Get current user data
            const userData = await getUserData();
            if (!userData || !userData._id) {
                throw new Error('User not found. Please log in again.');
            }

            // Parse dates and times
            const parseDateTime = (dateStr: string, timeStr: string): Date => {
                const [month, day, year] = dateStr.split('/').map(Number);
                const [hours, minutes] = timeStr.split(':').map(Number);
                return new Date(year, month - 1, day, hours, minutes);
            };

            const startDateTime = parseDateTime(formData.startDate, formData.startTime);
            const endDateTime = parseDateTime(formData.endDate, formData.endTime);

            // Final validation: Ensure start date/time is not in the past
            const now = new Date();
            if (startDateTime < now) {
                Alert.alert(
                    'Invalid Date/Time',
                    'Start date and time cannot be in the past. Please select a future date and time.',
                    [{text: 'OK'}]
                );
                return;
            }

            // Final validation: Ensure end date/time is not in the past
            if (endDateTime < now) {
                Alert.alert(
                    'Invalid Date/Time',
                    'End date and time cannot be in the past. Please select a future date and time.',
                    [{text: 'OK'}]
                );
                return;
            }

            // Final validation: Ensure end is after start
            if (endDateTime <= startDateTime) {
                Alert.alert(
                    'Invalid Date/Time',
                    'End date and time must be after start date and time.',
                    [{text: 'OK'}]
                );
                return;
            }

            // Final validation: Minimum 30 minutes difference
            const diffMs = endDateTime.getTime() - startDateTime.getTime();
            const diffMinutes = diffMs / (1000 * 60);

            if (diffMinutes < 30) {
                Alert.alert(
                    'Invalid Duration',
                    'Task duration must be at least 30 minutes. End time must be at least 30 minutes after start time.',
                    [{text: 'OK'}]
                );
                return;
            }

            // Build sections array
            const sections: any[] = [];

            // Add label as a section
            if (formData.label) {
                sections.push({
                    name: formData.label,
                    type: 'label',
                    value: formData.label,
                });
            }

            // Add goals section if provided
            if (formData.goals.trim()) {
                sections.push({
                    name: 'Goals',
                    short_description: formData.goals,
                    type: 'text',
                    value: formData.goals,
                });
            }

            // Add challenges section if provided
            if (formData.challenges.trim()) {
                sections.push({
                    name: 'Challenges',
                    short_description: formData.challenges,
                    type: 'text',
                    value: formData.challenges,
                });
            }

            // Build task payload
            const taskPayload: any = {
                title: formData.taskName || formData.goals || formData.challenges || 'New Task',
                sections: sections.length > 0 ? sections : undefined,
                user_id: userData._id,
                time_line: {
                    start: startDateTime.toISOString(),
                    end: endDateTime.toISOString(),
                },
                status: 'PENDING',
            };

            // Add contacts if provided
            if (formData.email || formData.phone) {
                taskPayload.contacts = {};
                if (formData.email) taskPayload.contacts.email = formData.email;
                if (formData.phone) taskPayload.contacts.phone = formData.phone;
            }

            // Add mitigation if provided
            if (formData.mitigations.trim()) {
                taskPayload.mitigation = formData.mitigations;
            }

            // Add attachment if provided
            if (attachmentFile) {
                sections.push({
                    name: 'Attachment',
                    short_description: attachmentFile.name,
                    type: 'attachment',
                    value: {
                        name: attachmentFile.name,
                        uri: attachmentFile.uri,
                        mimeType: attachmentFile.mimeType,
                    },
                });
                // Update sections array in payload
                taskPayload.sections = sections;
            }

            // Create or update the task
            if (isEditMode && taskId) {
                await updatePatientTask(taskId, taskPayload);
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: mode === 'reschedule' ? 'Task rescheduled successfully!' : 'Task updated successfully!',
                    position: 'top',
                });
            } else {
                await createPatientTask(taskPayload);
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Task created successfully!',
                    position: 'top',
                });
            }

            // Small delay to ensure API call completes, then navigate back
            // This ensures the focus effect will trigger and reload tasks
            setTimeout(() => {
                router.back();
            }, 300);
        } catch (error: any) {
            console.error('Error creating task:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to create task. Please try again.',
                [{text: 'OK'}]
            );
        } finally {
            setIsSaving(false);
        }
    };

    const getHeaderTitle = () => {
        if (mode === 'reschedule') return 'Reschedule Task';
        if (mode === 'edit') return 'Edit Task';
        return 'Create Task';
    };

    if (isLoadingTask) {
        return (
            <AppWrapper headerTitle={getHeaderTitle()} headerVariant="default">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F6B8A3"/>
                    <Text style={styles.loadingText}>Loading task data...</Text>
                </View>
            </AppWrapper>
        );
    }

    return (
        <AppWrapper headerTitle={getHeaderTitle()} headerVariant="default">
            <ScrollView
                ref={scrollViewRef}
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Label */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Label <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity
                        style={[styles.input, !formData.label && styles.inputError]}
                        onPress={() => setShowLabelModal(true)}
                        disabled={isLoadingLabels}
                    >
                        <View style={styles.labelInputContent}>
                            {isLoadingLabels ? (
                                <View style={styles.labelLoadingContainer}>
                                    <ActivityIndicator size="small" color="#9CA3AF"/>
                                    <Text style={styles.placeholderText}>Loading labels...</Text>
                                </View>
                            ) : formData.label ? (
                                <View style={styles.selectedLabelRow}>
                                    <View
                                        style={[
                                            styles.labelColorBar,
                                            {
                                                backgroundColor:
                                                    labels.find((l) => l.name === formData.label)?.color ||
                                                    '#E9D5FF',
                                            },
                                        ]}
                                    />
                                    <Text style={styles.selectedLabelText}>{formData.label}</Text>
                                </View>
                            ) : (
                                <Text style={styles.placeholderText}>Select Area of Life</Text>
                            )}
                            <Feather name="chevron-down" size={20} color="#9CA3AF"/>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Task Name */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Task Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Name of the Task"
                        placeholderTextColor="#9CA3AF"
                        value={formData.taskName}
                        onChangeText={(value) => handleInputChange('taskName', value)}
                    />
                </View>

                {/* Goals */}
                <View style={styles.inputGroup}>
                    <View style={styles.fieldHeader}>
                        <Text style={styles.label}>Goals</Text>
                        {formData.label && (
                            <TouchableOpacity
                                style={styles.chooseButton}
                                onPress={handleOpenGoalTemplateModal}
                            >
                                <Feather name="zap" size={16} color="#8B4513"/>
                                <Text style={styles.chooseButtonText}>Suggestions</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter Task Goals or choose from templates"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        value={formData.goals}
                        onChangeText={(value) => {
                            handleInputChange('goals', value);
                            // Clear selected goal template if user edits manually
                            setSelectedGoalTemplateId(null);
                        }}
                    />
                </View>

                {/* Challenges */}
                <View style={styles.inputGroup}>
                    <View style={styles.fieldHeader}>
                        <Text style={styles.label}>Challenges</Text>
                        {formData.label && (
                            <TouchableOpacity
                                style={styles.chooseButton}
                                onPress={handleOpenChallengeTemplateModal}
                            >
                                <Feather name="zap" size={16} color="#8B4513"/>
                                <Text style={styles.chooseButtonText}>Suggestions</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter Task Challenges if any or choose from templates"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        value={formData.challenges}
                        onChangeText={(value) => handleInputChange('challenges', value)}
                    />
                </View>

                {/* Mitigations */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Mitigations
                        {formData.challenges.trim() && <Text style={styles.required}> *</Text>}
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea,
                            formData.challenges.trim() && !formData.mitigations.trim() && styles.inputError
                        ]}
                        placeholder="Enter Mitigations to Challenges"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        value={formData.mitigations}
                        onChangeText={(value) => handleInputChange('mitigations', value)}
                    />
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Email Address for Contact Tasks"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={formData.email}
                        onChangeText={(value) => handleInputChange('email', value)}
                    />
                </View>

                {/* Phone */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Phone Number for Contact Tasks"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        value={formData.phone}
                        onChangeText={(value) => handleInputChange('phone', value)}
                    />
                </View>

                {/* Start Date & Time */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Start Date & Time <Text style={styles.required}>*</Text></Text>
                    <View style={styles.dateTimeContainer}>
                        {/* Start Date Field */}
                        <TouchableOpacity
                            style={[
                                styles.input,
                                styles.dateTimeInput,
                                !formData.startDate && styles.inputError
                            ]}
                            onPress={() => {
                                setTempStartDate(
                                    formData.startDate
                                        ? new Date(
                                            formData.startDate.split('/')[2] +
                                            '-' +
                                            formData.startDate.split('/')[0] +
                                            '-' +
                                            formData.startDate.split('/')[1]
                                        )
                                        : new Date()
                                );
                                setShowStartDateModal(true);
                            }}
                        >
                            <Feather name="calendar" size={16} color="#9CA3AF"/>
                            <Text
                                style={[
                                    styles.dateTimeText,
                                    formData.startDate && styles.dateTimeTextSelected,
                                ]}
                            >
                                {formData.startDate || 'mm/dd/yyyy'}
                            </Text>
                        </TouchableOpacity>

                        {/* Start Time Field */}
                        <TouchableOpacity
                            style={[
                                styles.input,
                                styles.dateTimeInput,
                                !formData.startTime && styles.inputError
                            ]}
                            onPress={() => {
                                setTempStartTime(
                                    formData.startTime
                                        ? (() => {
                                            const [hours, minutes] = formData.startTime.split(':');
                                            const date = new Date();
                                            date.setHours(parseInt(hours), parseInt(minutes));
                                            return date;
                                        })()
                                        : new Date()
                                );
                                setShowStartTimeModal(true);
                            }}
                        >
                            <Feather name="clock" size={16} color="#9CA3AF"/>
                            <Text
                                style={[
                                    styles.dateTimeText,
                                    formData.startTime && styles.dateTimeTextSelected,
                                ]}
                            >
                                {formData.startTime || 'hh:mm AM/PM'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* End Date & Time */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>End Date & Time <Text style={styles.required}>*</Text></Text>
                    <View style={styles.dateTimeContainer}>
                        {/* End Date Field */}
                        <TouchableOpacity
                            style={[
                                styles.input,
                                styles.dateTimeInput,
                                !formData.endDate && styles.inputError
                            ]}
                            onPress={() => {
                                setTempEndDate(
                                    formData.endDate
                                        ? new Date(
                                            formData.endDate.split('/')[2] +
                                            '-' +
                                            formData.endDate.split('/')[0] +
                                            '-' +
                                            formData.endDate.split('/')[1]
                                        )
                                        : formData.startDate
                                            ? new Date(
                                                formData.startDate.split('/')[2] +
                                                '-' +
                                                formData.startDate.split('/')[0] +
                                                '-' +
                                                formData.startDate.split('/')[1]
                                            )
                                            : new Date()
                                );
                                setShowEndDateModal(true);
                            }}
                        >
                            <Feather name="calendar" size={16} color="#9CA3AF"/>
                            <Text
                                style={[
                                    styles.dateTimeText,
                                    formData.endDate && styles.dateTimeTextSelected,
                                ]}
                            >
                                {formData.endDate || 'mm/dd/yyyy'}
                            </Text>
                        </TouchableOpacity>

                        {/* End Time Field */}
                        <TouchableOpacity
                            style={[
                                styles.input,
                                styles.dateTimeInput,
                                !formData.endTime && styles.inputError
                            ]}
                            onPress={() => {
                                setTempEndTime(
                                    formData.endTime
                                        ? (() => {
                                            const [hours, minutes] = formData.endTime.split(':');
                                            const date = new Date();
                                            date.setHours(parseInt(hours), parseInt(minutes));
                                            return date;
                                        })()
                                        : formData.startTime
                                            ? (() => {
                                                const [hours, minutes] = formData.startTime.split(':');
                                                const date = new Date();
                                                date.setHours(parseInt(hours), parseInt(minutes) + 30);
                                                return date;
                                            })()
                                            : new Date()
                                );
                                setShowEndTimeModal(true);
                            }}
                        >
                            <Feather name="clock" size={16} color="#9CA3AF"/>
                            <Text
                                style={[
                                    styles.dateTimeText,
                                    formData.endTime && styles.dateTimeTextSelected,
                                ]}
                            >
                                {formData.endTime || 'hh:mm AM/PM'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Attachment */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Attachment</Text>
                    {!attachmentFile ? (
                        <View style={styles.attachmentContainer}>
                            <TextInput
                                style={[styles.input, styles.attachmentInput]}
                                placeholder="Add Attachment if any"
                                placeholderTextColor="#9CA3AF"
                                value={formData.attachment}
                                onChangeText={(value) => handleInputChange('attachment', value)}
                                editable={false}
                            />
                            <TouchableOpacity
                                style={styles.attachmentButton}
                                onPress={handleFilePicker}
                            >
                                <Feather name="paperclip" size={20} color="#9CA3AF"/>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.attachmentPreviewContainer}>
                            {attachmentFile.mimeType?.startsWith('image/') ? (
                                <View style={styles.imagePreviewContainer}>
                                    <Image
                                        source={{uri: attachmentFile.uri}}
                                        style={styles.attachmentPreviewImage}
                                        resizeMode="cover"
                                    />
                                    <TouchableOpacity
                                        style={styles.removeAttachmentButton}
                                        onPress={() => setShowDeleteAttachmentConfirm(true)}
                                    >
                                        <Feather name="x" size={16} color="#fff"/>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.filePreviewContainer}>
                                    <View style={styles.fileIconContainer}>
                                        <Feather name="file" size={24} color="#8B4513"/>
                                    </View>
                                    <View style={styles.fileInfoContainer}>
                                        <Text style={styles.fileName} numberOfLines={1}>
                                            {attachmentFile.name}
                                        </Text>
                                        <Text style={styles.fileSize}>
                                            {attachmentFile.mimeType || 'File'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeAttachmentButtonSmall}
                                        onPress={() => setShowDeleteAttachmentConfirm(true)}
                                    >
                                        <Feather name="x" size={18} color="#EF4444"/>
                                    </TouchableOpacity>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.changeAttachmentButton}
                                onPress={handleFilePicker}
                            >
                                <Feather name="edit-2" size={16} color="#8B4513"/>
                                <Text style={styles.changeAttachmentText}>Change</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Save Task Button */}
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSaveTask}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff"/>
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {mode === 'reschedule' ? 'Reschedule Task' : isEditMode ? 'Update Task' : 'Save Task'}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Labels Modal */}
            <Modal
                visible={showLabelModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLabelModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowLabelModal(false)}
                    />
                    <View style={styles.labelModalContainer}>
                        <Text style={styles.labelModalTitle}>Labels (Color Coded)</Text>
                        {isLoadingLabels ? (
                            <View style={styles.labelsLoadingContainer}>
                                <ActivityIndicator size="large" color="#F6B8A3"/>
                                <Text style={styles.labelsLoadingText}>Loading labels...</Text>
                            </View>
                        ) : labels.length > 0 ? (
                            <View style={styles.labelsList}>
                                {labels.map((label) => (
                                    <TouchableOpacity
                                        key={label.name}
                                        style={styles.labelItem}
                                        onPress={() => handleLabelSelect(label.name)}
                                    >
                                        <View
                                            style={[styles.labelColorBar, {backgroundColor: label.color}]}
                                        />
                                        <Text style={styles.labelItemText}>{label.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.labelsEmptyContainer}>
                                <Text style={styles.labelsEmptyText}>No labels available</Text>
                                <Text style={styles.labelsEmptySubtext}>
                                    Contact your clinic to create labels
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>


            {/* Goal Template Selection Modal */}
            <Modal
                visible={showGoalTemplateModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGoalTemplateModal(false)}
            >
                <View style={styles.templateModalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowGoalTemplateModal(false)}
                    />
                    <View style={[styles.templateModalContainer, isDarkMode && styles.templateModalContainerDark]}>
                        {/* Drag Handle */}
                        <View style={styles.dragHandleContainer}>
                            <View style={[styles.dragHandle, isDarkMode && styles.dragHandleDark]}/>
                        </View>
                        <View style={styles.templateModalHeader}>
                            <Text style={[styles.templateModalTitle, isDarkMode && styles.templateModalTitleDark]}>Choose
                                Goal Template</Text>
                            <TouchableOpacity
                                onPress={() => setShowGoalTemplateModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Feather name="x" size={24} color={isDarkMode ? '#FFFFFF' : '#1A1D1F'}/>
                            </TouchableOpacity>
                        </View>

                        {/* Tabs for Mine/Pre-Built */}
                        <View style={styles.templateTabsContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.templateTab,
                                    templateTab === 'Mine' && styles.templateTabActive,
                                ]}
                                onPress={() => setTemplateTab('Mine')}
                            >
                                <Text
                                    style={[
                                        styles.templateTabText,
                                        templateTab === 'Mine' && styles.templateTabTextActive,
                                    ]}
                                >
                                    Mine
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.templateTab,
                                    templateTab === 'Pre-Built' && styles.templateTabActive,
                                ]}
                                onPress={() => setTemplateTab('Pre-Built')}
                            >
                                <Text
                                    style={[
                                        styles.templateTabText,
                                        templateTab === 'Pre-Built' && styles.templateTabTextActive,
                                    ]}
                                >
                                    Pre-Built
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Templates List */}
                        <ScrollView
                            style={styles.templatesList}
                            contentContainerStyle={styles.templatesListContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {loadingTemplates ? (
                                <View style={styles.templatesLoadingContainer}>
                                    <ActivityIndicator size="large" color="#F6B8A3"/>
                                    <Text style={styles.templatesLoadingText}>Loading templates...</Text>
                                </View>
                            ) : goalTemplates.length === 0 ? (
                                <View style={styles.templatesEmptyContainer}>
                                    <Feather name="file-text" size={48} color="#9CA3AF"/>
                                    <Text style={styles.templatesEmptyText}>
                                        No goal templates available for this label
                                    </Text>
                                </View>
                            ) : (
                                goalTemplates.map((goal) => (
                                    <TouchableOpacity
                                        key={goal._id || goal.id}
                                        style={styles.templateItem}
                                        onPress={() => handleGoalTemplateSelect(goal)}
                                    >
                                        <View style={styles.templateItemContent}>
                                            <Text style={styles.templateItemTitle}>
                                                {goal.title}
                                            </Text>
                                            {goal.description && (
                                                <Text style={styles.templateItemDescription}>
                                                    {goal.description}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Challenge Template Selection Modal */}
            <Modal
                visible={showChallengeTemplateModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowChallengeTemplateModal(false)}
            >
                <View style={styles.templateModalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowChallengeTemplateModal(false)}
                    />
                    <View style={[styles.templateModalContainer, isDarkMode && styles.templateModalContainerDark]}>
                        {/* Drag Handle */}
                        <View style={styles.dragHandleContainer}>
                            <View style={[styles.dragHandle, isDarkMode && styles.dragHandleDark]}/>
                        </View>
                        <View style={styles.templateModalHeader}>
                            <Text style={[styles.templateModalTitle, isDarkMode && styles.templateModalTitleDark]}>Choose
                                Challenge Template</Text>
                            <TouchableOpacity
                                onPress={() => setShowChallengeTemplateModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Feather name="x" size={24} color={isDarkMode ? '#FFFFFF' : '#1A1D1F'}/>
                            </TouchableOpacity>
                        </View>

                        {/* Tabs for Mine/Pre-Built */}
                        <View style={styles.templateTabsContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.templateTab,
                                    templateTab === 'Mine' && styles.templateTabActive,
                                ]}
                                onPress={() => setTemplateTab('Mine')}
                            >
                                <Text
                                    style={[
                                        styles.templateTabText,
                                        templateTab === 'Mine' && styles.templateTabTextActive,
                                    ]}
                                >
                                    Mine
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.templateTab,
                                    templateTab === 'Pre-Built' && styles.templateTabActive,
                                ]}
                                onPress={() => setTemplateTab('Pre-Built')}
                            >
                                <Text
                                    style={[
                                        styles.templateTabText,
                                        templateTab === 'Pre-Built' && styles.templateTabTextActive,
                                    ]}
                                >
                                    Pre-Built
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Templates List */}
                        <ScrollView
                            style={styles.templatesList}
                            contentContainerStyle={styles.templatesListContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {loadingTemplates ? (
                                <View style={styles.templatesLoadingContainer}>
                                    <ActivityIndicator size="large" color="#F6B8A3"/>
                                    <Text style={styles.templatesLoadingText}>Loading templates...</Text>
                                </View>
                            ) : challengeTemplates.length === 0 ? (
                                <View style={styles.templatesEmptyContainer}>
                                    <Feather name="file-text" size={48} color="#9CA3AF"/>
                                    <Text style={styles.templatesEmptyText}>
                                        No challenge templates available for this label
                                    </Text>
                                </View>
                            ) : (
                                challengeTemplates.map((challenge) => (
                                    <TouchableOpacity
                                        key={challenge._id || challenge.id}
                                        style={styles.templateItem}
                                        onPress={() => handleChallengeTemplateSelect(challenge)}
                                    >
                                        <View style={styles.templateItemContent}>
                                            <Text style={styles.templateItemTitle}>
                                                {challenge.title || challenge.challenge}
                                            </Text>
                                            {(challenge.challenge || challenge.description) && (
                                                <Text style={styles.templateItemDescription}>
                                                    {challenge.challenge || challenge.description}
                                                </Text>
                                            )}
                                            {challenge.mitigation && (
                                                <Text style={styles.templateItemMitigation}>
                                                    Mitigation: {challenge.mitigation}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Delete Attachment Confirmation Dialog */}
            <ConfirmDialog
                visible={showDeleteAttachmentConfirm}
                title="Remove Attachment"
                message="Are you sure you want to remove this attachment? This action cannot be undone."
                confirmText="Remove"
                cancelText="Cancel"
                onConfirm={() => {
                    setAttachmentFile(null);
                    handleInputChange('attachment', '');
                    setShowDeleteAttachmentConfirm(false);
                }}
                onCancel={() => setShowDeleteAttachmentConfirm(false)}
                type="danger"
            />

            {/* Material Design Date/Time Pickers - Both Platforms */}
            {showStartDateModal && (
                Platform.OS === 'android' ? (
                    <DateTimePicker
                        value={tempStartDate}
                        mode="date"
                        display="default"
                        minimumDate={new Date()}
                        onChange={(event, date) => {
                            // On Android, event.type can be 'set' (confirmed) or 'dismissed' (cancelled)
                            if (event.type === 'dismissed' || !date) {
                                setShowStartDateModal(false);
                                return;
                            }
                            // Process the selected date (user confirmed selection)
                            if (date) {
                                // Validate: Cannot select past dates
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const selectedDate = new Date(date);
                                selectedDate.setHours(0, 0, 0, 0);

                                if (selectedDate < today) {
                                    Alert.alert(
                                        'Invalid Date',
                                        'Cannot select past dates. Please select today or a future date.',
                                        [{text: 'OK'}]
                                    );
                                    return;
                                }

                                setTempStartDate(date);
                                setShowStartDateModal(false);
                                handleStartDateSave(date);
                            }
                        }}
                    />
                ) : (
                    <Modal
                        visible={true}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowStartDateModal(false)}
                    >
                        <View style={styles.templateModalOverlay}>
                            <TouchableOpacity
                                style={StyleSheet.absoluteFill}
                                activeOpacity={1}
                                onPress={() => setShowStartDateModal(false)}
                            />
                            <View
                                style={[styles.dateTimeModalContainer, isDarkMode && styles.dateTimeModalContainerDark]}
                                onStartShouldSetResponder={() => true}>
                                <View style={styles.dragHandleContainer}>
                                    <View style={[styles.dragHandle, isDarkMode && styles.dragHandleDark]}/>
                                </View>
                                <View style={styles.dateTimeModalHeader}>
                                    <Text
                                        style={[styles.dateTimeModalTitle, isDarkMode && styles.dateTimeModalTitleDark]}>Select
                                        Start Date</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowStartDateModal(false)}
                                        style={styles.modalCloseButton}
                                    >
                                        <Feather name="x" size={24} color={isDarkMode ? '#FFFFFF' : '#1A1D1F'}/>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempStartDate}
                                    mode="date"
                                    display="spinner"
                                    minimumDate={new Date()}
                                    onChange={(event, date) => {
                                        if (event.type === 'dismissed') {
                                            setShowStartDateModal(false);
                                            return;
                                        }
                                        if (date) {
                                            // Validate: Cannot select past dates
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const selectedDate = new Date(date);
                                            selectedDate.setHours(0, 0, 0, 0);

                                            if (selectedDate < today) {
                                                Alert.alert(
                                                    'Invalid Date',
                                                    'Cannot select past dates. Please select today or a future date.',
                                                    [{text: 'OK'}]
                                                );
                                                return;
                                            }

                                            setTempStartDate(date);
                                        }
                                    }}
                                    style={styles.dateTimePicker}
                                    themeVariant={isDarkMode ? 'dark' : 'light'}
                                />
                                <View style={styles.dateTimeModalActions}>
                                    <TouchableOpacity
                                        style={[styles.dateTimeModalButton, styles.cancelButton, isDarkMode && styles.cancelButtonDark]}
                                        onPress={() => setShowStartDateModal(false)}
                                    >
                                        <Text
                                            style={[styles.cancelButtonText, isDarkMode && styles.cancelButtonTextDark]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.dateTimeModalButton, styles.dateTimeChooseButton]}
                                        onPress={() => {
                                            setShowStartDateModal(false);
                                            handleStartDateSave();
                                        }}
                                    >
                                        <Text style={styles.dateTimeChooseButtonText}>Choose</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )
            )}

            {showStartTimeModal && (
                Platform.OS === 'android' ? (
                    <DateTimePicker
                        value={tempStartTime}
                        mode="time"
                        display="default"
                        onChange={(event, time) => {
                            // On Android, event.type can be 'set' (confirmed) or 'dismissed' (cancelled)
                            if (event.type === 'dismissed' || !time) {
                                setShowStartTimeModal(false);
                                return;
                            }
                            // Process the selected time (user confirmed selection)
                            if (time) {
                                // Validate: If start date is today, time cannot be in the past
                                const now = new Date();
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const startDate = formData.startDate
                                    ? new Date(
                                        formData.startDate.split('/')[2] +
                                        '-' +
                                        formData.startDate.split('/')[0] +
                                        '-' +
                                        formData.startDate.split('/')[1]
                                    )
                                    : new Date();
                                startDate.setHours(0, 0, 0, 0);

                                if (startDate.getTime() === today.getTime()) {
                                    // Same day - check if time is in the past
                                    const selectedDateTime = new Date(startDate);
                                    selectedDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

                                    if (selectedDateTime < now) {
                                        Alert.alert(
                                            'Invalid Time',
                                            'Start time cannot be in the past. Please select a future time.',
                                            [{text: 'OK'}]
                                        );
                                        return;
                                    }
                                }

                                setTempStartTime(time);
                                setShowStartTimeModal(false);
                                handleStartTimeSave(time);
                            }
                        }}
                    />
                ) : (
                    <Modal
                        visible={true}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowStartTimeModal(false)}
                    >
                        <View style={styles.templateModalOverlay}>
                            <TouchableOpacity
                                style={StyleSheet.absoluteFill}
                                activeOpacity={1}
                                onPress={() => setShowStartTimeModal(false)}
                            />
                            <View
                                style={[styles.dateTimeModalContainer, isDarkMode && styles.dateTimeModalContainerDark]}
                                onStartShouldSetResponder={() => true}>
                                <View style={styles.dragHandleContainer}>
                                    <View style={[styles.dragHandle, isDarkMode && styles.dragHandleDark]}/>
                                </View>
                                <View style={styles.dateTimeModalHeader}>
                                    <Text
                                        style={[styles.dateTimeModalTitle, isDarkMode && styles.dateTimeModalTitleDark]}>Select
                                        Start Time</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowStartTimeModal(false)}
                                        style={styles.modalCloseButton}
                                    >
                                        <Feather name="x" size={24} color={isDarkMode ? '#FFFFFF' : '#1A1D1F'}/>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempStartTime}
                                    mode="time"
                                    display="spinner"
                                    onChange={(event, time) => {
                                        if (event.type === 'dismissed') {
                                            setShowStartTimeModal(false);
                                            return;
                                        }
                                        if (time) {
                                            // Validate: If start date is today, time cannot be in the past
                                            const now = new Date();
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const startDate = formData.startDate
                                                ? new Date(
                                                    formData.startDate.split('/')[2] +
                                                    '-' +
                                                    formData.startDate.split('/')[0] +
                                                    '-' +
                                                    formData.startDate.split('/')[1]
                                                )
                                                : new Date();
                                            startDate.setHours(0, 0, 0, 0);

                                            if (startDate.getTime() === today.getTime()) {
                                                // Same day - check if time is in the past
                                                const selectedDateTime = new Date(startDate);
                                                selectedDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

                                                if (selectedDateTime < now) {
                                                    Alert.alert(
                                                        'Invalid Time',
                                                        'Start time cannot be in the past. Please select a future time.',
                                                        [{text: 'OK'}]
                                                    );
                                                    return;
                                                }
                                            }

                                            setTempStartTime(time);
                                        }
                                    }}
                                    style={styles.dateTimePicker}
                                    themeVariant={isDarkMode ? 'dark' : 'light'}
                                />
                                <View style={styles.dateTimeModalActions}>
                                    <TouchableOpacity
                                        style={[styles.dateTimeModalButton, styles.cancelButton, isDarkMode && styles.cancelButtonDark]}
                                        onPress={() => setShowStartTimeModal(false)}
                                    >
                                        <Text
                                            style={[styles.cancelButtonText, isDarkMode && styles.cancelButtonTextDark]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.dateTimeModalButton, styles.dateTimeChooseButton]}
                                        onPress={() => {
                                            setShowStartTimeModal(false);
                                            handleStartTimeSave();
                                        }}
                                    >
                                        <Text style={styles.dateTimeChooseButtonText}>Choose</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )
            )}

            {showEndDateModal && (
                Platform.OS === 'android' ? (
                    <DateTimePicker
                        value={tempEndDate}
                        mode="date"
                        display="default"
                        minimumDate={
                            formData.startDate
                                ? new Date(
                                    formData.startDate.split('/')[2] +
                                    '-' +
                                    formData.startDate.split('/')[0] +
                                    '-' +
                                    formData.startDate.split('/')[1]
                                )
                                : new Date()
                        }
                        onChange={(event, date) => {
                            // On Android, event.type can be 'set' (confirmed) or 'dismissed' (cancelled)
                            if (event.type === 'dismissed' || !date) {
                                setShowEndDateModal(false);
                                return;
                            }
                            // Process the selected date (user confirmed selection)
                            if (date) {
                                // Validate: End date cannot be before start date
                                if (formData.startDate) {
                                    const startDate = new Date(
                                        formData.startDate.split('/')[2] +
                                        '-' +
                                        formData.startDate.split('/')[0] +
                                        '-' +
                                        formData.startDate.split('/')[1]
                                    );
                                    startDate.setHours(0, 0, 0, 0);
                                    const endDate = new Date(date);
                                    endDate.setHours(0, 0, 0, 0);

                                    if (endDate < startDate) {
                                        Alert.alert(
                                            'Invalid Date',
                                            'End date cannot be before start date. Please select a later date.',
                                            [{text: 'OK'}]
                                        );
                                        return;
                                    }
                                }

                                // Validate: Cannot select past dates
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const selectedDate = new Date(date);
                                selectedDate.setHours(0, 0, 0, 0);

                                if (selectedDate < today) {
                                    Alert.alert(
                                        'Invalid Date',
                                        'Cannot select past dates. Please select today or a future date.',
                                        [{text: 'OK'}]
                                    );
                                    return;
                                }

                                setTempEndDate(date);
                                setShowEndDateModal(false);
                                handleEndDateSave(date);
                            }
                        }}
                    />
                ) : (
                    <Modal
                        visible={true}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowEndDateModal(false)}
                    >
                        <View style={styles.templateModalOverlay}>
                            <TouchableOpacity
                                style={StyleSheet.absoluteFill}
                                activeOpacity={1}
                                onPress={() => setShowEndDateModal(false)}
                            />
                            <View
                                style={[styles.dateTimeModalContainer, isDarkMode && styles.dateTimeModalContainerDark]}
                                onStartShouldSetResponder={() => true}>
                                <View style={styles.dragHandleContainer}>
                                    <View style={[styles.dragHandle, isDarkMode && styles.dragHandleDark]}/>
                                </View>
                                <View style={styles.dateTimeModalHeader}>
                                    <Text
                                        style={[styles.dateTimeModalTitle, isDarkMode && styles.dateTimeModalTitleDark]}>Select
                                        End Date</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowEndDateModal(false)}
                                        style={styles.modalCloseButton}
                                    >
                                        <Feather name="x" size={24} color={isDarkMode ? '#FFFFFF' : '#1A1D1F'}/>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempEndDate}
                                    mode="date"
                                    display="spinner"
                                    minimumDate={
                                        formData.startDate
                                            ? new Date(
                                                formData.startDate.split('/')[2] +
                                                '-' +
                                                formData.startDate.split('/')[0] +
                                                '-' +
                                                formData.startDate.split('/')[1]
                                            )
                                            : new Date()
                                    }
                                    onChange={(event, date) => {
                                        if (event.type === 'dismissed') {
                                            setShowEndDateModal(false);
                                            return;
                                        }
                                        if (date) {
                                            // Validate: End date cannot be before start date
                                            if (formData.startDate) {
                                                const startDate = new Date(
                                                    formData.startDate.split('/')[2] +
                                                    '-' +
                                                    formData.startDate.split('/')[0] +
                                                    '-' +
                                                    formData.startDate.split('/')[1]
                                                );
                                                startDate.setHours(0, 0, 0, 0);
                                                const endDate = new Date(date);
                                                endDate.setHours(0, 0, 0, 0);

                                                if (endDate < startDate) {
                                                    Alert.alert(
                                                        'Invalid Date',
                                                        'End date cannot be before start date. Please select a later date.',
                                                        [{text: 'OK'}]
                                                    );
                                                    return;
                                                }
                                            }

                                            // Validate: Cannot select past dates
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const selectedDate = new Date(date);
                                            selectedDate.setHours(0, 0, 0, 0);

                                            if (selectedDate < today) {
                                                Alert.alert(
                                                    'Invalid Date',
                                                    'Cannot select past dates. Please select today or a future date.',
                                                    [{text: 'OK'}]
                                                );
                                                return;
                                            }

                                            setTempEndDate(date);
                                        }
                                    }}
                                    style={styles.dateTimePicker}
                                    themeVariant={isDarkMode ? 'dark' : 'light'}
                                />
                                <View style={styles.dateTimeModalActions}>
                                    <TouchableOpacity
                                        style={[styles.dateTimeModalButton, styles.cancelButton, isDarkMode && styles.cancelButtonDark]}
                                        onPress={() => setShowEndDateModal(false)}
                                    >
                                        <Text
                                            style={[styles.cancelButtonText, isDarkMode && styles.cancelButtonTextDark]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.dateTimeModalButton, styles.dateTimeChooseButton]}
                                        onPress={() => {
                                            setShowEndDateModal(false);
                                            handleEndDateSave();
                                        }}
                                    >
                                        <Text style={styles.dateTimeChooseButtonText}>Choose</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )
            )}

            {showEndTimeModal && (
                Platform.OS === 'android' ? (
                    <DateTimePicker
                        value={tempEndTime}
                        mode="time"
                        display="default"
                        onChange={(event, time) => {
                            // On Android, event.type can be 'set' (confirmed) or 'dismissed' (cancelled)
                            if (event.type === 'dismissed') {
                                setShowEndTimeModal(false);
                                return;
                            }
                            // Only process if time is provided (user confirmed selection)
                            if (time && event.type === 'set') {
                                // Validate: If end date is today, time cannot be in the past
                                const now = new Date();
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const endDate = formData.endDate
                                    ? new Date(
                                        formData.endDate.split('/')[2] +
                                        '-' +
                                        formData.endDate.split('/')[0] +
                                        '-' +
                                        formData.endDate.split('/')[1]
                                    )
                                    : formData.startDate
                                        ? new Date(
                                            formData.startDate.split('/')[2] +
                                            '-' +
                                            formData.startDate.split('/')[0] +
                                            '-' +
                                            formData.startDate.split('/')[1]
                                        )
                                        : new Date();
                                endDate.setHours(0, 0, 0, 0);

                                if (endDate.getTime() === today.getTime()) {
                                    // Same day - check if time is in the past
                                    const selectedDateTime = new Date(endDate);
                                    selectedDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

                                    if (selectedDateTime < now) {
                                        Alert.alert(
                                            'Invalid Time',
                                            'End time cannot be in the past. Please select a future time.',
                                            [{text: 'OK'}]
                                        );
                                        return;
                                    }
                                }

                                // Validate: End time must be after start time if same date
                                if (formData.startDate && formData.startTime) {
                                    const startDate = new Date(
                                        formData.startDate.split('/')[2] +
                                        '-' +
                                        formData.startDate.split('/')[0] +
                                        '-' +
                                        formData.startDate.split('/')[1]
                                    );
                                    const endDateValue = formData.endDate
                                        ? new Date(
                                            formData.endDate.split('/')[2] +
                                            '-' +
                                            formData.endDate.split('/')[0] +
                                            '-' +
                                            formData.endDate.split('/')[1]
                                        )
                                        : startDate;
                                    startDate.setHours(0, 0, 0, 0);
                                    endDateValue.setHours(0, 0, 0, 0);

                                    if (startDate.getTime() === endDateValue.getTime()) {
                                        // Same date - check if end time is after start time
                                        const [startHours, startMinutes] = formData.startTime.split(':');
                                        const startDateTime = new Date(startDate);
                                        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

                                        const endDateTime = new Date(endDateValue);
                                        endDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

                                        // Calculate difference in milliseconds
                                        const diffMs = endDateTime.getTime() - startDateTime.getTime();
                                        const diffMinutes = diffMs / (1000 * 60);

                                        if (endDateTime <= startDateTime) {
                                            Alert.alert(
                                                'Invalid Time',
                                                'End time must be after start time.',
                                                [{text: 'OK'}]
                                            );
                                            return;
                                        }

                                        // Validate: Minimum 30 minutes difference
                                        if (diffMinutes < 30) {
                                            Alert.alert(
                                                'Invalid Time',
                                                'End time must be at least 30 minutes after start time.',
                                                [{text: 'OK'}]
                                            );
                                            return;
                                        }
                                    }
                                }

                                setTempEndTime(time);
                                setShowEndTimeModal(false);
                                handleEndTimeSave(time);
                            }
                        }}
                    />
                ) : (
                    <Modal
                        visible={true}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowEndTimeModal(false)}
                    >
                        <View style={styles.templateModalOverlay}>
                            <TouchableOpacity
                                style={StyleSheet.absoluteFill}
                                activeOpacity={1}
                                onPress={() => setShowEndTimeModal(false)}
                            />
                            <View
                                style={[styles.dateTimeModalContainer, isDarkMode && styles.dateTimeModalContainerDark]}
                                onStartShouldSetResponder={() => true}>
                                <View style={styles.dragHandleContainer}>
                                    <View style={[styles.dragHandle, isDarkMode && styles.dragHandleDark]}/>
                                </View>
                                <View style={styles.dateTimeModalHeader}>
                                    <Text
                                        style={[styles.dateTimeModalTitle, isDarkMode && styles.dateTimeModalTitleDark]}>Select
                                        End Time</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowEndTimeModal(false)}
                                        style={styles.modalCloseButton}
                                    >
                                        <Feather name="x" size={24} color={isDarkMode ? '#FFFFFF' : '#1A1D1F'}/>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempEndTime}
                                    mode="time"
                                    display="spinner"
                                    onChange={(event, time) => {
                                        // On Android, event.type can be 'set' (confirmed) or 'dismissed' (cancelled)
                                        if (event.type === 'dismissed' || !time) {
                                            setShowEndTimeModal(false);
                                            return;
                                        }
                                        // Process the selected time (user confirmed selection)
                                        if (time) {
                                            // Validate: If end date is today, time cannot be in the past
                                            const now = new Date();
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const endDate = formData.endDate
                                                ? new Date(
                                                    formData.endDate.split('/')[2] +
                                                    '-' +
                                                    formData.endDate.split('/')[0] +
                                                    '-' +
                                                    formData.endDate.split('/')[1]
                                                )
                                                : formData.startDate
                                                    ? new Date(
                                                        formData.startDate.split('/')[2] +
                                                        '-' +
                                                        formData.startDate.split('/')[0] +
                                                        '-' +
                                                        formData.startDate.split('/')[1]
                                                    )
                                                    : new Date();
                                            endDate.setHours(0, 0, 0, 0);

                                            if (endDate.getTime() === today.getTime()) {
                                                // Same day - check if time is in the past
                                                const selectedDateTime = new Date(endDate);
                                                selectedDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

                                                if (selectedDateTime < now) {
                                                    Alert.alert(
                                                        'Invalid Time',
                                                        'End time cannot be in the past. Please select a future time.',
                                                        [{text: 'OK'}]
                                                    );
                                                    return;
                                                }
                                            }

                                            // Validate: End time must be after start time if same date
                                            if (formData.startDate && formData.startTime) {
                                                const startDate = new Date(
                                                    formData.startDate.split('/')[2] +
                                                    '-' +
                                                    formData.startDate.split('/')[0] +
                                                    '-' +
                                                    formData.startDate.split('/')[1]
                                                );
                                                const endDateValue = formData.endDate
                                                    ? new Date(
                                                        formData.endDate.split('/')[2] +
                                                        '-' +
                                                        formData.endDate.split('/')[0] +
                                                        '-' +
                                                        formData.endDate.split('/')[1]
                                                    )
                                                    : startDate;
                                                startDate.setHours(0, 0, 0, 0);
                                                endDateValue.setHours(0, 0, 0, 0);

                                                if (startDate.getTime() === endDateValue.getTime()) {
                                                    // Same date - check if end time is after start time
                                                    const [startHours, startMinutes] = formData.startTime.split(':');
                                                    const startDateTime = new Date(startDate);
                                                    startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

                                                    const endDateTime = new Date(endDateValue);
                                                    endDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

                                                    // Calculate difference in milliseconds
                                                    const diffMs = endDateTime.getTime() - startDateTime.getTime();
                                                    const diffMinutes = diffMs / (1000 * 60);

                                                    if (endDateTime <= startDateTime) {
                                                        Alert.alert(
                                                            'Invalid Time',
                                                            'End time must be after start time.',
                                                            [{text: 'OK'}]
                                                        );
                                                        return;
                                                    }

                                                    // Validate: Minimum 30 minutes difference
                                                    if (diffMinutes < 30) {
                                                        Alert.alert(
                                                            'Invalid Time',
                                                            'End time must be at least 30 minutes after start time.',
                                                            [{text: 'OK'}]
                                                        );
                                                        return;
                                                    }
                                                }
                                            }

                                            setTempEndTime(time);
                                        }
                                    }}
                                    style={styles.dateTimePicker}
                                    themeVariant={isDarkMode ? 'dark' : 'light'}
                                />
                                <View style={styles.dateTimeModalActions}>
                                    <TouchableOpacity
                                        style={[styles.dateTimeModalButton, styles.cancelButton, isDarkMode && styles.cancelButtonDark]}
                                        onPress={() => setShowEndTimeModal(false)}
                                    >
                                        <Text
                                            style={[styles.cancelButtonText, isDarkMode && styles.cancelButtonTextDark]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.dateTimeModalButton, styles.dateTimeChooseButton]}
                                        onPress={() => {
                                            setShowEndTimeModal(false);
                                            handleEndTimeSave();
                                        }}
                                    >
                                        <Text style={styles.dateTimeChooseButtonText}>Choose</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )
            )}
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
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1A1D1F',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    placeholderText: {
        color: '#9CA3AF',
        fontSize: 16,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    dateTimeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    dateTimeInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateTimeText: {
        color: '#9CA3AF',
        fontSize: 16,
    },
    dateTimeTextSelected: {
        color: '#1A1D1F',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#1A1D1F',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#1A1D1F',
        fontWeight: '400',
    },
    attachmentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    attachmentInput: {
        flex: 1,
    },
    attachmentButton: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    attachmentPreviewContainer: {
        gap: 12,
    },
    imagePreviewContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    attachmentPreviewImage: {
        width: '100%',
        height: 200,
        backgroundColor: '#F9FAFB',
    },
    removeAttachmentButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    fileSize: {
        fontSize: 12,
        color: '#6B7280',
    },
    removeAttachmentButtonSmall: {
        padding: 8,
    },
    changeAttachmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    changeAttachmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B4513',
    },
    saveButton: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    // Label Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    labelModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 1000,
    },
    labelModalTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#9CA3AF',
        marginBottom: 16,
    },
    labelsList: {
        gap: 0,
    },
    labelsLoadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelsLoadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    labelsEmptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelsEmptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    labelsEmptySubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    labelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    labelColorBar: {
        width: 4,
        height: 24,
        borderRadius: 2,
        marginRight: 12,
    },
    labelItemText: {
        fontSize: 16,
        color: '#1A1D1F',
        fontWeight: '400',
    },
    labelInputContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    labelLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectedLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectedLabelText: {
        fontSize: 16,
        color: '#1A1D1F',
    },
    // Repeat Modal Styles
    repeatModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 1000,
    },
    repeatModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    repeatModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    modalCloseButton: {
        padding: 4,
    },
    repeatSection: {
        marginBottom: 24,
    },
    repeatSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 12,
    },
    radioGroup: {
        gap: 12,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#1A1D1F',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#1A1D1F',
    },
    radioLabel: {
        fontSize: 16,
        color: '#1A1D1F',
        fontWeight: '400',
    },
    repeatIntervalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    repeatIntervalText: {
        fontSize: 16,
        color: '#1A1D1F',
    },
    repeatIntervalInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: '#1A1D1F',
        minWidth: 50,
        textAlign: 'center',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayCheckbox: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
        minWidth: 80,
        alignItems: 'center',
    },
    dayCheckboxSelected: {
        backgroundColor: '#8B4513',
        borderColor: '#8B4513',
    },
    dayCheckboxText: {
        fontSize: 14,
        color: '#1A1D1F',
        fontWeight: '500',
    },
    dayCheckboxTextSelected: {
        color: '#fff',
    },
    endAfterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    endAfterInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: '#1A1D1F',
        minWidth: 60,
        textAlign: 'center',
    },
    // Date/Time Picker Modal Styles
    dateTimeModalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        minHeight: '50%',
        width: '100%',
        padding: 24,
        paddingBottom: 40,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateTimeModalContainerDark: {
        backgroundColor: '#1F2937',
    },
    dateTimeModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    dateTimeModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    dateTimeModalTitleDark: {
        color: '#FFFFFF',
    },
    dateTimePicker: {
        width: '100%',
        flex: 1,
        marginVertical: 20,
        alignSelf: 'center',
    },
    dateTimeModalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    fieldHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    chooseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FFF7ED',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F6B8A3',
    },
    chooseButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8B4513',
    },
    templateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    templateModalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        minHeight: '70%',
        paddingBottom: 40,
        flexDirection: 'column',
    },
    templateModalContainerDark: {
        backgroundColor: '#1F2937',
    },
    dragHandleContainer: {
        paddingTop: 12,
        paddingBottom: 8,
        alignItems: 'center',
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
    },
    dragHandleDark: {
        backgroundColor: '#6B7280',
    },
    templateModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    templateModalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    templateModalTitleDark: {
        color: '#FFFFFF',
    },
    templateTabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 8,
    },
    templateTab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    templateTabActive: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    templateTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    templateTabTextActive: {
        color: '#1A1D1F',
        fontWeight: '600',
    },
    templatesList: {
        flex: 1,
    },
    templatesListContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
    },
    templatesLoadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    templatesLoadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    templatesEmptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    templatesEmptyText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    templateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    templateItemContent: {
        flex: 1,
        marginRight: 12,
    },
    templateItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 4,
    },
    templateItemDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    templateItemMitigation: {
        fontSize: 12,
        color: '#8B4513',
        marginTop: 4,
        fontStyle: 'italic',
    },
    dateTimeModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    cancelButtonDark: {
        backgroundColor: '#374151',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    cancelButtonTextDark: {
        color: '#FFFFFF',
    },
    dateTimeChooseButton: {
        backgroundColor: '#F6B8A3',
    },
    dateTimeChooseButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    required: {
        color: '#EF4444',
        fontSize: 14,
    },
    inputError: {
        borderColor: '#EF4444',
        borderWidth: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280',
    },
});

