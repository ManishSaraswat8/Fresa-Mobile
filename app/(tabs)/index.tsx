import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useState, useEffect, useCallback} from 'react';
import {useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {updateUser} from '@/slices/userSlice';
import {getProfile} from '@/services/profileService';
import {
    getPatientTasks,
    getTodayTasks,
    getWeekTasks,
    getMonthTasks,
    formatTaskTime,
    getStatusColor,
    getStatusLabel,
    Task
} from '@/services/dashboardService';
import {websocketService} from '@/services/websocketService';
import Toast from 'react-native-toast-message';

export default function HomeScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [showDropdown, setShowDropdown] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const day = today.getDay();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - day);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    });
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Connect to WebSocket and set up real-time updates
    useEffect(() => {
        // Connect to WebSocket
        websocketService.connect();

        // Listen for task updates
        const handleTaskUpdate = (data: any) => {
            console.log('📨 [Dashboard] Received task update:', data);
            if (data.action === 'created' || data.action === 'updated') {
                // Reload tasks when a new task is created or updated
                loadDashboardData(false); // Don't show loading spinner for real-time updates
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

    // Load user profile and tasks on mount and when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('🔄 [Dashboard] Screen focused, reloading data...');
            loadDashboardData();
        }, [])
    );

    // Reload tasks when view mode changes
    useEffect(() => {
        if (tasks.length > 0) {
            // Tasks already loaded, just update view
        }
    }, [viewMode]);

    const loadDashboardData = async (showLoading = true) => {
        try {
            if (showLoading) {
                setIsLoading(true);
            } else {
                setRefreshing(true);
            }

            // Load profile
            const profile = await getProfile();
            if (profile) {
                dispatch(updateUser({
                    name: profile.name,
                    email: profile.email,
                }));
            }

            // Load tasks
            console.log('📥 [Dashboard] Fetching tasks from API...');
            const allTasks = await getPatientTasks();
            console.log('✅ [Dashboard] Received tasks:', allTasks.length);
            setTasks(allTasks);
        } catch (error: any) {
            console.error('❌ [Dashboard] Error loading dashboard data:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load dashboard data',
                position: 'top',
            });
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        loadDashboardData(false);
    };

    const todayTasks = getTodayTasks(tasks);
    const weekTasks = getWeekTasks(tasks);
    const monthTasks = getMonthTasks(tasks);

    // Filter tasks by selected date - only show tasks that START on the selected date
    const getTasksForDate = (date: Date): Task[] => {
        // Normalize selected date to start of day for accurate comparison
        const selectedDateNormalized = new Date(date);
        selectedDateNormalized.setHours(0, 0, 0, 0);
        const selectedDateStr = selectedDateNormalized.toDateString();

        return tasks.filter(task => {
            // Primary: Check time_line.start date (task scheduled start date)
            // Only include tasks that START on the selected date
            if (task.time_line?.start) {
                const taskStartDate = new Date(task.time_line.start);
                taskStartDate.setHours(0, 0, 0, 0);
                const taskStartDateStr = taskStartDate.toDateString();

                // Only include if task START date matches selected date
                return taskStartDateStr === selectedDateStr;
            }

            // Fallback: If no time_line.start, use createdAt (but only if it matches exactly)
            if (task.createdAt) {
                const taskCreatedDate = new Date(task.createdAt);
                taskCreatedDate.setHours(0, 0, 0, 0);
                return taskCreatedDate.toDateString() === selectedDateStr;
            }

            // Exclude tasks without any date information
            return false;
        });
    };

    const selectedDateTasks = getTasksForDate(selectedDate);
    const displayedTasks = viewMode === 'week' ? weekTasks : monthTasks;

    const handleViewModeChange = (mode: 'week' | 'month') => {
        setViewMode(mode);
        setShowDropdown(false);
        // Reset to current week/month when switching modes
        if (mode === 'week') {
            const today = new Date();
            const day = today.getDay();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - day);
            weekStart.setHours(0, 0, 0, 0);
            setCurrentWeekStart(weekStart);
        } else {
            const today = new Date();
            setCurrentMonth(today.getMonth());
            setCurrentYear(today.getFullYear());
        }
    };

    const goToToday = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setSelectedDate(today);

        if (viewMode === 'week') {
            const day = today.getDay();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - day);
            weekStart.setHours(0, 0, 0, 0);
            setCurrentWeekStart(weekStart);
        } else {
            setCurrentMonth(today.getMonth());
            setCurrentYear(today.getFullYear());
        }
    };

    const handleTaskPress = (taskId: string) => {
        router.push(`/(tabs)/tasks/task-details?id=${taskId}`);
    };

    const handleSeeAllTasks = () => {
        router.push('/(tabs)/tasks');
    };

    // Generate calendar days for week view
    const getWeekCalendarDays = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + i);
            date.setHours(0, 0, 0, 0);
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = date.toDateString() === selectedDate.toDateString();

            days.push({
                day: date.toLocaleDateString('en-US', {weekday: 'short'}).substring(0, 2),
                date: date.getDate().toString(),
                fullDate: new Date(date),
                active: isToday || isSelected,
                isToday,
                isSelected,
            });
        }

        return days;
    };

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newWeekStart = new Date(currentWeekStart);
        if (direction === 'prev') {
            newWeekStart.setDate(currentWeekStart.getDate() - 7);
        } else {
            newWeekStart.setDate(currentWeekStart.getDate() + 7);
        }
        setCurrentWeekStart(newWeekStart);
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
    };

    // Generate calendar for month view
    const getMonthCalendar = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            date.setHours(0, 0, 0, 0);
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = date.toDateString() === selectedDate.toDateString();
            days.push({
                date: day,
                fullDate: date,
                active: isToday || isSelected,
                isToday,
                isSelected,
            });
        }

        const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        return {days, monthName};
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
            } else {
                setCurrentMonth(currentMonth - 1);
            }
        } else {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
            } else {
                setCurrentMonth(currentMonth + 1);
            }
        }
    };

    if (isLoading) {
        return (
            <AppWrapper headerVariant="home">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F6B8A3"/>
                    <Text style={styles.loadingText}>Loading dashboard...</Text>
                </View>
            </AppWrapper>
        );
    }

    return (
        <AppWrapper
            headerVariant="home"
            refreshing={refreshing}
            onRefresh={onRefresh}
        >
            <View style={styles.content}>
                {/* Task Summary Card */}
                <TouchableOpacity
                    style={styles.taskSummaryCard}
                    onPress={handleSeeAllTasks}
                >
                    <View style={styles.taskSummaryLeft}>
                        <View style={styles.taskIconContainer}>
                            <Image
                                source={require('@/assets/icons/todayTasks.png')}
                                style={styles.taskIcon}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.taskSummaryText}>
                            You have {todayTasks.length} Task{todayTasks.length !== 1 ? 's' : ''} Today!
                        </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#fff"/>
                </TouchableOpacity>

                {/* Today's Task Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Today's task</Text>
                    <TouchableOpacity onPress={handleSeeAllTasks}>
                        <Text style={styles.seeAllText}>See All &gt;</Text>
                    </TouchableOpacity>
                </View>

                {/* Task Cards */}
                {todayTasks.length > 0 ? (
                    <>
                        {todayTasks.slice(0, 3).map((task, index) => (
                            <TouchableOpacity
                                key={task._id}
                                style={styles.taskCard}
                                onPress={() => handleTaskPress(task._id)}
                            >
                                <Text style={styles.taskTime}>{formatTaskTime(task)}</Text>
                                <View style={styles.taskHeader}>
                                    <Text style={styles.taskTitle}>{task.title || 'Untitled Task'}</Text>
                                    <View
                                        style={[styles.statusTag, {backgroundColor: getStatusColor(task.status, task) + '20'}]}>
                                        <Text style={[styles.statusText, {color: getStatusColor(task.status, task)}]}>
                                            {getStatusLabel(task.status, task)}
                                        </Text>
                                    </View>
                                </View>
                                {task.sections && task.sections.length > 0 && (
                                    <View style={styles.taskFooter}>
                                        <Text style={styles.taskDescription}>
                                            {task.sections[0]?.name || 'Task details'}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}

                        {/* Pagination Dots */}
                        {todayTasks.length > 3 && (
                            <View style={styles.pagination}>
                                {Array.from({length: Math.min(3, todayTasks.length)}).map((_, index) => (
                                    <View
                                        key={index}
                                        style={[styles.dot, index === 0 && styles.dotActive]}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No tasks for today</Text>
                        <Text style={styles.emptyStateSubtext}>You're all caught up! 🎉</Text>
                    </View>
                )}

                {/* What's up this week Section */}
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>
                            What's up this {viewMode === 'week' ? 'week' : 'month'}
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                            Total {displayedTasks.length} Activit{displayedTasks.length !== 1 ? 'ies' : 'y'} this {viewMode === 'week' ? 'week' : 'month'}!
                        </Text>
                    </View>
                    <View>
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => setShowDropdown(!showDropdown)}
                        >
                            <Text style={styles.dropdownText}>
                                {viewMode === 'week' ? 'Week' : 'Month'}
                            </Text>
                            <Feather
                                name={showDropdown ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color="#1A1D1F"
                            />
                        </TouchableOpacity>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                            <View style={styles.dropdownMenu}>
                                <TouchableOpacity
                                    style={[
                                        styles.dropdownItem,
                                        viewMode === 'week' && styles.dropdownItemActive,
                                    ]}
                                    onPress={() => handleViewModeChange('week')}
                                >
                                    <Text
                                        style={[
                                            styles.dropdownItemText,
                                            viewMode === 'week' && styles.dropdownItemTextActive,
                                        ]}
                                    >
                                        Week
                                    </Text>
                                    {viewMode === 'week' && (
                                        <Feather name="check" size={16} color="#F6B8A3"/>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.dropdownItem,
                                        viewMode === 'month' && styles.dropdownItemActive,
                                    ]}
                                    onPress={() => handleViewModeChange('month')}
                                >
                                    <Text
                                        style={[
                                            styles.dropdownItemText,
                                            viewMode === 'month' && styles.dropdownItemTextActive,
                                        ]}
                                    >
                                        Month
                                    </Text>
                                    {viewMode === 'month' && (
                                        <Feather name="check" size={16} color="#F6B8A3"/>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Calendar View */}
                {viewMode === 'week' ? (
                    <View style={styles.calendarWrapper}>
                        <View style={styles.calendarHeader}>
                            <TouchableOpacity
                                style={styles.calendarNavButton}
                                onPress={() => navigateWeek('prev')}
                            >
                                <Feather name="chevron-left" size={20} color="#1A1D1F"/>
                            </TouchableOpacity>
                            <View style={styles.calendarHeaderCenter}>
                                <Text style={styles.calendarHeaderText}>
                                    {currentWeekStart.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })} - {' '}
                                    {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </Text>
                                <TouchableOpacity
                                    style={styles.todayButton}
                                    onPress={goToToday}
                                >
                                    <Text style={styles.todayButtonText}>Today</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.calendarNavButton}
                                onPress={() => navigateWeek('next')}
                            >
                                <Feather name="chevron-right" size={20} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.calendarContainer}
                            contentContainerStyle={styles.calendarContent}
                        >
                            {getWeekCalendarDays().map((item, index) => {
                                const hasTasks = displayedTasks.some(task => {
                                    if (!task.time_line?.start) return false;
                                    const taskDate = new Date(task.time_line.start);
                                    taskDate.setHours(0, 0, 0, 0);
                                    return taskDate.toDateString() === item.fullDate.toDateString();
                                });

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.calendarDay,
                                            item.isToday && styles.calendarDayToday,
                                            item.isSelected && styles.calendarDaySelected,
                                        ]}
                                        onPress={() => handleDateSelect(item.fullDate)}
                                    >
                                        <Text
                                            style={[
                                                styles.calendarDayText,
                                                item.isToday && styles.calendarDayTextActive,
                                                item.isSelected && styles.calendarDayTextActive,
                                            ]}
                                        >
                                            {item.day}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.calendarDateText,
                                                item.isToday && styles.calendarDateTextActive,
                                                item.isSelected && styles.calendarDateTextActive,
                                            ]}
                                        >
                                            {item.date}
                                        </Text>
                                        {hasTasks && (
                                            <View style={[
                                                styles.calendarDot,
                                                (item.isToday || item.isSelected) && styles.calendarDotActive
                                            ]}/>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                ) : (
                    <View style={styles.monthView}>
                        <View style={styles.monthHeader}>
                            <TouchableOpacity
                                style={styles.calendarNavButton}
                                onPress={() => navigateMonth('prev')}
                            >
                                <Feather name="chevron-left" size={20} color="#1A1D1F"/>
                            </TouchableOpacity>
                            <View style={styles.monthHeaderCenter}>
                                <Text style={styles.monthViewText}>
                                    {getMonthCalendar().monthName}
                                </Text>
                                <TouchableOpacity
                                    style={styles.todayButton}
                                    onPress={goToToday}
                                >
                                    <Text style={styles.todayButtonText}>Today</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.calendarNavButton}
                                onPress={() => navigateMonth('next')}
                            >
                                <Feather name="chevron-right" size={20} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.monthGrid}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                                <View key={index} style={styles.monthDayHeader}>
                                    <Text style={styles.monthDayHeaderText}>{day}</Text>
                                </View>
                            ))}
                            {getMonthCalendar().days.map((day, index) => {
                                if (day === null) {
                                    return <View key={`empty-${index}`} style={styles.monthDate}/>;
                                }

                                const hasTasks = displayedTasks.some(task => {
                                    if (!task.time_line?.start) return false;
                                    const taskDate = new Date(task.time_line.start);
                                    taskDate.setHours(0, 0, 0, 0);
                                    return taskDate.toDateString() === day.fullDate.toDateString();
                                });

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.monthDate,
                                            day.isToday && styles.monthDateToday,
                                            day.isSelected && styles.monthDateSelected,
                                        ]}
                                        onPress={() => handleDateSelect(day.fullDate)}
                                    >
                                        <Text
                                            style={[
                                                styles.monthDateText,
                                                day.isToday && styles.monthDateTextToday,
                                                day.isSelected && styles.monthDateTextSelected,
                                            ]}
                                        >
                                            {day.date}
                                        </Text>
                                        {hasTasks && (
                                            <View style={[
                                                styles.monthDot,
                                                (day.isToday || day.isSelected) && styles.monthDotActive
                                            ]}/>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Selected Date Tasks Section - Always show when a date is selected */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {selectedDate.toDateString() === new Date().toDateString()
                            ? "Today's Activities"
                            : `Activities on ${selectedDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}`}
                    </Text>
                </View>

                {/* Selected Date Activity Cards */}
                {selectedDateTasks.length > 0 ? (
                    selectedDateTasks.map((task) => (
                        <TouchableOpacity
                            key={task._id}
                            style={styles.activityCard}
                            onPress={() => handleTaskPress(task._id)}
                        >
                            <Text style={styles.activityTime}>{formatTaskTime(task)}</Text>
                            <Text style={styles.activityTitle}>
                                {task.title || 'Untitled Task'}
                            </Text>
                            {task.sections && task.sections.length > 0 && (
                                <TouchableOpacity>
                                    <Text style={styles.activitySubtitle}>
                                        {task.sections[0]?.name || 'Task details'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <View style={styles.activityTags}>
                                <View style={styles.tag}>
                                    <View
                                        style={[styles.tagColor, {backgroundColor: getStatusColor(task.status, task)}]}/>
                                    <Text style={styles.tagText}>{getStatusLabel(task.status, task)}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            No activities on {selectedDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                        </Text>
                    </View>
                )}
            </View>
        </AppWrapper>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: '#f9f4f2',
    },
    taskSummaryCard: {
        backgroundColor: '#F6B8A3',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    taskSummaryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    taskIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskIcon: {
        width: 24,
        height: 24,
    },
    taskSummaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#505050',
        marginTop: 4,
    },
    seeAllText: {
        fontSize: 14,
        color: '#F6B8A3',
        fontWeight: '600',
    },
    taskCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    taskTime: {
        fontSize: 12,
        color: '#505050',
        marginBottom: 12,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    taskTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1D1F',
        flex: 1,
    },
    upcomingTag: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    upcomingText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '600',
    },
    taskFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    profileRole: {
        fontSize: 12,
        color: '#505050',
    },
    pagination: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 32,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D1D5DB',
    },
    dotActive: {
        backgroundColor: '#F6B8A3',
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#fff',
        borderRadius: 8,
        position: 'relative',
    },
    dropdownText: {
        fontSize: 14,
        color: '#1A1D1F',
        fontWeight: '500',
    },
    dropdownMenu: {
        position: 'absolute',
        top: 40,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 4,
        minWidth: 120,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1000,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 6,
    },
    dropdownItemActive: {
        backgroundColor: '#F9F4F2',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#1A1D1F',
    },
    dropdownItemTextActive: {
        color: '#F6B8A3',
        fontWeight: '600',
    },
    monthView: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    monthHeaderCenter: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    monthViewText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1D1F',
        textAlign: 'center',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    monthDayHeader: {
        width: '14.28%',
        paddingVertical: 8,
        alignItems: 'center',
    },
    monthDayHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#505050',
    },
    monthDate: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginBottom: 4,
        position: 'relative',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    monthDateToday: {
        backgroundColor: '#FFF5F0',
        borderColor: '#F6B8A3',
    },
    monthDateSelected: {
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: '#F6B8A3',
        shadowColor: '#F6B8A3',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    monthDateText: {
        fontSize: 14,
        color: '#1A1D1F',
    },
    monthDateTextToday: {
        color: '#F6B8A3',
        fontWeight: 'bold',
    },
    monthDateTextSelected: {
        color: '#F6B8A3',
        fontWeight: 'bold',
    },
    calendarWrapper: {
        marginBottom: 20,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    calendarHeaderCenter: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    calendarHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    todayButton: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
    },
    todayButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    calendarNavButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    calendarContainer: {
        marginBottom: 0,
    },
    calendarDay: {
        width: 50,
        height: 70,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        backgroundColor: '#fff',
        position: 'relative',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    calendarDayToday: {
        backgroundColor: '#FFF5F0',
        borderColor: '#F6B8A3',
    },
    calendarDaySelected: {
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: '#F6B8A3',
        shadowColor: '#F6B8A3',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    calendarDayText: {
        fontSize: 12,
        color: '#505050',
        marginBottom: 4,
        fontWeight: '500',
    },
    calendarDayTextActive: {
        color: '#F6B8A3',
        fontWeight: '600',
    },
    calendarDateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    calendarDateTextActive: {
        color: '#F6B8A3',
    },
    activityCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    activityTime: {
        fontSize: 12,
        color: '#505050',
        marginBottom: 8,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    activitySubtitle: {
        fontSize: 14,
        color: '#F6B8A3',
        marginBottom: 12,
    },
    activityTags: {
        flexDirection: 'row',
        gap: 12,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tagColor: {
        width: 12,
        height: 12,
        borderRadius: 3,
    },
    tagMine: {
        backgroundColor: '#93C5FD',
    },
    tagClinic: {
        backgroundColor: '#86EFAC',
    },
    tagText: {
        fontSize: 12,
        color: '#505050',
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
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#6B7280',
    },
    statusTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    taskDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    calendarContent: {
        paddingRight: 20,
    },
    calendarDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#F6B8A3',
        marginTop: 4,
    },
    calendarDotActive: {
        backgroundColor: '#F6B8A3',
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    monthDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#F6B8A3',
        position: 'absolute',
        bottom: 6,
    },
    monthDotActive: {
        backgroundColor: '#F6B8A3',
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});
