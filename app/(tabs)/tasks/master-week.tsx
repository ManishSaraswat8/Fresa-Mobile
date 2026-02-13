import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {ConfirmDialog} from '@/app/component/ConfirmDialog';
import {Feather} from '@expo/vector-icons';
import {useState, useEffect, useCallback} from 'react';
import {useRouter, useFocusEffect} from 'expo-router';
import {getMasterWeeks, deleteMasterWeek, MasterWeek, DayTimeBlocks} from '@/services/masterWeekService';
import {websocketService} from '@/services/websocketService';
import Toast from 'react-native-toast-message';

// Using MasterWeek from masterWeekService

export default function MasterWeekScreen() {
    const router = useRouter();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [masterWeeks, setMasterWeeks] = useState<MasterWeek[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [masterWeekToDelete, setMasterWeekToDelete] = useState<string | null>(null);
    const [masterWeekToDeleteName, setMasterWeekToDeleteName] = useState<string>('');

    const loadMasterWeeks = useCallback(async () => {
        try {
            // Calculate date range for the selected month
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);

            // Get Monday of the first week
            const firstMonday = new Date(firstDay);
            const dayOfWeek = firstDay.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            firstMonday.setDate(firstDay.getDate() + diff);
            firstMonday.setHours(0, 0, 0, 0);

            // Get Sunday of the last week
            const lastSunday = new Date(lastDay);
            const lastDayOfWeek = lastDay.getDay();
            const diffToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
            lastSunday.setDate(lastDay.getDate() + diffToSunday);
            lastSunday.setHours(23, 59, 59, 999);

            const fetchedMasterWeeks = await getMasterWeeks();
            console.log('Fetched master weeks:', fetchedMasterWeeks);
            console.log('Filter range:', {
                firstMonday: firstMonday.toISOString(),
                lastSunday: lastSunday.toISOString()
            });

            // Filter master weeks for the selected month
            const filteredWeeks = fetchedMasterWeeks.filter(mw => {
                const mwStart = new Date(mw.weekStart);
                // Normalize to local date (ignore time)
                const mwStartDate = new Date(mwStart.getFullYear(), mwStart.getMonth(), mwStart.getDate());
                const firstMondayDate = new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate());
                const lastSundayDate = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate());

                // Check if the master week's start date falls within the month's week range
                const isInRange = mwStartDate >= firstMondayDate && mwStartDate <= lastSundayDate;

                if (isInRange) {
                    console.log('Master week matched:', {
                        name: mw.name,
                        weekStart: mwStartDate.toISOString(),
                        firstMonday: firstMondayDate.toISOString(),
                        lastSunday: lastSundayDate.toISOString(),
                    });
                }

                return isInRange;
            });

            console.log('Filtered master weeks:', filteredWeeks);
            setMasterWeeks(filteredWeeks);
        } catch (error: any) {
            console.error('Error loading master weeks:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load master weeks',
                position: 'top',
            });
        }
    }, [selectedMonth]);

    // Load master weeks from database
    useEffect(() => {
        loadMasterWeeks();
    }, [loadMasterWeeks]);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadMasterWeeks();
        }, [loadMasterWeeks])
    );

    // Connect to WebSocket and set up real-time updates
    useEffect(() => {
        // Connect to WebSocket
        websocketService.connect();

        // Listen for master week updates
        const handleMasterWeekUpdate = (data: any) => {
            console.log('📨 [MasterWeek] Received master week update:', data);
            if (data.action === 'created' || data.action === 'updated') {
                // Reload master weeks when a new one is created or updated
                loadMasterWeeks();
                Toast.show({
                    type: 'success',
                    text1: 'Master Week Updated',
                    text2: `Master week ${data.action === 'created' ? 'created' : 'updated'} successfully`,
                    position: 'top',
                });
            } else if (data.action === 'deleted') {
                // Remove master week from list
                const deletedId = data.masterWeek._id || data.masterWeek.id;
                setMasterWeeks((prevWeeks) =>
                    prevWeeks.filter((mw) => {
                        const mwId = mw._id || mw.id;
                        return mwId !== deletedId;
                    })
                );
                Toast.show({
                    type: 'info',
                    text1: 'Master Week Deleted',
                    text2: 'Master week has been deleted',
                    position: 'top',
                });
            }
        };

        websocketService.on('master_week_update', handleMasterWeekUpdate);

        // Cleanup on unmount
        return () => {
            websocketService.off('master_week_update', handleMasterWeekUpdate);
        };
    }, [loadMasterWeeks]);

    // Get weeks in the selected month
    const getWeeksInMonth = (date: Date): Date[][] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Find the Monday of the week containing the first day
        const firstMonday = new Date(firstDay);
        const dayOfWeek = firstDay.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        firstMonday.setDate(firstDay.getDate() + diff);

        const weeks: Date[][] = [];
        let currentMonday = new Date(firstMonday);

        while (currentMonday <= lastDay || currentMonday.getMonth() === month) {
            const week: Date[] = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(currentMonday);
                day.setDate(currentMonday.getDate() + i);
                week.push(day);
            }
            weeks.push(week);
            currentMonday.setDate(currentMonday.getDate() + 7);

            // Stop if we've passed the last day and moved to next month
            if (currentMonday.getMonth() > month && currentMonday > lastDay) {
                break;
            }
        }

        return weeks;
    };

    // Check if a week has a master week
    const getMasterWeekForWeek = (weekStart: Date): MasterWeek | null => {
        const weekStartNormalized = new Date(weekStart);
        weekStartNormalized.setHours(0, 0, 0, 0);
        weekStartNormalized.setMinutes(0, 0, 0);

        return masterWeeks.find(mw => {
            const mwStart = new Date(mw.weekStart);
            mwStart.setHours(0, 0, 0, 0);
            mwStart.setMinutes(0, 0, 0);

            // Compare dates only (ignore time)
            const weekStartDate = weekStartNormalized.toISOString().split('T')[0];
            const mwStartDate = mwStart.toISOString().split('T')[0];

            return weekStartDate === mwStartDate;
        }) || null;
    };

    const weeks = getWeeksInMonth(selectedMonth);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Helper function to get day key (matching create-master-week format)
    const getDayKey = (date: Date, dayIndex: number): string => {
        return `${daysShort[dayIndex]}_${date.getDate()}`;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(selectedMonth.getMonth() + (direction === 'next' ? 1 : -1));
        setSelectedMonth(newDate);
    };

    const handleWeekPress = (weekStart: Date) => {
        // Validate: Cannot create master week for past weeks
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStartDate = new Date(weekStart);
        weekStartDate.setHours(0, 0, 0, 0);

        const existingMasterWeek = getMasterWeekForWeek(weekStart);

        // Allow editing existing master weeks even if in the past
        if (existingMasterWeek) {
            const masterWeekId = existingMasterWeek._id || existingMasterWeek.id;
            router.push({
                pathname: '/(tabs)/tasks/create-master-week',
                params: {
                    masterWeekId: masterWeekId || '',
                    weekStart: weekStart.toISOString(),
                    editMode: 'true',
                },
            });
        } else {
            // Prevent creating new master weeks for past dates
            if (weekStartDate < today) {
                Toast.show({
                    type: 'error',
                    text1: 'Cannot Create',
                    text2: 'Cannot create master week for past dates. Please select a current or future week.',
                    position: 'top',
                });
                return;
            }

            router.push({
                pathname: '/(tabs)/tasks/create-master-week',
                params: {
                    weekStart: weekStart.toISOString(),
                    editMode: 'false',
                },
            });
        }
    };

    const handleDelete = (masterWeek: MasterWeek, event: any) => {
        event.stopPropagation();
        const id = masterWeek._id || masterWeek.id || '';
        setMasterWeekToDelete(id);
        setMasterWeekToDeleteName(masterWeek.name);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (masterWeekToDelete) {
            try {
                await deleteMasterWeek(masterWeekToDelete);
                setMasterWeeks(prev => prev.filter(mw => {
                    const id = mw._id || mw.id;
                    return id !== masterWeekToDelete;
                }));
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Master week deleted',
                    position: 'top',
                });
            } catch (error: any) {
                console.error('Error deleting master week:', error);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to delete master week',
                    position: 'top',
                });
            }
            setMasterWeekToDelete(null);
            setMasterWeekToDeleteName('');
        }
        setShowDeleteConfirm(false);
    };

    const getTotalHoursForWeek = (masterWeek: MasterWeek): number => {
        return Object.values(masterWeek.timeBlocks).reduce((total, blocks) => {
            return total + blocks.reduce((sum, block) => sum + block.hours, 0);
        }, 0);
    };

    const getLabelsForWeek = (masterWeek: MasterWeek): string[] => {
        const labelSet = new Set<string>();
        Object.values(masterWeek.timeBlocks).forEach(blocks => {
            blocks.forEach(block => labelSet.add(block.labelId));
        });
        return Array.from(labelSet);
    };

    return (
        <AppWrapper headerTitle="Master Weeks" headerVariant="default">
            <View style={styles.container}>
                {/* Month Navigation */}
                <View style={styles.monthNavigation}>
                    <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
                        <Feather name="chevron-left" size={24} color="#1A1D1F"/>
                    </TouchableOpacity>
                    <View style={styles.monthInfo}>
                        <Text style={styles.monthText}>
                            {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
                        <Feather name="chevron-right" size={24} color="#1A1D1F"/>
                    </TouchableOpacity>
                </View>

                {/* Monthly Calendar */}
                <ScrollView
                    style={styles.calendarContainer}
                    contentContainerStyle={styles.calendarContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Day Headers */}
                    <View style={styles.dayHeaders}>
                        {dayNames.map((day) => (
                            <View key={day} style={styles.dayHeader}>
                                <Text style={styles.dayHeaderText}>{day}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Weeks */}
                    {weeks.map((week, weekIndex) => {
                        const weekStart = week[0]; // Monday
                        const masterWeek = getMasterWeekForWeek(weekStart);
                        const isCurrentWeek = week.some(day => {
                            const today = new Date();
                            return day.toDateString() === today.toDateString();
                        });

                        // Check if week is in the past (for new master weeks)
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const weekStartDate = new Date(weekStart);
                        weekStartDate.setHours(0, 0, 0, 0);
                        const isPastWeek = weekStartDate < today && !masterWeek;

                        return (
                            <TouchableOpacity
                                key={weekIndex}
                                style={[
                                    styles.weekRow,
                                    isCurrentWeek && styles.weekRowCurrent,
                                    masterWeek && styles.weekRowHasMasterWeek,
                                    isPastWeek && styles.weekRowPast,
                                ]}
                                onPress={() => handleWeekPress(weekStart)}
                            >
                                <View style={styles.weekDaysRow}>
                                    {week.map((day, dayIndex) => {
                                        const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();
                                        const isToday = day.toDateString() === new Date().toDateString();

                                        // Get time blocks for this day if master week exists
                                        const dayKey = getDayKey(day, dayIndex);
                                        const dayBlocks = masterWeek?.timeBlocks?.[dayKey] || [];
                                        const dayTotalHours = dayBlocks.reduce((sum, block) => sum + block.hours, 0);

                                        return (
                                            <View
                                                key={dayIndex}
                                                style={[
                                                    styles.dayCell,
                                                    !isCurrentMonth && styles.dayCellOtherMonth,
                                                    isToday && styles.dayCellToday,
                                                    dayBlocks.length > 0 && styles.dayCellWithBlocks,
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.dayNumber,
                                                    !isCurrentMonth && styles.dayNumberOtherMonth,
                                                    isToday && styles.dayNumberToday,
                                                ]}>
                                                    {day.getDate()}
                                                </Text>
                                                {dayBlocks.length > 0 && (
                                                    <View style={styles.dayBlocksIndicator}>
                                                        {dayBlocks.slice(0, 2).map((block, blockIndex) => (
                                                            <View
                                                                key={blockIndex}
                                                                style={[
                                                                    styles.dayBlockDot,
                                                                    {backgroundColor: block.labelColor || '#8B4513'},
                                                                ]}
                                                            />
                                                        ))}
                                                        {dayBlocks.length > 2 && (
                                                            <Text
                                                                style={styles.dayBlockMore}>+{dayBlocks.length - 2}</Text>
                                                        )}
                                                    </View>
                                                )}
                                                {dayTotalHours > 0 && dayBlocks.length === 0 && (
                                                    <Text style={styles.dayHoursText}>{dayTotalHours}h</Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                                {masterWeek && (
                                    <View style={styles.masterWeekSummary}>
                                        <View style={styles.masterWeekBadge}>
                                            <Feather name="calendar" size={14} color="#8B4513"/>
                                            <Text style={styles.masterWeekBadgeText}>
                                                {getTotalHoursForWeek(masterWeek)}h
                                            </Text>
                                            <View style={styles.masterWeekLabels}>
                                                {getLabelsForWeek(masterWeek).slice(0, 3).map((labelId) => {
                                                    const block = Object.values(masterWeek.timeBlocks)
                                                        .flat()
                                                        .find(b => b.labelId === labelId);
                                                    if (!block) return null;
                                                    return (
                                                        <View
                                                            key={labelId}
                                                            style={[
                                                                styles.labelDot,
                                                                {backgroundColor: block.labelColor},
                                                            ]}
                                                        />
                                                    );
                                                })}
                                                {getLabelsForWeek(masterWeek).length > 3 && (
                                                    <Text style={styles.moreLabelsText}>
                                                        +{getLabelsForWeek(masterWeek).length - 3}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.masterWeekActions}>
                                            <TouchableOpacity
                                                style={styles.editButton}
                                                onPress={() => {
                                                    const masterWeekId = masterWeek._id || masterWeek.id;
                                                    router.push({
                                                        pathname: '/(tabs)/tasks/create-master-week',
                                                        params: {
                                                            masterWeekId: masterWeekId || '',
                                                            weekStart: weekStart.toISOString(),
                                                            editMode: 'true',
                                                        },
                                                    });
                                                }}
                                            >
                                                <Feather name="edit-2" size={14} color="#8B4513"/>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={(e) => handleDelete(masterWeek, e)}
                                            >
                                                <Feather name="trash-2" size={14} color="#EF4444"/>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Create Button */}
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => {
                        const today = new Date();
                        const dayOfWeek = today.getDay();
                        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                        const monday = new Date(today);
                        monday.setDate(diff);
                        monday.setHours(0, 0, 0, 0);

                        // Ensure we're creating for current or future week
                        if (monday < today) {
                            // If current week's Monday is in the past, use next week
                            monday.setDate(monday.getDate() + 7);
                        }

                        handleWeekPress(monday);
                    }}
                >
                    <Feather name="plus" size={20} color="#fff"/>
                    <Text style={styles.createButtonText}>Create Master Week</Text>
                </TouchableOpacity>

                {/* Delete Confirmation Dialog */}
                <ConfirmDialog
                    visible={showDeleteConfirm}
                    title="Delete Master Week"
                    message={`Are you sure you want to delete "${masterWeekToDeleteName}"? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowDeleteConfirm(false);
                        setMasterWeekToDelete(null);
                        setMasterWeekToDeleteName('');
                    }}
                    type="danger"
                />
            </View>
        </AppWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f4f2',
    },
    monthNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    navButton: {
        padding: 8,
    },
    monthInfo: {
        flex: 1,
        alignItems: 'center',
    },
    monthText: {
        fontSize: 18,
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
    dayHeaders: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    dayHeader: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    dayHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    weekRow: {
        flexDirection: 'column',
        marginBottom: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minHeight: 60,
    },
    weekRowCurrent: {
        borderColor: '#8B4513',
        borderWidth: 2,
    },
    weekRowHasMasterWeek: {
        backgroundColor: '#FFF7ED',
    },
    weekRowPast: {
        opacity: 0.5,
    },
    weekRowWithBlocks: {
        minHeight: 80,
    },
    weekDaysRow: {
        flexDirection: 'row',
        width: '100%',
    },
    dayCell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 2,
        minHeight: 60,
    },
    dayCellOtherMonth: {
        opacity: 0.3,
    },
    dayCellToday: {
        backgroundColor: '#8B4513',
        borderRadius: 8,
    },
    dayCellWithBlocks: {
        minHeight: 70,
    },
    dayNumber: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1A1D1F',
        marginBottom: 4,
    },
    dayNumberOtherMonth: {
        color: '#9CA3AF',
    },
    dayNumberToday: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15,
    },
    dayBlocksIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        marginTop: 2,
        flexWrap: 'wrap',
    },
    dayBlockDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dayBlockMore: {
        fontSize: 9,
        color: '#6B7280',
        fontWeight: '600',
    },
    dayHoursText: {
        fontSize: 10,
        color: '#8B4513',
        fontWeight: '600',
        marginTop: 2,
    },
    masterWeekIndicator: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    masterWeekBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    masterWeekBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8B4513',
    },
    masterWeekLabels: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    labelDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    moreLabelsText: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '500',
    },
    masterWeekSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: '#FFF7ED',
        borderTopWidth: 1,
        borderTopColor: '#FED7AA',
        marginTop: 4,
    },
    masterWeekActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    editButton: {
        padding: 4,
    },
    deleteButton: {
        padding: 4,
    },
    createButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8B4513',
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        gap: 8,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
