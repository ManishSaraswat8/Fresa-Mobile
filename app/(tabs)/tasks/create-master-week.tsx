import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    Dimensions,
    useColorScheme,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useState, useEffect, useRef} from 'react';
import {useRouter, useLocalSearchParams} from 'expo-router';
import {getTaskLabels, TaskLabel} from '@/services/templateService';
import {createMasterWeek, updateMasterWeek, getMasterWeekById} from '@/services/masterWeekService';
import Toast from 'react-native-toast-message';

interface TimeBlock {
    id: string;
    labelId: string;
    labelName: string;
    labelColor: string;
    hours: number; // Calculated from start/end time
    startTime: string; // Format: "HH:mm" (e.g., "09:00")
    endTime: string; // Format: "HH:mm" (e.g., "15:00")
}

interface DayTimeBlocks {
    [dayKey: string]: TimeBlock[];
}

export default function CreateMasterWeekScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const editMode = params.editMode === 'true';
    const masterWeekId = params.masterWeekId as string;
    const weekStartParam = params.weekStart as string;
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Track loaded master week to prevent cache issues
    const loadedMasterWeekIdRef = useRef<string | null>(null);
    const loadedWeekStartRef = useRef<string | null>(null);

    const [labels, setLabels] = useState<TaskLabel[]>([]);
    const [isLoadingLabels, setIsLoadingLabels] = useState(true);
    const [isLoadingMasterWeek, setIsLoadingMasterWeek] = useState(false);
    const [masterWeekName, setMasterWeekName] = useState('');
    const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
        if (weekStartParam) {
            return new Date(weekStartParam);
        }
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
    });
    const [dayTimeBlocks, setDayTimeBlocks] = useState<DayTimeBlocks>({});
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [showTimeBlockModal, setShowTimeBlockModal] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
    const [startTimeInput, setStartTimeInput] = useState('');
    const [endTimeInput, setEndTimeInput] = useState('');

    // Time picker states
    const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null);
    const [selectedStartMinute, setSelectedStartMinute] = useState<number | null>(null);
    const [selectedEndHour, setSelectedEndHour] = useState<number | null>(null);
    const [selectedEndMinute, setSelectedEndMinute] = useState<number | null>(null);

    // Label picker state
    const [showLabelPicker, setShowLabelPicker] = useState(false);

    // Loading state for save button
    const [isSaving, setIsSaving] = useState(false);

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const daysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Reset state when params change (different week or master week)
    useEffect(() => {
        const hasMasterWeekChanged = masterWeekId && loadedMasterWeekIdRef.current !== masterWeekId;
        const hasWeekStartChanged = weekStartParam && loadedWeekStartRef.current !== weekStartParam;

        // Reset form data when navigating to a different week or master week
        if (hasMasterWeekChanged || hasWeekStartChanged) {
            console.log('Params changed, resetting form. MasterWeekId:', masterWeekId, 'WeekStart:', weekStartParam);

            // Reset all form state
            setMasterWeekName('');
            setDayTimeBlocks({});
            setSelectedDay(null);
            setShowTimeBlockModal(false);
            setEditingBlockId(null);
            setSelectedLabel(null);
            setStartTimeInput('');
            setEndTimeInput('');
            setSelectedStartHour(null);
            setSelectedStartMinute(null);
            setSelectedEndHour(null);
            setSelectedEndMinute(null);
            setShowLabelPicker(false);

            // Update week start if provided
            if (weekStartParam) {
                const newWeekStart = new Date(weekStartParam);
                newWeekStart.setHours(0, 0, 0, 0);
                setSelectedWeekStart(newWeekStart);
            }

            // Reset refs to trigger loading
            if (masterWeekId) {
                loadedMasterWeekIdRef.current = null; // Reset to allow loading
            } else {
                loadedMasterWeekIdRef.current = null;
            }

            if (weekStartParam) {
                loadedWeekStartRef.current = null; // Reset to allow loading
            } else {
                loadedWeekStartRef.current = null;
            }
        }
    }, [masterWeekId, weekStartParam]);

    // Load labels on mount
    useEffect(() => {
        loadLabels();
    }, []);

    // Load master week data when in edit mode
    useEffect(() => {
        if (editMode && masterWeekId && loadedMasterWeekIdRef.current !== masterWeekId) {
            // Load master week if we haven't loaded this one yet
            loadMasterWeek();
        } else if (!editMode || !masterWeekId) {
            // Generate default name for new master week
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const weekStart = weekStartParam ? new Date(weekStartParam) : selectedWeekStart;
            weekStart.setHours(0, 0, 0, 0);
            setMasterWeekName(
                `Week of ${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`
            );
        }
    }, [editMode, masterWeekId, weekStartParam, selectedWeekStart]);

    const loadLabels = async () => {
        try {
            setIsLoadingLabels(true);
            const fetchedLabels = await getTaskLabels();
            setLabels(fetchedLabels);
        } catch (error: any) {
            console.error('Error loading labels:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load labels',
                position: 'top',
            });
        } finally {
            setIsLoadingLabels(false);
        }
    };

    const loadMasterWeek = async () => {
        if (!masterWeekId) return;

        // Prevent loading if already loaded
        if (loadedMasterWeekIdRef.current === masterWeekId) {
            return;
        }

        try {
            setIsLoadingMasterWeek(true);
            const masterWeek = await getMasterWeekById(masterWeekId);

            // Double-check that params haven't changed while loading
            const currentMasterWeekId = params.masterWeekId as string;
            if (currentMasterWeekId === masterWeekId) {
                setMasterWeekName(masterWeek.name);
                setDayTimeBlocks(masterWeek.timeBlocks || {});

                // Set week start date
                if (masterWeek.weekStart) {
                    const weekStartDate = new Date(masterWeek.weekStart);
                    weekStartDate.setHours(0, 0, 0, 0);
                    setSelectedWeekStart(weekStartDate);
                    loadedWeekStartRef.current = weekStartDate.toISOString();
                }

                // Mark as loaded
                loadedMasterWeekIdRef.current = masterWeekId;
            }
        } catch (error: any) {
            console.error('Error loading master week:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to load master week',
                position: 'top',
            });
        } finally {
            setIsLoadingMasterWeek(false);
        }
    };

    const getWeekDates = () => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(selectedWeekStart);
            date.setDate(selectedWeekStart.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const formatDate = (date: Date): string => {
        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${monthNames[date.getMonth()]}`;
    };

    const getDayKey = (date: Date, index: number): string => {
        return `${daysShort[index]}_${date.getDate()}`;
    };

    const formatTime = (hour: number, minute: number): string => {
        const hours = String(hour).padStart(2, '0');
        const minutes = String(minute).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const parseTimeString = (timeStr: string): { hour: number; minute: number } => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return {hour: hours, minute: minutes};
    };

    const handleDayPress = (dayKey: string) => {
        setSelectedDay(dayKey);
        setEditingBlockId(null);
        setSelectedLabel(null);
        setStartTimeInput('');
        setEndTimeInput('');
        setSelectedStartHour(null);
        setSelectedStartMinute(null);
        setSelectedEndHour(null);
        setSelectedEndMinute(null);
        setShowTimeBlockModal(true);
    };

    const calculateHours = (startTime: string, endTime: string): number => {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        const diffMinutes = endTotalMinutes - startTotalMinutes;
        return Math.round((diffMinutes / 60) * 10) / 10; // Round to 1 decimal place
    };

    const handleStartHourChange = (hour: number) => {
        setSelectedStartHour(hour);
        const minute = selectedStartMinute !== null ? selectedStartMinute : 0;
        setStartTimeInput(formatTime(hour, minute));
    };

    const handleStartMinuteChange = (minute: number) => {
        setSelectedStartMinute(minute);
        const hour = selectedStartHour !== null ? selectedStartHour : 0;
        setStartTimeInput(formatTime(hour, minute));
    };

    const handleEndHourChange = (hour: number) => {
        setSelectedEndHour(hour);
        // Update time input if minute is also selected
        if (selectedEndMinute !== null) {
            setEndTimeInput(formatTime(hour, selectedEndMinute));
        }
    };

    const handleEndMinuteChange = (minute: number) => {
        setSelectedEndMinute(minute);
        // Update time input if hour is also selected
        if (selectedEndHour !== null) {
            setEndTimeInput(formatTime(selectedEndHour, minute));
        }
    };

    const handleAddTimeBlock = () => {
        if (!selectedDay || !selectedLabel || !startTimeInput || !endTimeInput) {
            Alert.alert('Validation Error', 'Please select a label and choose start and end times');
            return;
        }

        // Validate that end time is after start time
        const start = parseTimeString(startTimeInput);
        const end = parseTimeString(endTimeInput);
        const startTotalMinutes = start.hour * 60 + start.minute;
        const endTotalMinutes = end.hour * 60 + end.minute;

        if (endTotalMinutes <= startTotalMinutes) {
            Alert.alert('Validation Error', 'End time must be after start time');
            return;
        }

        const label = labels.find(l => String(l._id || l.id) === selectedLabel);
        if (!label) return;

        const hours = calculateHours(startTimeInput, endTimeInput);

        const newBlock: TimeBlock = {
            id: editingBlockId || Date.now().toString(),
            labelId: selectedLabel,
            labelName: label.name || label.title || '',
            labelColor: label.color || '#E5E7EB',
            hours: hours,
            startTime: startTimeInput,
            endTime: endTimeInput,
        };

        setDayTimeBlocks(prev => {
            const dayBlocks = prev[selectedDay] || [];
            if (editingBlockId) {
                // Update existing block
                return {
                    ...prev,
                    [selectedDay]: dayBlocks.map(block =>
                        block.id === editingBlockId ? newBlock : block
                    ),
                };
            } else {
                // Add new block
                return {
                    ...prev,
                    [selectedDay]: [...dayBlocks, newBlock],
                };
            }
        });

        // Reset modal
        setShowTimeBlockModal(false);
        setSelectedDay(null);
        setEditingBlockId(null);
        setSelectedLabel(null);
        setStartTimeInput('');
        setEndTimeInput('');
    };

    const handleEditBlock = (dayKey: string, block: TimeBlock) => {
        setSelectedDay(dayKey);
        setEditingBlockId(block.id);
        setSelectedLabel(block.labelId);
        setStartTimeInput(block.startTime);
        setEndTimeInput(block.endTime);
        const start = parseTimeString(block.startTime);
        const end = parseTimeString(block.endTime);
        setSelectedStartHour(start.hour);
        setSelectedStartMinute(start.minute);
        setSelectedEndHour(end.hour);
        setSelectedEndMinute(end.minute);
        setShowTimeBlockModal(true);
    };

    const handleDeleteBlock = (dayKey: string, blockId: string) => {
        setDayTimeBlocks(prev => {
            const dayBlocks = prev[dayKey] || [];
            return {
                ...prev,
                [dayKey]: dayBlocks.filter(block => block.id !== blockId),
            };
        });
    };

    const handleSaveMasterWeek = async () => {
        // Prevent multiple simultaneous saves
        if (isSaving) {
            return;
        }

        if (!masterWeekName.trim()) {
            Alert.alert('Validation Error', 'Please enter a master week name');
            return;
        }

        // Validate: Cannot create master week for past weeks
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStartDate = new Date(selectedWeekStart);
        weekStartDate.setHours(0, 0, 0, 0);

        if (weekStartDate < today && !editMode) {
            Alert.alert('Validation Error', 'Cannot create master week for past dates. Please select a current or future week.');
            return;
        }

        const totalBlocks = Object.values(dayTimeBlocks).reduce((sum, blocks) => sum + blocks.length, 0);
        if (totalBlocks === 0) {
            Alert.alert('Validation Error', 'Please add at least one time block');
            return;
        }

        const weekEnd = new Date(selectedWeekStart);
        weekEnd.setDate(selectedWeekStart.getDate() + 6);

        const masterWeekData = {
            name: masterWeekName.trim(),
            weekStart: selectedWeekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
            timeBlocks: dayTimeBlocks,
        };

        setIsSaving(true);
        try {
            if (editMode && masterWeekId) {
                await updateMasterWeek(masterWeekId, masterWeekData);
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Master week updated!',
                    position: 'top',
                });
            } else {
                await createMasterWeek(masterWeekData);
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Master week created!',
                    position: 'top',
                });
            }
            // Navigate back and refresh will happen automatically via useEffect
            router.push('/(tabs)/tasks/master-week');
        } catch (error: any) {
            console.error('Error saving master week:', error);

            // Extract better error message
            let errorMessage = 'Failed to save master week';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response?.data?.errors?.[0]) {
                errorMessage = error.response.data.errors[0];
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: errorMessage,
                position: 'top',
                visibilityTime: 4000,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const getTotalHoursForDay = (dayKey: string): number => {
        const blocks = dayTimeBlocks[dayKey] || [];
        return blocks.reduce((sum, block) => sum + block.hours, 0);
    };

    const weekDates = getWeekDates();

    // Show loader while loading master week data in edit mode
    if (editMode && isLoadingMasterWeek) {
        return (
            <AppWrapper headerTitle="Edit Master Week" headerVariant="default">
                <View style={[styles.container, styles.loadingContainer]}>
                    <ActivityIndicator size="large" color="#8B4513"/>
                    <Text style={styles.loadingText}>Loading master week...</Text>
                </View>
            </AppWrapper>
        );
    }

    return (
        <AppWrapper headerTitle={editMode ? "Edit Master Week" : "Create Master Week"} headerVariant="default">
            <View style={styles.container}>
                {/* Name Input */}
                <View style={styles.nameInputContainer}>
                    <Text style={styles.nameInputLabel}>Master Week Name</Text>
                    <TextInput
                        style={styles.nameInput}
                        value={masterWeekName}
                        onChangeText={setMasterWeekName}
                        placeholder="Enter master week name"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                {/* Week Info */}
                <View style={styles.weekInfoContainer}>
                    <Text style={styles.weekInfoText}>
                        {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
                    </Text>
                </View>

                {/* Weekly Calendar with Time Blocks */}
                <ScrollView
                    style={styles.calendarContainer}
                    contentContainerStyle={styles.calendarContent}
                    showsVerticalScrollIndicator={false}
                >
                    {weekDates.map((date, index) => {
                        const dayKey = getDayKey(date, index);
                        const blocks = dayTimeBlocks[dayKey] || [];
                        const totalHours = getTotalHoursForDay(dayKey);
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                            <View
                                key={index}
                                style={[styles.dayCard, isToday && styles.dayCardToday]}
                            >
                                <View style={styles.dayHeader}>
                                    <View>
                                        <Text style={styles.dayName}>{daysShort[index]}</Text>
                                        <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
                                            {date.getDate()}
                                        </Text>
                                    </View>
                                    <View style={styles.dayStats}>
                                        <Text style={styles.totalHoursText}>
                                            {totalHours === 0 ? '0 Hours' : `${totalHours} Hours`}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.addBlockButton}
                                            onPress={() => handleDayPress(dayKey)}
                                        >
                                            <Feather name="plus" size={18} color="#8B4513"/>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Time Blocks */}
                                {blocks.length > 0 ? (
                                    <View style={styles.blocksList}>
                                        {blocks.map((block) => {
                                            const label = labels.find(l => String(l._id || l.id) === block.labelId);
                                            return (
                                                <View key={block.id} style={styles.timeBlock}>
                                                    <View
                                                        style={[
                                                            styles.blockColorBar,
                                                            {backgroundColor: block.labelColor},
                                                        ]}
                                                    />
                                                    <View style={styles.blockContent}>
                                                        <View style={styles.blockHeader}>
                                                            <Text style={styles.blockLabelName}>
                                                                {block.labelName}
                                                            </Text>
                                                            <Text style={styles.blockHours}>
                                                                {block.startTime} - {block.endTime} ({block.hours}h)
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.blockActions}>
                                                        <TouchableOpacity
                                                            style={styles.blockActionButton}
                                                            onPress={() => handleEditBlock(dayKey, block)}
                                                        >
                                                            <Feather name="edit-2" size={16} color="#3B82F6"/>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.blockActionButton}
                                                            onPress={() => handleDeleteBlock(dayKey, block.id)}
                                                        >
                                                            <Feather name="trash-2" size={16} color="#EF4444"/>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.emptyDayButton}
                                        onPress={() => handleDayPress(dayKey)}
                                    >
                                        <Feather name="plus-circle" size={20} color="#9CA3AF"/>
                                        <Text style={styles.emptyDayText}>Add time block</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSaveMasterWeek}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <View style={styles.saveButtonContent}>
                            <ActivityIndicator size="small" color="#fff"/>
                            <Text style={styles.saveButtonText}>
                                {editMode ? 'Updating...' : 'Saving...'}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {editMode ? 'Update Master Week' : 'Save Master Week'}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Time Block Modal */}
                <Modal
                    visible={showTimeBlockModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowTimeBlockModal(false)}
                    hardwareAccelerated={true}
                    statusBarTranslucent={true}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setShowTimeBlockModal(false)}
                        />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {editingBlockId ? 'Edit' : 'Add'} Time Block
                                    {selectedDay && ` - ${daysOfWeek[daysShort.indexOf(selectedDay.split('_')[0])]}`}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowTimeBlockModal(false);
                                        setSelectedDay(null);
                                        setEditingBlockId(null);
                                        setSelectedLabel(null);
                                        setStartTimeInput('');
                                        setEndTimeInput('');
                                    }}
                                    style={styles.modalCloseButton}
                                >
                                    <Feather name="x" size={24} color="#1A1D1F"/>
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={styles.modalBody}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Label Selection */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Select Label</Text>
                                    {isLoadingLabels ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="small" color="#F6B8A3"/>
                                            <Text style={styles.loadingText}>Loading labels...</Text>
                                        </View>
                                    ) : labels.length === 0 ? (
                                        <View style={styles.emptyLabelsContainer}>
                                            <Text style={styles.emptyLabelsText}>No labels available</Text>
                                            <Text style={styles.emptyLabelsSubtext}>
                                                Please create labels first
                                            </Text>
                                        </View>
                                    ) : (
                                        <View>
                                            <TouchableOpacity
                                                style={styles.labelSelectButton}
                                                onPress={() => {
                                                    setShowLabelPicker(!showLabelPicker);
                                                }}
                                            >
                                                <View style={styles.labelSelectContent}>
                                                    {selectedLabel ? (
                                                        <>
                                                            <View
                                                                style={[
                                                                    styles.labelSelectColorDot,
                                                                    {
                                                                        backgroundColor:
                                                                            labels.find(
                                                                                l => String(l._id || l.id) === selectedLabel
                                                                            )?.color || '#E5E7EB',
                                                                    },
                                                                ]}
                                                            />
                                                            <Text style={styles.labelSelectTextSelected}>
                                                                {labels.find(
                                                                        l => String(l._id || l.id) === selectedLabel
                                                                    )?.name ||
                                                                    labels.find(
                                                                        l => String(l._id || l.id) === selectedLabel
                                                                    )?.title ||
                                                                    ''}
                                                            </Text>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Feather name="tag" size={20} color="#8B4513"/>
                                                            <Text style={styles.labelSelectText}>
                                                                Select a label
                                                            </Text>
                                                        </>
                                                    )}
                                                </View>
                                                <Feather
                                                    name={showLabelPicker ? "chevron-up" : "chevron-down"}
                                                    size={20}
                                                    color="#9CA3AF"
                                                />
                                            </TouchableOpacity>
                                            {showLabelPicker && labels.length > 0 && (
                                                <View style={styles.labelDropdown}>
                                                    <ScrollView
                                                        style={styles.labelDropdownList}
                                                        nestedScrollEnabled={true}
                                                    >
                                                        {labels.map((label) => {
                                                            const labelId = String(label._id || label.id);
                                                            const isSelected = selectedLabel === labelId;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={labelId}
                                                                    style={[
                                                                        styles.labelDropdownOption,
                                                                        isSelected && styles.labelDropdownOptionSelected,
                                                                    ]}
                                                                    onPress={() => {
                                                                        setSelectedLabel(labelId);
                                                                        setShowLabelPicker(false);
                                                                    }}
                                                                >
                                                                    <View
                                                                        style={[
                                                                            styles.labelDropdownColorDot,
                                                                            {backgroundColor: label.color || '#E5E7EB'},
                                                                        ]}
                                                                    />
                                                                    <Text style={[
                                                                        styles.labelDropdownOptionText,
                                                                        isSelected && styles.labelDropdownOptionTextSelected,
                                                                    ]}>
                                                                        {label.name || label.title || ''}
                                                                    </Text>
                                                                    {isSelected && (
                                                                        <Feather name="check" size={16}
                                                                                 color="#8B4513"/>
                                                                    )}
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {/* Start Time Selection */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Start Time</Text>
                                    <View style={styles.timeSelectRow}>
                                        <View style={styles.timeSelectHalf}>
                                            <View style={styles.timePickerDropdown}>
                                                <ScrollView
                                                    style={styles.timePickerScroll}
                                                    nestedScrollEnabled={true}
                                                    showsVerticalScrollIndicator={false}
                                                >
                                                    {Array.from({length: 24}, (_, i) => (
                                                        <TouchableOpacity
                                                            key={i}
                                                            style={[
                                                                styles.timePickerOption,
                                                                selectedStartHour === i && styles.timePickerOptionSelected,
                                                            ]}
                                                            onPress={() => handleStartHourChange(i)}
                                                        >
                                                            <Text style={[
                                                                styles.timePickerOptionText,
                                                                selectedStartHour === i && styles.timePickerOptionTextSelected,
                                                            ]}>
                                                                {String(i).padStart(2, '0')}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        </View>
                                        <Text style={styles.timeSeparator}>:</Text>
                                        <View style={styles.timeSelectHalf}>
                                            <View style={styles.timePickerDropdown}>
                                                <ScrollView
                                                    style={styles.timePickerScroll}
                                                    nestedScrollEnabled={true}
                                                    showsVerticalScrollIndicator={false}
                                                >
                                                    {Array.from({length: 60}, (_, i) => (
                                                        <TouchableOpacity
                                                            key={i}
                                                            style={[
                                                                styles.timePickerOption,
                                                                selectedStartMinute === i && styles.timePickerOptionSelected,
                                                            ]}
                                                            onPress={() => handleStartMinuteChange(i)}
                                                        >
                                                            <Text style={[
                                                                styles.timePickerOptionText,
                                                                selectedStartMinute === i && styles.timePickerOptionTextSelected,
                                                            ]}>
                                                                {String(i).padStart(2, '0')}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* End Time Selection */}
                                <View style={[styles.modalSection, {zIndex: 0}]}>
                                    <Text style={styles.modalSectionTitle}>End Time</Text>
                                    <View style={styles.timeSelectRow}>
                                        <View style={styles.timeSelectHalf}>
                                            <View style={[styles.timePickerDropdown, styles.timePickerDropdownUp]}>
                                                <ScrollView
                                                    style={styles.timePickerScroll}
                                                    nestedScrollEnabled={true}
                                                    showsVerticalScrollIndicator={false}
                                                >
                                                    {Array.from({length: 24}, (_, i) => (
                                                        <TouchableOpacity
                                                            key={i}
                                                            style={[
                                                                styles.timePickerOption,
                                                                selectedEndHour === i && styles.timePickerOptionSelected,
                                                            ]}
                                                            onPress={() => handleEndHourChange(i)}
                                                        >
                                                            <Text style={[
                                                                styles.timePickerOptionText,
                                                                selectedEndHour === i && styles.timePickerOptionTextSelected,
                                                            ]}>
                                                                {String(i).padStart(2, '0')}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        </View>
                                        <Text style={styles.timeSeparator}>:</Text>
                                        <View style={styles.timeSelectHalf}>
                                            <View style={[styles.timePickerDropdown, styles.timePickerDropdownUp]}>
                                                <ScrollView
                                                    style={styles.timePickerScroll}
                                                    nestedScrollEnabled={true}
                                                    showsVerticalScrollIndicator={false}
                                                >
                                                    {Array.from({length: 60}, (_, i) => (
                                                        <TouchableOpacity
                                                            key={i}
                                                            style={[
                                                                styles.timePickerOption,
                                                                selectedEndMinute === i && styles.timePickerOptionSelected,
                                                            ]}
                                                            onPress={() => handleEndMinuteChange(i)}
                                                        >
                                                            <Text style={[
                                                                styles.timePickerOptionText,
                                                                selectedEndMinute === i && styles.timePickerOptionTextSelected,
                                                            ]}>
                                                                {String(i).padStart(2, '0')}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={() => {
                                        setShowTimeBlockModal(false);
                                        setSelectedDay(null);
                                        setEditingBlockId(null);
                                        setSelectedLabel(null);
                                        setStartTimeInput('');
                                        setEndTimeInput('');
                                    }}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalSaveButton, (!selectedLabel || !startTimeInput || !endTimeInput) && styles.modalSaveButtonDisabled]}
                                    onPress={handleAddTimeBlock}
                                    disabled={!selectedLabel || !startTimeInput || !endTimeInput}
                                >
                                    <Text style={styles.modalSaveText}>
                                        {editingBlockId ? 'Update' : 'Add'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>


            </View>
        </AppWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f4f2',
    },
    nameInputContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    nameInputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    nameInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1A1D1F',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    weekInfoContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        alignItems: 'center',
    },
    weekInfoText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    calendarContainer: {
        flex: 1,
    },
    calendarContent: {
        padding: 20,
        paddingBottom: 100,
    },
    dayCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    dayCardToday: {
        borderWidth: 2,
        borderColor: '#8B4513',
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dayName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    dayDate: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1D1F',
        marginTop: 4,
    },
    dayDateToday: {
        color: '#8B4513',
    },
    dayStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    totalHoursText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8B4513',
    },
    addBlockButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blocksList: {
        gap: 8,
    },
    timeBlock: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderLeftWidth: 4,
        overflow: 'hidden',
    },
    blockColorBar: {
        width: 4,
    },
    blockContent: {
        flex: 1,
        padding: 12,
    },
    blockHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    blockLabelName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    blockHours: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B4513',
    },
    blockActions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
        gap: 8,
    },
    blockActionButton: {
        padding: 8,
    },
    emptyDayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    emptyDayText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    saveButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#8B4513',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: Dimensions.get('window').height * 0.9,
        minHeight: 400,
        paddingBottom: 20,
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
        flex: 1,
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        flex: 1,
        padding: 20,
    },
    modalSection: {
        marginBottom: 24,
        position: 'relative',
        zIndex: 1,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 12,
    },
    labelsGrid: {
        gap: 8,
    },
    labelOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: '#F9FAFB',
        gap: 12,
    },
    labelOptionSelected: {
        backgroundColor: '#FFF7ED',
        borderWidth: 2,
    },
    labelColorBar: {
        width: 4,
        height: 24,
        borderRadius: 2,
    },
    labelOptionText: {
        flex: 1,
        fontSize: 16,
        color: '#1A1D1F',
    },
    labelOptionTextSelected: {
        fontWeight: '600',
        color: '#8B4513',
    },
    timeInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1A1D1F',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    timeHint: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 8,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    emptyLabelsContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyLabelsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 4,
    },
    emptyLabelsSubtext: {
        fontSize: 12,
        color: '#6B7280',
    },
    modalActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        backgroundColor: '#FFFFFF',
        zIndex: 0,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    modalSaveButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#8B4513',
        alignItems: 'center',
    },
    modalSaveButtonDisabled: {
        backgroundColor: '#E5E7EB',
        opacity: 0.5,
    },
    modalSaveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    timeSelectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeSelectHalf: {
        flex: 1,
    },
    timeSeparator: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1A1D1F',
        marginTop: 100,
    },
    templateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    timePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
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
    dateTimeModalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: Dimensions.get('window').height * 0.9,
        minHeight: 400,
        padding: 24,
        paddingBottom: 40,
        flexDirection: 'column',
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
    timePickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        paddingHorizontal: 20,
        gap: 20,
    },
    timePickerColumn: {
        flex: 1,
        alignItems: 'center',
    },
    timePickerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 12,
    },
    timePickerLabelDark: {
        color: '#9CA3AF',
    },
    timePickerDropdown: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        maxHeight: 200,
        overflow: 'hidden',
    },
    timePickerDropdownUp: {
        // No special styling needed for upward dropdowns
    },
    timePickerScroll: {
        maxHeight: 200,
        width: '100%',
    },
    timePickerOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginVertical: 2,
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    timePickerOptionSelected: {
        backgroundColor: '#FFF7ED',
        borderWidth: 2,
        borderColor: '#8B4513',
    },
    timePickerOptionText: {
        fontSize: 14,
        color: '#1A1D1F',
    },
    timePickerOptionTextSelected: {
        fontWeight: '600',
        color: '#8B4513',
    },
    dateTimeModalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
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
    labelSelectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    labelSelectContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    labelSelectColorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    labelSelectText: {
        flex: 1,
        fontSize: 16,
        color: '#9CA3AF',
    },
    labelSelectTextSelected: {
        flex: 1,
        fontSize: 16,
        color: '#1A1D1F',
        fontWeight: '500',
    },
    labelDropdown: {
        marginTop: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1000,
    },
    labelDropdownList: {
        maxHeight: 200,
    },
    labelDropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 12,
    },
    labelDropdownOptionSelected: {
        backgroundColor: '#FFF7ED',
    },
    labelDropdownColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    labelDropdownOptionText: {
        flex: 1,
        fontSize: 14,
        color: '#1A1D1F',
    },
    labelDropdownOptionTextSelected: {
        fontWeight: '600',
        color: '#8B4513',
    },
    labelPickerModalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: Dimensions.get('window').height * 0.9,
        minHeight: 400,
        paddingBottom: 20,
    },
    labelPickerModalContainerDark: {
        backgroundColor: '#1F2937',
    },
    labelPickerList: {
        flex: 1,
        paddingHorizontal: 20,
    },
    labelPickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        marginBottom: 8,
        gap: 12,
    },
    labelPickerOptionDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    labelPickerOptionSelected: {
        backgroundColor: '#FFF7ED',
        borderWidth: 2,
        borderColor: '#8B4513',
    },
    labelPickerOptionSelectedDark: {
        backgroundColor: '#451A03',
        borderColor: '#F6B8A3',
    },
    labelPickerColorBar: {
        width: 4,
        height: 24,
        borderRadius: 2,
    },
    labelPickerOptionText: {
        flex: 1,
        fontSize: 16,
        color: '#1A1D1F',
    },
    labelPickerOptionTextDark: {
        color: '#FFFFFF',
    },
    labelPickerOptionTextSelected: {
        fontWeight: '600',
        color: '#8B4513',
    },
    labelPickerOptionTextSelectedDark: {
        fontWeight: '600',
        color: '#F6B8A3',
    },
});
