import {ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import {formatTaskTime, getPatientTasks, getStatusColor, getStatusLabel, Task} from '@/services/dashboardService';
import {websocketService} from '@/services/websocketService';
import {getUserData} from '@/services/authService';
import Toast from 'react-native-toast-message';

interface TaskBlock {
    id: string;
    day: string;
    startTime: number; // hour (0-23)
    endTime: number; // hour (0-23)
    color: 'blue' | 'yellow' | 'green';
    label?: string;
}

interface DailyTask {
    id: string;
    type: string; // Label name instead of Goal/Challenge
    description: string;
    category: string;
    categoryColor: string;
    accentColor: string;
    rightTag: string;
    rightTagColor: string;
    timeLine?: {
        start?: string;
        end?: string;
    };
}

export default function TasksScreen() {
    const router = useRouter();
    const [selectedFilter, setSelectedFilter] = useState<'All' | 'Mine' | 'Clinic' | 'Repeat'>('All');
    const [viewMode, setViewMode] = useState<'Weekly' | 'Daily'>('Weekly');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const hours = Array.from({length: 24}, (_, i) => i); // 0-23 hours

    // Load current user ID
    useEffect(() => {
        const loadCurrentUser = async () => {
            const userData = await getUserData();
            if (userData) {
                // Check both _id and id properties
                const userId = (userData as any)._id || userData.id;
                if (userId) {
                    setCurrentUserId(userId);
                    console.log('✅ [Tasks] Current user ID loaded:', userId);
                }
            }
        };
        loadCurrentUser();
    }, []);

    // Connect to WebSocket and set up real-time updates
    useEffect(() => {
        // Connect to WebSocket
        websocketService.connect();

        // Listen for task updates
        const handleTaskUpdate = (data: any) => {
            console.log('📨 [Tasks] Received task update:', data);
            if (data.action === 'created' || data.action === 'updated') {
                // Reload tasks when a new task is created or updated
                loadTasks();
                Toast.show({
                    type: 'success',
                    text1: 'Task Updated',
                    text2: `Task ${data.action === 'created' ? 'created' : 'updated'} successfully`,
                    position: 'top',
                });
            } else if (data.action === 'deleted') {
                // Remove task from list
                setTasks((prevTasks) => prevTasks.filter((t) => t._id !== data.task._id));
            }
        };

        websocketService.on('task_update', handleTaskUpdate);

        // Cleanup on unmount
        return () => {
            websocketService.off('task_update', handleTaskUpdate);
        };
    }, []);

    // Load tasks on mount and when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('🔄 [Tasks] Screen focused, reloading tasks...');
            loadTasks();
        }, [])
    );

    const loadTasks = async () => {
        try {
            setIsLoading(true);
            console.log('📥 [Tasks] Fetching tasks from API...');
            const fetchedTasks = await getPatientTasks();
            console.log('✅ [Tasks] Received tasks:', fetchedTasks.length);
            setTasks(fetchedTasks);
        } catch (error: any) {
            console.error('❌ [Tasks] Error loading tasks:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load tasks',
                position: 'top',
            });
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadTasks();
    };

    // Transform backend tasks to TaskBlock format for weekly view
    const transformTasksToBlocks = (tasks: Task[]): TaskBlock[] => {
        // Get current week's Monday (start of week)
        const now = new Date();
        const currentDay = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)); // Get Monday
        monday.setHours(0, 0, 0, 0);

        // Get Sunday (end of week)
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return tasks
            .filter(task => {
                if (!task.time_line?.start) return false;

                // Filter tasks within current week
                const taskDate = new Date(task.time_line.start);
                return taskDate >= monday && taskDate <= sunday;
            })
            .map(task => {
                const startDate = new Date(task.time_line!.start!);
                const dayIndex = startDate.getDay();
                // Convert Sunday=0 to Monday=0, Tuesday=1, etc.
                // days array: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
                // getDay(): Sunday=0, Monday=1, Tuesday=2, ..., Saturday=6
                // We want: Monday=0, Tuesday=1, ..., Sunday=6
                const day = dayIndex === 0 ? days[6] : days[dayIndex - 1];

                // Calculate start time in hours with minutes as decimal
                const startTime = startDate.getHours() + startDate.getMinutes() / 60;

                // Calculate end time
                let endTime: number;
                if (task.time_line?.end) {
                    const endDate = new Date(task.time_line.end);
                    endTime = endDate.getHours() + endDate.getMinutes() / 60;
                } else {
                    // Default to 1 hour duration if no end time
                    endTime = startTime + 1;
                }

                // Ensure minimum 30 minutes duration
                if (endTime <= startTime) {
                    endTime = startTime + 0.5; // 30 minutes
                }

                // Determine color based on status
                let color: 'blue' | 'yellow' | 'green' = 'blue';
                if (task.status === 'COMPLETED') color = 'green';
                else if (task.status === 'IN_PROGRESS') color = 'yellow';

                return {
                    id: task._id,
                    day,
                    startTime,
                    endTime,
                    color,
                    label: task.title?.substring(0, 15) || '', // Show more characters
                };
            });
    };

    // Transform backend tasks to DailyTask format for daily view
    const transformTasksToDaily = (tasks: Task[]): DailyTask[] => {
        const categoryColors: { [key: string]: { bg: string; accent: string } } = {
            'Partner': {bg: '#E9D5FF', accent: '#A855F7'},
            'Family': {bg: '#FEF3C7', accent: '#F59E0B'},
            'Career': {bg: '#FCE7F3', accent: '#EC4899'},
            'Fitness': {bg: '#D1FAE5', accent: '#10B981'},
            'Friends': {bg: '#DBEAFE', accent: '#3B82F6'},
            'Relaxation': {bg: '#FEF3C7', accent: '#F59E0B'},
        };

        return tasks.map(task => {
            // Get label name from label object (if populated) or label_id
            // Priority: label.title > label_id > sections[0].name > 'Partner'
            let labelName = 'Partner';
            if ((task as any).label?.title) {
                labelName = (task as any).label.title;
            } else if (task.label_id) {
                // If label_id exists but label not populated, use it as fallback
                labelName = String(task.label_id);
            } else if (task.sections?.[0]?.name) {
                labelName = task.sections[0].name;
            }

            const categoryInfo = categoryColors[labelName] || categoryColors['Partner'];

            // Determine type from goal_ids or challenge_ids
            const type: 'Goal' | 'Challenge' = task.goal_ids && task.goal_ids.length > 0 ? 'Goal' : 'Challenge';

            // Get description from sections or title
            const description = task.sections?.[0]?.short_description || task.title || 'No description';

            return {
                id: task._id,
                type: labelName, // Show label name instead of Goal/Challenge
                description,
                category: labelName,
                categoryColor: categoryInfo.bg,
                accentColor: categoryInfo.accent,
                rightTag: getStatusLabel(task.status, task), // Use getStatusLabel to show Missed/Upcoming/Completed
                rightTagColor: getStatusColor(task.status, task) === '#F44336' ? '#F44336' : '#F6B8A3', // Red for missed, peach for others
                timeLine: task.time_line, // Add time_line for date/time display
            };
        });
    };

    // Filter tasks based on selected filter
    const getFilteredTasks = (): Task[] => {
        let filtered = [...tasks];

        // Filter by All/Mine/Clinic/Repeat
        if (selectedFilter === 'All') {
            // All = show all tasks (no filter)
            filtered = tasks;
            console.log(`🔍 [Tasks] Filter "All": ${filtered.length} tasks`);
        } else if (selectedFilter === 'Mine') {
            // Tasks created by the user (where clinic_id is null/undefined, meaning user created it)
            filtered = tasks.filter(task => {
                // "Mine" = tasks without clinic_id (user-created tasks)
                const hasClinicId = task.clinic_id &&
                    task.clinic_id !== null &&
                    task.clinic_id !== undefined &&
                    String(task.clinic_id).trim() !== '';
                return !hasClinicId;
            });
            console.log(`🔍 [Tasks] Filter "Mine": ${filtered.length} tasks (from ${tasks.length} total)`);
        } else if (selectedFilter === 'Clinic') {
            // Tasks assigned by clinic (where clinic_id is set)
            filtered = tasks.filter(task => {
                const hasClinicId = task.clinic_id &&
                    task.clinic_id !== null &&
                    task.clinic_id !== undefined &&
                    String(task.clinic_id).trim() !== '';
                return hasClinicId;
            });
            console.log(`🔍 [Tasks] Filter "Clinic": ${filtered.length} tasks (from ${tasks.length} total)`);
        } else if (selectedFilter === 'Repeat') {
            // Tasks that are templates or part of master week (have template_id or is_template)
            filtered = tasks.filter(task => {
                const hasTemplateId = task.template_id &&
                    task.template_id !== null &&
                    task.template_id !== undefined &&
                    String(task.template_id).trim() !== '';
                const isTemplate = task.is_template === true;
                return hasTemplateId || isTemplate;
            });
            console.log(`🔍 [Tasks] Filter "Repeat": ${filtered.length} tasks (from ${tasks.length} total)`);
        }

        return filtered;
    };

    // Filter by category for daily view
    const getCategoryFilteredTasks = (): DailyTask[] => {
        const filteredTasks = getFilteredTasks();
        const dailyTasks = transformTasksToDaily(filteredTasks);

        if (selectedCategory === 'All') {
            return dailyTasks;
        }

        return dailyTasks.filter(task => task.category === selectedCategory);
    };

    // Get unique categories from tasks
    const getCategories = () => {
        const allTasks = transformTasksToDaily(tasks);
        const uniqueCategories = Array.from(new Set(allTasks.map(t => t.category)));
        return [
            {name: 'All', color: '#F6B8A3'},
            ...uniqueCategories.map(cat => {
                const categoryColors: { [key: string]: string } = {
                    'Partner': '#E9D5FF',
                    'Family': '#FEF3C7',
                    'Career': '#FCE7F3',
                    'Fitness': '#D1FAE5',
                    'Friends': '#DBEAFE',
                    'Relaxation': '#FEF3C7',
                };
                return {name: cat, color: categoryColors[cat] || '#E9D5FF'};
            }),
        ];
    };

    const categories = getCategories();
    const taskBlocks = transformTasksToBlocks(getFilteredTasks());
    const dailyTasks = getCategoryFilteredTasks();

    // Debug: Log task blocks for weekly view
    useEffect(() => {
        if (viewMode === 'Weekly') {
            console.log('📅 [Tasks] Weekly view - Task blocks:', taskBlocks.length);
            console.log('📅 [Tasks] Task blocks details:', taskBlocks);
        }
    }, [taskBlocks, viewMode]);

    // Calculate completion status
    const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalCount = tasks.length;

    const getTaskColor = (color: string) => {
        switch (color) {
            case 'blue':
                return '#93C5FD';
            case 'yellow':
                return '#FDE047';
            case 'green':
                return '#86EFAC';
            default:
                return '#93C5FD';
        }
    };

    const getTaskBorderColor = (color: string) => {
        switch (color) {
            case 'blue':
                return '#3B82F6';
            case 'yellow':
                return '#FDE047';
            case 'green':
                return '#86EFAC';
            default:
                return '#3B82F6';
        }
    };

    const getTaskPosition = (startTime: number, endTime: number) => {
        const hourHeight = 60; // Height per hour in pixels
        const top = startTime * hourHeight; // startTime is now in hours with decimals
        const height = Math.max((endTime - startTime) * hourHeight, 30); // Minimum 30px height
        return {top, height};
    };

    if (isLoading) {
        return (
            <AppWrapper headerTitle="Tasks" headerVariant="default">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F6B8A3"/>
                    <Text style={styles.loadingText}>Loading tasks...</Text>
                </View>
            </AppWrapper>
        );
    }

    return (
        <AppWrapper
            headerTitle="Tasks"
            headerVariant="default"
            refreshing={refreshing}
            onRefresh={onRefresh}
        >
            <View style={styles.container}>
                {/* Fixed Filters Section */}
                <View style={styles.fixedFiltersSection}>
                    {/* Filter Buttons */}
                    <View style={styles.filterContainer}>
                        {(['All', 'Mine', 'Clinic', 'Repeat'] as const).map((filter) => (
                            <TouchableOpacity
                                key={filter}
                                style={[
                                    styles.filterButton,
                                    selectedFilter === filter && styles.filterButtonActive,
                                ]}
                                onPress={() => setSelectedFilter(filter)}
                            >
                                <Text
                                    style={[
                                        styles.filterButtonText,
                                        selectedFilter === filter && styles.filterButtonTextActive,
                                    ]}
                                >
                                    {filter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* View Mode Selector */}
                    <View style={styles.viewModeContainer}>
                        <View style={styles.viewModeWrapper}>
                            {(['Weekly', 'Daily'] as const).map((mode, index) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[
                                        styles.viewModeSegment,
                                        viewMode === mode && styles.viewModeSegmentActive,
                                        index === 0 && styles.viewModeSegmentFirst,
                                        index === 1 && styles.viewModeSegmentLast,
                                    ]}
                                    onPress={() => setViewMode(mode)}
                                >
                                    <Text
                                        style={[
                                            styles.viewModeButtonText,
                                            viewMode === mode && styles.viewModeButtonTextActive,
                                        ]}
                                    >
                                        {mode}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Scrollable Content Area */}
                {/* Calendar Grid or Daily View */}
                {viewMode === 'Weekly' ? (
                    <View style={styles.calendarContainer}>
                        <ScrollView
                            style={styles.calendarScrollView}
                            contentContainerStyle={styles.calendarContent}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {/* Time Column */}
                            <View style={styles.timeColumn}>
                                {hours.map((hour) => (
                                    <View key={hour} style={styles.timeRow}>
                                        <Text style={styles.timeLabel}>
                                            {hour === 0
                                                ? '12 Am'
                                                : hour < 12
                                                    ? `${hour} Am`
                                                    : hour === 12
                                                        ? '12 Pm'
                                                        : `${hour - 12} Pm`}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Days and Tasks Grid */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.daysContainer}>
                                    {/* Day Headers */}
                                    <View style={styles.dayHeaders}>
                                        {days.map((day) => (
                                            <View key={day} style={styles.dayHeader}>
                                                <Text style={styles.dayHeaderText}>{day}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Grid Lines and Tasks */}
                                    <View style={styles.gridWrapper}>
                                        {/* Hour Lines - Span across all columns */}
                                        {hours.map((hour) => (
                                            <View
                                                key={hour}
                                                style={[
                                                    styles.hourLine,
                                                    {
                                                        top: hour * 60,
                                                    },
                                                ]}
                                            />
                                        ))}

                                        {/* Day Columns Container */}
                                        <View style={styles.gridContainer}>
                                            {days.map((day, dayIndex) => (
                                                <View key={day} style={styles.dayColumn}>
                                                    {/* Tasks for this day */}
                                                    {taskBlocks
                                                        .filter((task) => task.day === day)
                                                        .map((task) => {
                                                            const {top, height} = getTaskPosition(
                                                                task.startTime,
                                                                task.endTime
                                                            );
                                                            return (
                                                                <TouchableOpacity
                                                                    key={task.id}
                                                                    style={[
                                                                        styles.taskBlock,
                                                                        {
                                                                            top,
                                                                            height,
                                                                            backgroundColor: getTaskColor(task.color),
                                                                        },
                                                                    ]}
                                                                    onPress={() => router.push(`/(tabs)/tasks/task-details?id=${task.id}`)}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    {task.label && (
                                                                        <Text style={styles.taskLabel}
                                                                              numberOfLines={2}>
                                                                            {task.label}
                                                                        </Text>
                                                                    )}
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                        </ScrollView>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.dailyScrollView}
                        contentContainerStyle={styles.dailyContent}
                        showsVerticalScrollIndicator={true}
                    >
                        {/* Task Completion Status */}
                        <View style={styles.completionStatus}>
                            <Text style={styles.completionText}>
                                {completedCount} / {totalCount} completed
                            </Text>
                        </View>

                        {/* Category Filters */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.categoryScrollView}
                            contentContainerStyle={styles.categoryContainer}
                        >
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category.name}
                                    style={[
                                        styles.categoryButton,
                                        {
                                            backgroundColor:
                                                selectedCategory === category.name
                                                    ? category.color
                                                    : '#fff',
                                        },
                                    ]}
                                    onPress={() => setSelectedCategory(category.name)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryButtonText,
                                            {
                                                color:
                                                    selectedCategory === category.name
                                                        ? category.name === 'All'
                                                            ? '#1A1D1F'
                                                            : '#1A1D1F'
                                                        : '#1A1D1F',
                                            },
                                        ]}
                                    >
                                        {category.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Task Cards */}
                        {dailyTasks.length > 0 ? (
                            <View style={styles.taskCardsContainer}>
                                {dailyTasks.map((task) => (
                                    <TouchableOpacity
                                        key={task.id}
                                        style={styles.taskCard}
                                        onPress={() => router.push(`/(tabs)/tasks/task-details?id=${task.id}`)}
                                    >
                                        {/* Accent Bar */}
                                        <View
                                            style={[styles.accentBar, {backgroundColor: task.accentColor}]}
                                        />

                                        {/* Card Content */}
                                        <View style={styles.taskCardContent}>
                                            {/* Top Row - Tags */}
                                            <View style={styles.taskCardTopRow}>
                                                <View
                                                    style={[
                                                        styles.taskTypeTag,
                                                        {
                                                            backgroundColor: task.categoryColor,
                                                        },
                                                    ]}
                                                >
                                                    <Feather
                                                        name="tag"
                                                        size={12}
                                                        color={task.accentColor}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.taskTypeText,
                                                            {color: task.accentColor},
                                                        ]}
                                                    >
                                                        {task.type}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={[
                                                        styles.rightTag,
                                                        {backgroundColor: task.rightTagColor},
                                                    ]}
                                                >
                                                    <Text style={styles.rightTagText}>{task.rightTag}</Text>
                                                </View>
                                            </View>

                                            {/* Date and Time */}
                                            {task.timeLine?.start && (
                                                <Text style={styles.taskDateTime}>
                                                    {formatTaskTime({
                                                        time_line: task.timeLine,
                                                        _id: task.id,
                                                    } as Task)}
                                                </Text>
                                            )}

                                            {/* Task Description */}
                                            <Text style={styles.taskDescription}>{task.description}</Text>

                                            {/* Bottom Row - Category Tag */}
                                            <View style={styles.taskCardBottomRow}>
                                                <View
                                                    style={[
                                                        styles.categoryTag,
                                                        {backgroundColor: task.categoryColor},
                                                    ]}
                                                >
                                                    <Text
                                                        style={[styles.categoryTagText, {color: task.accentColor}]}
                                                    >
                                                        {task.category}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No tasks found</Text>
                                <Text style={styles.emptyStateSubtext}>
                                    {selectedCategory !== 'All'
                                        ? `No tasks in ${selectedCategory} category`
                                        : 'Create a new task to get started'}
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                )}

                {/* Add Task Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        setShowCreateTaskModal(true);
                    }}
                >
                    <Feather name="plus" size={24} color="#fff"/>
                </TouchableOpacity>

                {/* Create Task Modal */}
                <Modal
                    visible={showCreateTaskModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowCreateTaskModal(false)}
                    statusBarTranslucent={true}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setShowCreateTaskModal(false)}
                        />
                        <View style={styles.modalContainer}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Create Task</Text>
                                <TouchableOpacity
                                    onPress={() => setShowCreateTaskModal(false)}
                                    style={styles.modalCloseButton}
                                >
                                    <Feather name="x" size={24} color="#8B4513"/>
                                </TouchableOpacity>
                            </View>

                            {/* Modal Options */}
                            <View style={styles.modalOptions}>
                                <TouchableOpacity
                                    style={styles.modalOptionButton}
                                    onPress={() => {
                                        setShowCreateTaskModal(false);
                                        router.push('/(tabs)/tasks/create-task');
                                    }}
                                >
                                    <Text style={styles.modalOptionText}>Create New Task</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalOptionButton}
                                    onPress={() => {
                                        setShowCreateTaskModal(false);
                                        router.push('tasks/my-templates');
                                    }}
                                >
                                    <Text style={styles.modalOptionText}>Choose From Templates</Text>
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
        position: 'relative',
    },
    fixedFiltersSection: {
        backgroundColor: '#f9f4f2',
        zIndex: 10,
    },
    filterContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    filterButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minWidth: 80,
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    filterButtonTextActive: {
        color: '#1A1D1F',
        fontWeight: '600',
    },
    viewModeContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    viewModeWrapper: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    viewModeSegment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    viewModeSegmentActive: {
        backgroundColor: '#F6B8A3',
    },
    viewModeSegmentFirst: {
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    viewModeSegmentLast: {
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
    viewModeButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    viewModeButtonTextActive: {
        color: '#1A1D1F',
        fontWeight: '600',
    },
    calendarContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    calendarScrollView: {
        flex: 1,
    },
    calendarContent: {
        flexDirection: 'row',
        minHeight: 1440, // 24 hours * 60px for proper scrolling
    },
    timeColumn: {
        width: 60,
        paddingRight: 12,
    },
    timeRow: {
        height: 60,
        justifyContent: 'flex-start',
        paddingTop: 4,
    },
    timeLabel: {
        fontSize: 12,
        color: '#505050',
        fontWeight: '500',
    },
    daysContainer: {
        flex: 1,
    },
    dayHeaders: {
        flexDirection: 'row',
        paddingBottom: 8,
    },
    dayHeader: {
        width: 60,
        alignItems: 'center',
    },
    dayHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    gridWrapper: {
        position: 'relative',
        height: 1440, // 24 hours * 60px
    },
    hourLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        borderTopWidth: 1,
        borderTopColor: '#D1D5DB',
        borderStyle: 'dashed',
    },
    gridContainer: {
        flexDirection: 'row',
        position: 'relative',
        height: 1440,
    },
    dayColumn: {
        width: 60,
        position: 'relative',
        height: 1440,
    },
    taskBlock: {
        position: 'absolute',
        left: 4,
        right: 4,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 4,
        minHeight: 30,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    taskLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#1A1D1F',
        textAlign: 'left',
    },
    addButton: {
        position: 'absolute',
        top: 0,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 1003,
        zIndex: 1003,
    },
    // Daily View Styles
    dailyScrollView: {
        flex: 1,
    },
    dailyContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    completionStatus: {
        paddingVertical: 12,
    },
    completionText: {
        fontSize: 14,
        color: '#1A1D1F',
        fontWeight: '500',
    },
    categoryScrollView: {
        marginBottom: 20,
    },
    categoryContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingRight: 20,
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    categoryButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    taskCardsContainer: {
        gap: 16,
    },
    taskCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    accentBar: {
        width: 4,
    },
    taskCardContent: {
        flex: 1,
        padding: 16,
    },
    taskCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    taskTypeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    taskTypeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    rightTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    rightTagText: {
        fontSize: 12,
        color: '#1A1D1F',
        fontWeight: '500',
    },
    taskDateTime: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '400',
        marginBottom: 8,
        marginTop: -4,
    },
    taskDescription: {
        fontSize: 16,
        color: '#1A1D1F',
        fontWeight: '400',
        marginBottom: 12,
        lineHeight: 22,
    },
    taskCardBottomRow: {
        flexDirection: 'row',
    },
    categoryTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryTagText: {
        fontSize: 12,
        fontWeight: '500',
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
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 1010,
        zIndex: 1010,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalOptions: {
        gap: 12,
    },
    modalOptionButton: {
        backgroundColor: '#F9F4F2',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    modalOptionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});
