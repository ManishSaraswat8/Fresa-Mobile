import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useLocalSearchParams, useRouter} from 'expo-router';

interface Template {
    id: string;
    type: 'Goal' | 'Challenge';
    text: string;
    category: string;
    categoryColor: string;
    source: 'Mine' | 'Clinic';
}

interface MasterWeekData {
    id: string;
    name: string;
    weekStart: string;
    weekEnd: string;
    dayTemplates: { [key: string]: Template[] };
}

export default function MasterWeekDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const masterWeekId = params.masterWeekId as string;

    // Sample data - in real app, fetch from storage/backend using masterWeekId
    const masterWeek: MasterWeekData = {
        id: masterWeekId || '1',
        name: 'Week of Nov 11',
        weekStart: '2025-11-11',
        weekEnd: '2025-11-17',
        dayTemplates: {
            'Mon_11': [
                {
                    id: '1',
                    type: 'Goal',
                    text: "Write down three things you're grateful to your partner for.",
                    category: 'Partner',
                    categoryColor: '#C084FC',
                    source: 'Mine',
                },
            ],
            'Tue_12': [
                {
                    id: '2',
                    type: 'Challenge',
                    text: 'Speak to your mother this week',
                    category: 'Family',
                    categoryColor: '#FCD34D',
                    source: 'Mine',
                },
            ],
        },
    };

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const daysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${monthNames[date.getMonth()]}`;
    };

    const formatDateRange = (weekStart: string, weekEnd: string): string => {
        const start = new Date(weekStart);
        const end = new Date(weekEnd);
        const startDay = start.getDate();
        const endDay = end.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonth = monthNames[start.getMonth()];
        const endMonth = monthNames[end.getMonth()];

        if (startMonth === endMonth) {
            return `${startDay} - ${endDay} ${startMonth}`;
        } else {
            return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
        }
    };

    const getWeekDates = () => {
        const dates = [];
        const startDate = new Date(masterWeek.weekStart);
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const weekDates = getWeekDates();
    const totalTemplates = Object.values(masterWeek.dayTemplates).reduce(
        (sum, templates) => sum + templates.length,
        0
    );

    return (
        <AppWrapper headerTitle="Master Week Details" headerVariant="default">
            <View style={styles.container}>
                {/* Header Info */}
                <View style={styles.headerCard}>
                    <Text style={styles.masterWeekName}>{masterWeek.name}</Text>
                    <Text style={styles.dateRange}>
                        {formatDateRange(masterWeek.weekStart, masterWeek.weekEnd)}
                    </Text>
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Feather name="list" size={16} color="#6B7280"/>
                            <Text style={styles.statText}>
                                {totalTemplates} {totalTemplates === 1 ? 'template' : 'templates'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Weekly Calendar */}
                <ScrollView
                    style={styles.calendarContainer}
                    contentContainerStyle={styles.calendarContent}
                    showsVerticalScrollIndicator={false}
                >
                    {weekDates.map((date, index) => {
                        const dayShort = daysShort[index];
                        const dayKey = `${dayShort}_${date.getDate()}`;
                        const templatesForDay = masterWeek.dayTemplates[dayKey] || [];
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                            <View
                                key={index}
                                style={[styles.dayCard, isToday && styles.dayCardToday]}
                            >
                                <View style={styles.dayHeader}>
                                    <View>
                                        <Text style={styles.dayName}>{dayShort}</Text>
                                        <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
                                            {date.getDate()}
                                        </Text>
                                    </View>
                                    {templatesForDay.length > 0 && (
                                        <View style={styles.templateCountBadge}>
                                            <Text style={styles.templateCountBadgeText}>
                                                {templatesForDay.length}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Templates for this day */}
                                {templatesForDay.length > 0 ? (
                                    <View style={styles.templatesList}>
                                        {templatesForDay.map((template) => (
                                            <View
                                                key={template.id}
                                                style={[
                                                    styles.templateChip,
                                                    {borderLeftColor: template.categoryColor},
                                                ]}
                                            >
                                                <View style={styles.templateChipContent}>
                                                    <Feather
                                                        name={template.type === 'Goal' ? 'target' : 'award'}
                                                        size={14}
                                                        color={template.categoryColor}
                                                    />
                                                    <View style={styles.templateTextContainer}>
                                                        <Text style={styles.templateChipText}>
                                                            {template.text}
                                                        </Text>
                                                        <View style={styles.templateMeta}>
                                                            <View style={styles.categoryTag}>
                                                                <View
                                                                    style={[
                                                                        styles.categoryTagColor,
                                                                        {backgroundColor: template.categoryColor},
                                                                    ]}
                                                                />
                                                                <Text style={styles.categoryTagText}>
                                                                    {template.category}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.typeTag}>
                                                                <Text style={styles.typeTagText}>{template.type}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.noTemplatesContainer}>
                                        <Text style={styles.noTemplatesText}>No templates for this day</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Edit Button */}
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                        router.push({
                            pathname: '/(tabs)/tasks/create-master-week',
                            params: {
                                masterWeekId: masterWeek.id,
                                editMode: 'true',
                            },
                        });
                    }}
                >
                    <Feather name="edit-2" size={18} color="#fff"/>
                    <Text style={styles.editButtonText}>Edit Master Week</Text>
                </TouchableOpacity>
            </View>
        </AppWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f4f2',
    },
    headerCard: {
        backgroundColor: '#fff',
        padding: 20,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    masterWeekName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    dateRange: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 12,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 14,
        color: '#6B7280',
    },
    calendarContainer: {
        flex: 1,
    },
    calendarContent: {
        paddingHorizontal: 20,
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
    templateCountBadge: {
        backgroundColor: '#8B4513',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    templateCountBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    templatesList: {
        gap: 10,
    },
    templateChip: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 3,
    },
    templateChipContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    templateTextContainer: {
        flex: 1,
    },
    templateChipText: {
        fontSize: 14,
        color: '#1A1D1F',
        marginBottom: 8,
        lineHeight: 20,
    },
    templateMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    categoryTagColor: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    categoryTagText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    typeTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
    },
    typeTagText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6B7280',
    },
    noTemplatesContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    noTemplatesText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    editButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8B4513',
        borderRadius: 12,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        gap: 8,
    },
    editButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

