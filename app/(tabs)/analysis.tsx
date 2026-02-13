import {View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {useState, useEffect, useCallback} from 'react';
import {Feather} from '@expo/vector-icons';
import {
    getDepressionBalanceGraph,
    DepressionDataPoint,
    getSeverityColor,
    getPHQ9Severity,
    getTaskAnalyticsByLabels,
    LabelAnalytics,
    getPatientTasks,
    Task
} from '@/services/dashboardService';
import {getUserData} from '@/services/authService';
import {getMasterWeeksByDateRange, MasterWeek} from '@/services/masterWeekService';
import Toast from 'react-native-toast-message';

interface BarData {
    color: string;
    percentage: number;
    completed: number;
    total: number;
}

interface CategoryData {
    name: string;
    color: string;
    completed: number;
    total: number;
}

type AnalysisTab = 'Tasks' | 'Depression';

export default function AnalysisScreen() {
    const [activeTab, setActiveTab] = useState<AnalysisTab>('Tasks');
    const [depressionData, setDepressionData] = useState<DepressionDataPoint[]>([]);
    const [depressionLoading, setDepressionLoading] = useState(false);
    const [depressionError, setDepressionError] = useState<string | null>(null);
    const [taskAnalytics, setTaskAnalytics] = useState<LabelAnalytics[]>([]);
    const [taskLoading, setTaskLoading] = useState(false);
    const [taskError, setTaskError] = useState<string | null>(null);
    const [masterWeeks, setMasterWeeks] = useState<MasterWeek[]>([]);
    const [masterWeekLoading, setMasterWeekLoading] = useState(false);
    const [taskActivityData, setTaskActivityData] = useState<Task[]>([]);
    const [taskActivityLoading, setTaskActivityLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
        // Default to current week (Monday)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
    });

    // Calculate week start and end dates
    const getWeekDates = useCallback(() => {
        const weekStart = new Date(selectedWeekStart);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return {weekStart, weekEnd};
    }, [selectedWeekStart]);

    const {weekStart, weekEnd} = getWeekDates();
    const startDate = weekStart.toISOString().split('T')[0];
    const endDate = weekEnd.toISOString().split('T')[0];

    // Load task analytics
    const loadTaskAnalytics = useCallback(async () => {
        if (activeTab !== 'Tasks') return;

        try {
            setTaskLoading(true);
            setTaskError(null);

            const {weekStart, weekEnd} = getWeekDates();
            const startDateStr = weekStart.toISOString().split('T')[0];
            const endDateStr = weekEnd.toISOString().split('T')[0];

            const analytics = await getTaskAnalyticsByLabels(startDateStr, endDateStr);
            setTaskAnalytics(analytics);
        } catch (err: any) {
            console.error('Error loading task analytics:', err);
            setTaskError(err.message || 'Failed to load task analytics');
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Failed to load task analytics',
                position: 'top',
            });
        } finally {
            setTaskLoading(false);
        }
    }, [activeTab, selectedWeekStart, getWeekDates]);

    useEffect(() => {
        if (activeTab === 'Tasks') {
            loadTaskAnalytics();
        }
    }, [activeTab, selectedWeekStart, loadTaskAnalytics]);

    // Calculate bar data and categories from real analytics
    const calculateTaskData = () => {
        if (taskAnalytics.length === 0) {
            return {
                barData: [],
                categories: [],
                overallCompleted: 0,
                overallMissed: 0,
                overallTotal: 0,
            };
        }

        // Calculate total tasks, completed tasks, and missed tasks
        const totalTasks = taskAnalytics.reduce((sum, label) => sum + label.total, 0);
        const totalCompleted = taskAnalytics.reduce((sum, label) => sum + label.completed, 0);
        const totalMissed = totalTasks - totalCompleted;
        const overallCompleted = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
        const overallMissed = totalTasks > 0 ? Math.round((totalMissed / totalTasks) * 100) : 0;

        // Calculate percentage for each label (for bar chart)
        // Distribute bars evenly, showing percentage of total tasks
        const maxPercentage = Math.max(...taskAnalytics.map(l => l.total), 1);
        const barData: BarData[] = taskAnalytics.map((label) => {
            const percentage = maxPercentage > 0 ? Math.round((label.total / maxPercentage) * 100) : 0;
            const missed = label.total - label.completed;
            return {
                color: label.color || '#F6B8A3',
                percentage: Math.min(percentage, 100),
                completed: label.completed,
                total: label.total,
                missed: missed,
            };
        });

        // Categories for progress list
        const categories: CategoryData[] = taskAnalytics.map((label) => ({
            name: label.labelName,
            color: label.color || '#F6B8A3',
            completed: label.completed,
            total: label.total,
        }));

        return {
            barData,
            categories,
            overallCompleted,
            overallMissed,
            overallTotal: totalTasks,
        };
    };

    const {barData, categories, overallCompleted, overallMissed, overallTotal} = calculateTaskData();
    const maxBarHeight = 120;

    // Calculate actual counts for overall bars
    const totalCompleted = taskAnalytics.reduce((sum, label) => sum + label.completed, 0);
    const totalMissed = overallTotal - totalCompleted;

    // Load depression data
    const loadDepressionData = useCallback(async () => {
        if (activeTab !== 'Depression') return;

        try {
            setDepressionLoading(true);
            setDepressionError(null);

            const response = await getDepressionBalanceGraph(startDate, endDate);
            const data = response?.data || [];
            setDepressionData(data);
        } catch (err: any) {
            console.error('Error loading depression data:', err);
            setDepressionError(err.message || 'Failed to load depression data');
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Failed to load depression data',
                position: 'top',
            });
        } finally {
            setDepressionLoading(false);
        }
    }, [activeTab, startDate, endDate]);

    // Load master weeks for Master Week Graph
    const loadMasterWeeks = useCallback(async () => {
        if (activeTab !== 'Depression') return;

        try {
            setMasterWeekLoading(true);
            const weeks = await getMasterWeeksByDateRange(startDate, endDate);
            setMasterWeeks(weeks);
        } catch (err: any) {
            console.error('Error loading master weeks:', err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Failed to load master weeks',
                position: 'top',
            });
        } finally {
            setMasterWeekLoading(false);
        }
    }, [activeTab, startDate, endDate]);

    // Load task activity for Task Activity Graph
    const loadTaskActivity = useCallback(async () => {
        if (activeTab !== 'Depression') return;

        try {
            setTaskActivityLoading(true);
            const tasks = await getPatientTasks();
            // Filter tasks by date range
            const filteredTasks = tasks.filter(task => {
                if (!task.time_line?.start) return false;
                const taskDate = new Date(task.time_line.start);
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return taskDate >= start && taskDate <= end;
            });
            setTaskActivityData(filteredTasks);
        } catch (err: any) {
            console.error('Error loading task activity:', err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Failed to load task activity',
                position: 'top',
            });
        } finally {
            setTaskActivityLoading(false);
        }
    }, [activeTab, startDate, endDate]);

    useEffect(() => {
        if (activeTab === 'Depression') {
            loadDepressionData();
            loadMasterWeeks();
            loadTaskActivity();
        }
    }, [activeTab, startDate, endDate]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (activeTab === 'Depression') {
            await Promise.all([
                loadDepressionData(),
                loadMasterWeeks(),
                loadTaskActivity()
            ]);
        } else {
            await loadTaskAnalytics();
        }
        setRefreshing(false);
    }, [activeTab, loadDepressionData, loadMasterWeeks, loadTaskActivity, loadTaskAnalytics]);

    // Calculate chart dimensions for depression graph
    const maxScore = 27; // PHQ9 max score
    const chartHeight = 200;
    const chartWidth = '100%';

    // Format date for display
    const formatDate = (dateString: string | Date): string => {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    };

    // Helper function to get day key (matching master week format)
    const getDayKey = (date: Date, dayIndex: number): string => {
        const daysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return `${daysShort[dayIndex]}_${date.getDate()}`;
    };

    // Render Master Week Graph
    const renderMasterWeekGraph = () => {
        if (masterWeekLoading) {
            return (
                <View style={styles.graphSection}>
                    <Text style={styles.graphTitle}>Master Week Graph</Text>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#F6B8A3"/>
                        <Text style={styles.loadingText}>Loading master weeks...</Text>
                    </View>
                </View>
            );
        }

        // Find master week for selected week
        const selectedMasterWeek = masterWeeks.find(mw => {
            const mwStart = new Date(mw.weekStart);
            mwStart.setHours(0, 0, 0, 0);
            const selectedStart = new Date(selectedWeekStart);
            selectedStart.setHours(0, 0, 0, 0);
            return mwStart.getTime() === selectedStart.getTime();
        });

        if (!selectedMasterWeek) {
            return (
                <View style={styles.graphSection}>
                    <Text style={styles.graphTitle}>Master Week Graph</Text>
                    <View style={styles.emptyContainer}>
                        <Feather name="calendar" size={32} color="#9CA3AF"/>
                        <Text style={styles.emptyText}>No master week for this week</Text>
                        <Text style={styles.emptySubtext}>
                            Create a master week to see your planned vs actual hours
                        </Text>
                    </View>
                </View>
            );
        }

        // Get all days of the week
        const weekDays: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(selectedWeekStart);
            day.setDate(selectedWeekStart.getDate() + i);
            weekDays.push(day);
        }

        // Calculate planned vs actual hours by day
        const comparisonData = weekDays.map((day, dayIndex) => {
            const dayKey = getDayKey(day, dayIndex);
            const plannedBlocks = selectedMasterWeek.timeBlocks?.[dayKey] || [];

            // Calculate total planned hours for this day
            const totalPlanned = plannedBlocks.reduce((sum, block) => sum + (block.hours || 0), 0);

            // Get actual tasks for this day
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            // Calculate actual hours by matching planned labels
            // For each planned block, count completed tasks with matching label
            let totalActual = 0;
            const plannedLabelMap = new Map<string, number>(); // labelId -> planned hours

            plannedBlocks.forEach(block => {
                const labelId = block.labelId;
                const plannedHours = block.hours || 0;
                plannedLabelMap.set(labelId, (plannedLabelMap.get(labelId) || 0) + plannedHours);
            });

            // Get all tasks for this day (completed and not completed)
            const allDayTasks = taskActivityData.filter(task => {
                if (!task.time_line?.start) return false;
                const taskDate = new Date(task.time_line.start);
                return taskDate >= dayStart && taskDate <= dayEnd;
            });

            const completedTasks = allDayTasks.filter(task => task.status === 'COMPLETED');
            const notCompletedTasks = allDayTasks.filter(task => task.status !== 'COMPLETED');

            // Count actual hours met: for each planned label, count matching completed tasks
            let actualMet = 0;
            let actualNotMet = 0;

            plannedLabelMap.forEach((plannedHours, labelId) => {
                const matchingCompleted = completedTasks.filter(task =>
                    task.label_id && String(task.label_id) === labelId
                );
                const matchingNotCompleted = notCompletedTasks.filter(task =>
                    task.label_id && String(task.label_id) === labelId
                );
                // Count tasks up to planned hours (if planned 2h, count max 2 tasks)
                actualMet += Math.min(matchingCompleted.length, plannedHours);
                actualNotMet += Math.min(matchingNotCompleted.length, plannedHours);
            });

            return {
                date: day,
                dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex],
                planned: totalPlanned,
                actualMet: actualMet,
                actualNotMet: actualNotMet,
            };
        });

        const maxHours = Math.max(
            ...comparisonData.map(d => Math.max(d.planned, d.actualMet + d.actualNotMet)),
            1
        );

        return (
            <View style={styles.graphSection}>
                <Text style={styles.graphTitle}>Master Week Graph</Text>
                <View style={styles.masterWeekChartContainer}>
                    <View style={styles.masterWeekBarChart}>
                        {comparisonData.map((dayData, index) => {
                            const plannedHeight = Math.max(20, (dayData.planned / maxHours) * 120);
                            const actualMetHeight = dayData.planned > 0
                                ? (dayData.actualMet / dayData.planned) * plannedHeight
                                : 0;
                            const actualNotMetHeight = dayData.planned > 0
                                ? (dayData.actualNotMet / dayData.planned) * plannedHeight
                                : 0;

                            return (
                                <View key={index} style={styles.masterWeekBarWrapper}>
                                    <View style={styles.masterWeekBarPair}>
                                        <View
                                            style={[
                                                styles.masterWeekBar,
                                                {
                                                    height: plannedHeight,
                                                    width: 15,
                                                    backgroundColor: '#8B4513',
                                                },
                                            ]}
                                        >
                                            {dayData.planned > 0 && plannedHeight > 20 && (
                                                <Text
                                                    style={styles.masterWeekBarValue}>{Math.round(dayData.planned)}h</Text>
                                            )}
                                        </View>
                                        <View
                                            style={[
                                                styles.masterWeekBar,
                                                {
                                                    height: actualMetHeight,
                                                    width: 15,
                                                    backgroundColor: '#10B981',
                                                },
                                            ]}
                                        >
                                            {dayData.actualMet > 0 && actualMetHeight > 15 && (
                                                <Text
                                                    style={styles.masterWeekBarValue}>{Math.round(dayData.actualMet)}h</Text>
                                            )}
                                        </View>
                                        <View
                                            style={[
                                                styles.masterWeekBar,
                                                {
                                                    height: actualNotMetHeight,
                                                    width: 15,
                                                    backgroundColor: '#EF4444',
                                                },
                                            ]}
                                        >
                                            {dayData.actualNotMet > 0 && actualNotMetHeight > 15 && (
                                                <Text
                                                    style={styles.masterWeekBarValue}>{Math.round(dayData.actualNotMet)}h</Text>
                                            )}
                                        </View>
                                    </View>
                                    <Text style={styles.dateLabel} numberOfLines={1}>
                                        {dayData.dayName}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                    <View style={styles.masterWeekChartFooter}>
                        <View style={styles.masterWeekStatsContainer}>
                            <View style={styles.masterWeekStatBox}>
                                <Text style={styles.masterWeekStatLabel}>TOTAL</Text>
                                <Text style={styles.masterWeekStatValue}>
                                    {Math.round(comparisonData.reduce((sum, d) => sum + d.planned, 0))}h
                                </Text>
                            </View>
                            <View style={styles.masterWeekStatBox}>
                                <Text style={styles.masterWeekStatLabel}>MET</Text>
                                <Text style={[styles.masterWeekStatValue, {color: '#10B981'}]}>
                                    {comparisonData.reduce((sum, d) => sum + d.planned, 0) > 0
                                        ? Math.round((comparisonData.reduce((sum, d) => sum + d.actualMet, 0) / comparisonData.reduce((sum, d) => sum + d.planned, 0)) * 100)
                                        : 0}%
                                </Text>
                            </View>
                            <View style={styles.masterWeekStatBox}>
                                <Text style={styles.masterWeekStatLabel}>NOT MET</Text>
                                <Text style={[styles.masterWeekStatValue, {color: '#EF4444'}]}>
                                    {comparisonData.reduce((sum, d) => sum + d.planned, 0) > 0
                                        ? Math.round((comparisonData.reduce((sum, d) => sum + d.actualNotMet, 0) / comparisonData.reduce((sum, d) => sum + d.planned, 0)) * 100)
                                        : 0}%
                                </Text>
                            </View>
                        </View>
                        <View style={styles.masterWeekLegendContainer}>
                            <View style={styles.masterWeekLegend}>
                                <View style={[styles.legendSquare, {backgroundColor: '#8B4513'}]}/>
                                <Text style={styles.legendText}>Planned</Text>
                            </View>
                            <View style={styles.masterWeekLegend}>
                                <View style={[styles.legendSquare, {backgroundColor: '#10B981'}]}/>
                                <Text style={styles.legendText}>Actual (Met)</Text>
                            </View>
                            <View style={styles.masterWeekLegend}>
                                <View style={[styles.legendSquare, {backgroundColor: '#EF4444'}]}/>
                                <Text style={styles.legendText}>Actual (Not Met)</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Render Task Activity Graph
    const renderTaskActivityGraph = () => {
        if (taskActivityLoading) {
            return (
                <View style={styles.graphSection}>
                    <Text style={styles.graphTitle}>Task Activity Graph</Text>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#F6B8A3"/>
                        <Text style={styles.loadingText}>Loading task activity...</Text>
                    </View>
                </View>
            );
        }

        // Get all days of the week
        const weekDays: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(selectedWeekStart);
            day.setDate(selectedWeekStart.getDate() + i);
            weekDays.push(day);
        }

        // Group tasks by day of week
        const taskByDay = weekDays.map((day, dayIndex) => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            const dayTasks = taskActivityData.filter(task => {
                if (!task.time_line?.start) return false;
                const taskDate = new Date(task.time_line.start);
                return taskDate >= dayStart && taskDate <= dayEnd;
            });

            const total = dayTasks.length;
            const completed = dayTasks.filter(t => t.status === 'COMPLETED').length;
            const missed = total - completed;

            return {
                date: day,
                dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex],
                total,
                completed,
                missed,
            };
        });

        const maxTasks = Math.max(...taskByDay.map(d => d.total), 1);
        const barWidth = Math.max(8, (100 / 7) - 2);

        if (taskByDay.every(d => d.total === 0)) {
            return (
                <View style={styles.graphSection}>
                    <Text style={styles.graphTitle}>Task Activity Graph</Text>
                    <View style={styles.emptyContainer}>
                        <Feather name="check-circle" size={32} color="#9CA3AF"/>
                        <Text style={styles.emptyText}>No task activity for this week</Text>
                        <Text style={styles.emptySubtext}>
                            Complete tasks to see your activity trends
                        </Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.graphSection}>
                <Text style={styles.graphTitle}>Task Activity Graph</Text>
                <View style={styles.depressionTaskActivityChartContainer}>
                    <View style={styles.depressionTaskActivityBarChart}>
                        {taskByDay.map((dayData, index) => {
                            const totalHeight = Math.max(20, (dayData.total / maxTasks) * 120);
                            const completedHeight = dayData.total > 0
                                ? (dayData.completed / dayData.total) * totalHeight
                                : 0;
                            const missedHeight = dayData.total > 0
                                ? (dayData.missed / dayData.total) * totalHeight
                                : 0;

                            return (
                                <View key={index} style={styles.depressionTaskActivityBarWrapper}>
                                    <View style={styles.depressionTaskActivityBarPair}>
                                        <View
                                            style={[
                                                styles.depressionTaskActivityBar,
                                                {
                                                    height: totalHeight,
                                                    width: 15,
                                                    backgroundColor: '#E5E7EB',
                                                },
                                            ]}
                                        >
                                            {dayData.total > 0 && totalHeight > 20 && (
                                                <Text style={styles.depressionBarValueLight}>{dayData.total}</Text>
                                            )}
                                        </View>
                                        <View
                                            style={[
                                                styles.depressionTaskActivityBar,
                                                {
                                                    height: completedHeight,
                                                    width: 15,
                                                    backgroundColor: '#10B981',
                                                },
                                            ]}
                                        >
                                            {dayData.completed > 0 && completedHeight > 15 && (
                                                <Text style={styles.depressionBarValue}>{dayData.completed}</Text>
                                            )}
                                        </View>
                                        <View
                                            style={[
                                                styles.depressionTaskActivityBar,
                                                {
                                                    height: missedHeight,
                                                    width: 15,
                                                    backgroundColor: '#EF4444',
                                                },
                                            ]}
                                        >
                                            {dayData.missed > 0 && missedHeight > 15 && (
                                                <Text style={styles.depressionBarValue}>{dayData.missed}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <Text style={styles.dateLabel} numberOfLines={1}>
                                        {dayData.dayName}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                    <View style={styles.depressionTaskActivityChartFooter}>
                        <View style={styles.depressionTaskActivityStatsContainer}>
                            <View style={styles.depressionStatBox}>
                                <Text style={styles.depressionStatLabel}>TOTAL</Text>
                                <Text
                                    style={styles.depressionStatValue}>{taskByDay.reduce((sum, d) => sum + d.total, 0)}</Text>
                            </View>
                            <View style={styles.depressionStatBox}>
                                <Text style={styles.depressionStatLabel}>COMPLETED</Text>
                                <Text style={[styles.depressionStatValue, {color: '#10B981'}]}>
                                    {taskByDay.reduce((sum, d) => sum + d.total, 0) > 0
                                        ? Math.round((taskByDay.reduce((sum, d) => sum + d.completed, 0) / taskByDay.reduce((sum, d) => sum + d.total, 0)) * 100)
                                        : 0}%
                                </Text>
                            </View>
                            <View style={styles.depressionStatBox}>
                                <Text style={styles.depressionStatLabel}>MISSED</Text>
                                <Text style={[styles.depressionStatValue, {color: '#EF4444'}]}>
                                    {taskByDay.reduce((sum, d) => sum + d.total, 0) > 0
                                        ? Math.round((taskByDay.reduce((sum, d) => sum + d.missed, 0) / taskByDay.reduce((sum, d) => sum + d.total, 0)) * 100)
                                        : 0}%
                                </Text>
                            </View>
                        </View>
                        <View style={styles.depressionTaskActivityLegendContainer}>
                            <View style={styles.depressionTaskActivityLegend}>
                                <View style={[styles.legendSquare, {backgroundColor: '#E5E7EB'}]}/>
                                <Text style={styles.legendText}>Total</Text>
                            </View>
                            <View style={styles.depressionTaskActivityLegend}>
                                <View style={[styles.legendSquare, {backgroundColor: '#10B981'}]}/>
                                <Text style={styles.legendText}>Completed</Text>
                            </View>
                            <View style={styles.depressionTaskActivityLegend}>
                                <View style={[styles.legendSquare, {backgroundColor: '#EF4444'}]}/>
                                <Text style={styles.legendText}>Missed</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Render Daily Feedback (Depression Chart)
    const renderDailyFeedback = () => {
        if (depressionLoading) {
            return (
                <View style={styles.graphSection}>
                    <Text style={styles.graphTitle}>Daily Feedback</Text>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#F6B8A3"/>
                        <Text style={styles.loadingText}>Loading depression data...</Text>
                    </View>
                </View>
            );
        }

        if (depressionError) {
            return (
                <View style={styles.graphSection}>
                    <Text style={styles.graphTitle}>Daily Feedback</Text>
                    <View style={styles.errorContainer}>
                        <Feather name="alert-circle" size={32} color="#EF4444"/>
                        <Text style={styles.errorText}>{depressionError}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={loadDepressionData}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        if (depressionData.length === 0) {
            return (
                <View style={styles.graphSection}>
                    <Text style={styles.graphTitle}>Daily Feedback</Text>
                    <View style={styles.emptyContainer}>
                        <Feather name="activity" size={32} color="#9CA3AF"/>
                        <Text style={styles.emptyText}>No daily feedback data available</Text>
                        <Text style={styles.emptySubtext}>
                            Complete daily feedbacks to see your daily feedback analysis
                        </Text>
                    </View>
                </View>
            );
        }

        // Calculate bar positions
        const maxDataScore = Math.max(...depressionData.map(d => d.totalScore ?? d.depressivität ?? 0), 1);
        const barWidth = Math.max(8, (100 / depressionData.length) - 2);

        return (
            <View style={styles.graphSection}>
                <Text style={styles.graphTitle}>Daily Feedback</Text>
                <View style={styles.depressionChartContainer}>
                    <View style={styles.depressionChart}>
                        {/* Y-axis labels */}
                        <View style={styles.yAxis}>
                            <Text style={styles.yAxisLabel}>27</Text>
                            <Text style={styles.yAxisLabel}>20</Text>
                            <Text style={styles.yAxisLabel}>15</Text>
                            <Text style={styles.yAxisLabel}>10</Text>
                            <Text style={styles.yAxisLabel}>5</Text>
                            <Text style={styles.yAxisLabel}>0</Text>
                        </View>

                        {/* Chart area */}
                        <View style={styles.chartArea}>
                            {/* Grid lines */}
                            {[0, 5, 10, 15, 20, 27].map((score) => {
                                const yPos = chartHeight - (score / maxScore) * chartHeight;
                                return (
                                    <View
                                        key={score}
                                        style={[
                                            styles.gridLine,
                                            {top: yPos},
                                        ]}
                                    />
                                );
                            })}

                            {/* Bars */}
                            <View style={styles.barsContainer}>
                                {depressionData.map((point, index) => {
                                    const score = point.totalScore ?? point.depressivität ?? 0;
                                    const barHeight = Math.max(4, (score / maxScore) * chartHeight);
                                    const severityColor = getSeverityColor(point.severity || 'Minimal');

                                    return (
                                        <View key={index} style={styles.depressionBarWrapper}>
                                            <View
                                                style={[
                                                    styles.depressionBar,
                                                    {
                                                        height: Math.max(4, barHeight),
                                                        backgroundColor: severityColor,
                                                        width: `${barWidth}%`,
                                                    },
                                                ]}
                                            >
                                                {barHeight > 20 && (
                                                    <Text style={styles.barScore}>{Math.round(score)}</Text>
                                                )}
                                            </View>
                                            {/* Date label */}
                                            {index % Math.ceil(depressionData.length / 7) === 0 && (
                                                <Text style={styles.dateLabel} numberOfLines={1}>
                                                    {formatDate(point.date)}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>

                    {/* Legend */}
                    <View style={styles.severityLegend}>
                        <Text style={styles.legendTitle}>Severity Levels:</Text>
                        <View style={styles.legendItems}>
                            {['Minimal', 'Mild', 'Moderate', 'Moderately Severe', 'Severe'].map((severity) => (
                                <View key={severity} style={styles.legendItem}>
                                    <View
                                        style={[
                                            styles.legendColor,
                                            {backgroundColor: getSeverityColor(severity)},
                                        ]}
                                    />
                                    <Text style={styles.depressionLegendText}>{severity}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Summary Stats */}
                    {depressionData.length > 0 && (
                        <View style={styles.summaryStats}>
                            <View style={styles.statItem}>
                                <Text style={styles.depressionStatLabel}>Average Score</Text>
                                <Text style={styles.depressionStatValue}>
                                    {(
                                        depressionData.reduce((sum, d) => sum + (d.totalScore ?? d.depressivität ?? 0), 0) /
                                        depressionData.length
                                    ).toFixed(1)}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.depressionStatLabel}>Latest Score</Text>
                                <Text style={styles.depressionStatValue}>
                                    {depressionData[depressionData.length - 1].totalScore ?? depressionData[depressionData.length - 1].depressivität ?? 0}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.depressionStatLabel}>Latest Severity</Text>
                                <Text
                                    style={[
                                        styles.depressionStatValue,
                                        {color: getSeverityColor(depressionData[depressionData.length - 1].severity || '')},
                                    ]}
                                >
                                    {depressionData[depressionData.length - 1].severity || 'N/A'}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <AppWrapper headerTitle="Analysis" headerVariant="default">
            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Tasks' && styles.tabActive]}
                    onPress={() => setActiveTab('Tasks')}
                >
                    <Text
                        style={[styles.tabText, activeTab === 'Tasks' && styles.tabTextActive]}
                    >
                        Task Analysis
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Depression' && styles.tabActive]}
                    onPress={() => setActiveTab('Depression')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'Depression' && styles.tabTextActive,
                        ]}
                    >
                        Depression Analysis
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                }
            >
                {activeTab === 'Tasks' ? (
                    <>
                        {/* Week Navigation */}
                        <View style={styles.weekNavigation}>
                            <TouchableOpacity
                                onPress={() => {
                                    const prevWeek = new Date(selectedWeekStart);
                                    prevWeek.setDate(prevWeek.getDate() - 7);
                                    setSelectedWeekStart(prevWeek);
                                }}
                                style={styles.navButton}
                            >
                                <Feather name="chevron-left" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                            <View style={styles.weekInfo}>
                                <Text style={styles.weekText}>
                                    {formatDate(startDate)} - {formatDate(endDate)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    const nextWeek = new Date(selectedWeekStart);
                                    nextWeek.setDate(nextWeek.getDate() + 7);
                                    setSelectedWeekStart(nextWeek);
                                }}
                                style={styles.navButton}
                            >
                                <Feather name="chevron-right" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>

                        {taskLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#F6B8A3"/>
                                <Text style={styles.loadingText}>Loading task analytics...</Text>
                            </View>
                        ) : taskError ? (
                            <View style={styles.errorContainer}>
                                <Feather name="alert-circle" size={48} color="#EF4444"/>
                                <Text style={styles.errorText}>{taskError}</Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={loadTaskAnalytics}
                                >
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ) : barData.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Feather name="clipboard" size={48} color="#9CA3AF"/>
                                <Text style={styles.emptyText}>No task data available</Text>
                                <Text style={styles.emptySubtext}>
                                    Create tasks with labels to see your analysis
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Overall Summary Bars - No Individual Label Bars */}
                                <View style={styles.chartContainer}>
                                    {/* Overall Bar Chart */}
                                    <View style={styles.overallBarChart}>
                                        {overallTotal > 0 && (
                                            <>
                                                {/* Total Bar */}
                                                <View style={styles.overallBarWrapper}>
                                                    <View
                                                        style={[
                                                            styles.taskAnalysisBar,
                                                            {
                                                                height: maxBarHeight,
                                                                width: 50,
                                                                backgroundColor: '#E5E7EB',
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={styles.taskAnalysisBarValueLight}>{overallTotal}</Text>
                                                    </View>
                                                    <Text style={styles.labelName}>Total</Text>
                                                </View>

                                                {/* Completed Bar */}
                                                <View style={styles.overallBarWrapper}>
                                                    <View
                                                        style={[
                                                            styles.taskAnalysisBar,
                                                            {
                                                                height: overallTotal > 0
                                                                    ? Math.max(20, (totalCompleted / overallTotal) * maxBarHeight)
                                                                    : 0,
                                                                width: 50,
                                                                backgroundColor: '#10B981',
                                                            },
                                                        ]}
                                                    >
                                                        {totalCompleted > 0 && (
                                                            <Text
                                                                style={styles.taskAnalysisBarValue}>{totalCompleted}</Text>
                                                        )}
                                                    </View>
                                                    <Text style={styles.labelName}>Completed</Text>
                                                </View>

                                                {/* Missed Bar */}
                                                <View style={styles.overallBarWrapper}>
                                                    <View
                                                        style={[
                                                            styles.taskAnalysisBar,
                                                            {
                                                                height: overallTotal > 0
                                                                    ? Math.max(20, (totalMissed / overallTotal) * maxBarHeight)
                                                                    : 0,
                                                                width: 50,
                                                                backgroundColor: '#EF4444',
                                                            },
                                                        ]}
                                                    >
                                                        {totalMissed > 0 && (
                                                            <Text
                                                                style={styles.taskAnalysisBarValue}>{totalMissed}</Text>
                                                        )}
                                                    </View>
                                                    <Text style={styles.labelName}>Missed</Text>
                                                </View>
                                            </>
                                        )}
                                    </View>

                                    {/* Overall Stats */}
                                    <View style={styles.chartFooter}>
                                        <View style={styles.statsContainer}>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Total</Text>
                                                <Text style={styles.statValue}>{overallTotal}</Text>
                                            </View>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Completed</Text>
                                                <Text
                                                    style={[styles.statValue, {color: '#10B981'}]}>{overallCompleted}%</Text>
                                            </View>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Missed</Text>
                                                <Text
                                                    style={[styles.statValue, {color: '#EF4444'}]}>{overallMissed}%</Text>
                                            </View>
                                        </View>
                                        <View style={styles.legendContainer}>
                                            <View style={styles.legend}>
                                                <View style={[styles.legendSquare, {backgroundColor: '#E5E7EB'}]}/>
                                                <Text style={styles.legendText}>Total</Text>
                                            </View>
                                            <View style={styles.legend}>
                                                <View style={[styles.legendSquare, {backgroundColor: '#10B981'}]}/>
                                                <Text style={styles.legendText}>Completed</Text>
                                            </View>
                                            <View style={styles.legend}>
                                                <View style={[styles.legendSquare, {backgroundColor: '#EF4444'}]}/>
                                                <Text style={styles.legendText}>Missed</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {/* Week Navigation */}
                        <View style={styles.weekNavigation}>
                            <TouchableOpacity
                                onPress={() => {
                                    const prevWeek = new Date(selectedWeekStart);
                                    prevWeek.setDate(prevWeek.getDate() - 7);
                                    setSelectedWeekStart(prevWeek);
                                }}
                                style={styles.navButton}
                            >
                                <Feather name="chevron-left" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                            <View style={styles.weekInfo}>
                                <Text style={styles.weekText}>
                                    {formatDate(startDate)} - {formatDate(endDate)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    const nextWeek = new Date(selectedWeekStart);
                                    nextWeek.setDate(nextWeek.getDate() + 7);
                                    setSelectedWeekStart(nextWeek);
                                }}
                                style={styles.navButton}
                            >
                                <Feather name="chevron-right" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>

                        {/* Master Week Graph */}
                        {renderMasterWeekGraph()}

                        {/* Task Activity Graph */}
                        {renderTaskActivityGraph()}

                        {/* Daily Feedback Graph */}
                        {renderDailyFeedback()}
                    </>
                )}
            </ScrollView>
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
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 8,
        backgroundColor: '#f9f4f2',
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#1A1D1F',
        fontWeight: '600',
    },
    weekNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    navButton: {
        padding: 8,
    },
    weekInfo: {
        flex: 1,
        alignItems: 'center',
    },
    weekText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    graphSection: {
        marginBottom: 24,
    },
    graphTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 16,
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 24,
    },
    masterWeekChartContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 20,
    },
    masterWeekBarChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 4,
        gap: 1,
        paddingHorizontal: 2,
    },
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: 160,
        marginBottom: 8,
        gap: 12,
        paddingHorizontal: 12,
    },
    overallBarChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: 160,
        marginBottom: 8,
        gap: 24,
        paddingHorizontal: 12,
    },
    overallBarWrapper: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 50,
        maxWidth: 70,
    },
    barPair: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        width: '100%',
        justifyContent: 'center',
    },
    barWrapper: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 50,
        maxWidth: 70,
    },
    mainBar: {
        flex: 1,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 20,
        maxWidth: '48%',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    masterWeekBarWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 0,
        maxWidth: 40,
    },
    masterWeekBarPair: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 1,
        width: '100%',
    },
    masterWeekBar: {
        borderRadius: 2,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 1,
        minWidth: 15,
    },
    masterWeekBarValue: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 2,
    },
    masterWeekChartFooter: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 16,
    },
    masterWeekStatsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 12,
    },
    masterWeekStatBox: {
        alignItems: 'center',
        gap: 4,
    },
    masterWeekStatLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    masterWeekStatValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1D1F',
    },
    masterWeekLegendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    masterWeekLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    taskCompletionRateLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 2,
        textAlign: 'center',
    },
    // Task Analysis Tab Styles
    taskAnalysisBar: {
        borderRadius: 3,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 2,
        minWidth: 18,
    },
    taskAnalysisBarValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 2,
        paddingVertical: 14,
        textAlign: 'center',
    },
    taskAnalysisBarValueLight: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1D1F',
        paddingVertical: 14,
        textAlign: 'center',
    },
    // Depression Analysis Tab - Task Activity Graph Styles
    depressionTaskActivityChartContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 20,
    },
    depressionTaskActivityBarChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 4,
        gap: 1,
        paddingHorizontal: 2,
    },
    depressionTaskActivityBarWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 0,
        maxWidth: 40,
    },
    depressionTaskActivityBarPair: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 1,
        width: '100%',
    },
    depressionTaskActivityBar: {
        borderRadius: 2,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 1,
        minWidth: 10,
    },
    depressionBarValue: {
        fontSize: 8,
        fontWeight: '600',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 1,
    },
    depressionBarValueLight: {
        fontSize: 8,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    depressionTaskActivityChartFooter: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 16,
    },
    depressionTaskActivityStatsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 12,
    },
    depressionStatBox: {
        alignItems: 'center',
        gap: 4,
    },
    depressionStatLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    depressionStatValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1D1F',
    },
    depressionTaskActivityLegendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    depressionTaskActivityLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    barPercentage: {
        fontSize: 10,
        fontWeight: '600',
        color: '#1A1D1F',
        transform: [{rotate: '-90deg'}],
    },
    completedBar: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
        minHeight: 8,
        maxWidth: '48%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    completedPercentage: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6B7280',
        transform: [{rotate: '-90deg'}],
    },
    chartFooter: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 20,
    },
    chartFooterText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statBox: {
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1D1F',
    },
    completedStatsContainer: {
        gap: 4,
    },
    completedPercentageLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    completedText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1D1F',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    labelName: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '500',
        paddingHorizontal: 4,
    },
    legendSquare: {
        width: 14,
        height: 14,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
    },
    legendText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    progressList: {
        gap: 16,
        marginTop: 8,
    },
    progressItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    categoryIndicator: {
        width: 5,
        height: 48,
        borderRadius: 3,
        marginRight: 16,
    },
    progressContent: {
        flex: 1,
        gap: 10,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 2,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1D1F',
        marginLeft: 16,
        minWidth: 50,
        textAlign: 'right',
    },
    // Depression Analysis Styles
    depressionChartContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    depressionChart: {
        flexDirection: 'row',
        height: 220,
        marginBottom: 16,
    },
    yAxis: {
        width: 30,
        justifyContent: 'space-between',
        paddingRight: 8,
        alignItems: 'flex-end',
    },
    yAxisLabel: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '500',
    },
    chartArea: {
        flex: 1,
        position: 'relative',
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#F3F4F6',
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 200,
        paddingTop: 20,
        gap: 2,
    },
    depressionBarWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 8,
    },
    depressionBar: {
        borderRadius: 4,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 4,
    },
    barScore: {
        fontSize: 9,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    dateLabel: {
        fontSize: 8,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'center',
    },
    severityLegend: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    legendTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    legendItems: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 2,
    },
    depressionLegendText: {
        fontSize: 12,
        color: '#6B7280',
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    statItem: {
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#F6B8A3',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});
