import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useState, useEffect, useCallback} from 'react';
import {useRouter} from 'expo-router';
import {
    getTemplates,
    getTaskLabels,
    GoalTemplate,
    ChallengeTemplate,
    TaskLabel,
} from '@/services/templateService';

interface Template {
    id: string;
    type: 'Goal' | 'Challenge';
    text: string;
    goalTitle?: string; // For Challenge templates - related goal title
    goalDescription?: string; // For Challenge templates - related goal description
    challenge?: string; // For Challenge templates
    mitigation?: string; // For Challenge templates
    category: string;
    categoryColor: string;
    source: 'Mine' | 'Pre-Built';
    originalData?: GoalTemplate | ChallengeTemplate;
}


export default function MyTemplatesScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'Mine' | 'Pre-Built'>('Pre-Built');
    const [selectedTemplateType, setSelectedTemplateType] = useState<'All' | 'Goal' | 'Challenge'>('All');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [labels, setLabels] = useState<TaskLabel[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Default color for categories without labels
    const defaultCategoryColor = '#F6B8A3';

    // Helper function to get label name (handle both string and ObjectId formats)
    const getLabelName = (labelId: string | undefined, labelsList: TaskLabel[]): string => {
        if (!labelId) return 'Uncategorized';
        const labelIdStr = String(labelId);
        const label = labelsList.find(
            (l) => String(l._id || l.id) === labelIdStr
        );
        return label?.name || label?.title || 'Uncategorized';
    };

    // Helper function to get label color (handle both string and ObjectId formats)
    const getLabelColor = (labelId: string | undefined, labelsList: TaskLabel[]): string => {
        if (!labelId) return defaultCategoryColor;
        const labelIdStr = String(labelId);
        const label = labelsList.find(
            (l) => String(l._id || l.id) === labelIdStr
        );
        return label?.color || defaultCategoryColor;
    };

    // Fetch all data using unified API
    const fetchData = useCallback(async () => {
        try {
            setError(null);

            // Load labels first
            const taskLabels = await getTaskLabels();
            setLabels(taskLabels);

            // Build filter options
            const isPrebuilt = activeTab === 'Pre-Built';

            // Get selected label ID if filtering by label
            let selectedLabelId: string | undefined;
            if (selectedCategory !== 'All') {
                const selectedLabel = taskLabels.find(
                    (l) => {
                        const labelName = (l.name || l.title || '').trim();
                        const categoryName = selectedCategory.trim();
                        return labelName === categoryName;
                    }
                );
                if (selectedLabel) {
                    selectedLabelId = String(selectedLabel._id || selectedLabel.id);
                    console.log('Selected label filter:', {
                        category: selectedCategory,
                        labelId: selectedLabelId,
                        labelName: selectedLabel.name || selectedLabel.title,
                    });
                } else {
                    console.warn('Label not found for category:', selectedCategory, 'Available labels:', taskLabels.map(l => l.name || l.title));
                }
            }

            // Fetch templates from backend (backend doesn't support label_id filtering, so we fetch all)
            // We'll do label filtering client-side
            const options: { isPrebuilt: boolean; type?: 'goal' | 'challenge' } = {
                isPrebuilt,
            };
            if (selectedTemplateType !== 'All') {
                options.type = selectedTemplateType.toLowerCase() as 'goal' | 'challenge';
            }

            // Fetch all templates (we need all goals to resolve challenge labels anyway)
            const allTemplatesResult = await getTemplates({
                isPrebuilt,
                // Don't filter by type - we need all goals to resolve challenge labels
            });

            // Always keep ALL goals - we need them to resolve challenge labels
            const allGoals = allTemplatesResult.goals;
            let allChallenges = allTemplatesResult.challenges;

            // Filter challenges by template type if needed (but keep all goals for label resolution)
            if (selectedTemplateType === 'Goal') {
                allChallenges = [];
            } else if (selectedTemplateType === 'Challenge') {
                // Keep all challenges - we'll filter by label below
                // But we still need all goals to resolve which challenges match the label
            }

            // Filter goals by label_id (client-side filtering)
            // Only show goals if type is 'All' or 'Goal'
            let goals: GoalTemplate[] = [];
            if (selectedTemplateType === 'All' || selectedTemplateType === 'Goal') {
                goals = allGoals;
                if (selectedLabelId) {
                    goals = allGoals.filter((goal) => {
                        const goalLabelId = String(goal.label_id || '');
                        const matches = goalLabelId === selectedLabelId;
                        return matches;
                    });
                    console.log(`Filtered ${goals.length} goals from ${allGoals.length} total (labelId: ${selectedLabelId})`);
                }
            }

            // Filter challenges by label (client-side filtering)
            // Challenges get their label from their related goal
            // Only show challenges if type is 'All' or 'Challenge'
            let challenges: ChallengeTemplate[] = [];
            if (selectedTemplateType === 'All' || selectedTemplateType === 'Challenge') {
                challenges = allChallenges;
                if (selectedLabelId) {
                    // Get goal IDs that match the selected label (use ALL goals, not filtered ones)
                    const goalsWithLabel = allGoals.filter((g) => String(g.label_id || '') === selectedLabelId);
                    const goalIdsWithLabel = new Set(
                        goalsWithLabel.map((g) => String(g._id || g.id))
                    );

                    console.log(`Found ${goalsWithLabel.length} goals with label ${selectedLabelId}, goal IDs:`, Array.from(goalIdsWithLabel));
                    console.log(`Total challenges before filtering: ${allChallenges.length}`);

                    // Filter challenges to only include those whose goal_id matches a goal with the selected label
                    challenges = allChallenges.filter((challenge) => {
                        if (!challenge.goal_id) {
                            console.log(`Challenge ${challenge._id || challenge.id} has no goal_id`);
                            return false;
                        }
                        const challengeGoalId = String(challenge.goal_id);
                        const matches = goalIdsWithLabel.has(challengeGoalId);
                        if (!matches) {
                            console.log(`Challenge ${challenge._id || challenge.id} goal_id ${challengeGoalId} does not match any goal with label ${selectedLabelId}`);
                        }
                        return matches;
                    });

                    console.log(`Filtered ${challenges.length} challenges from ${allChallenges.length} total (labelId: ${selectedLabelId})`);
                }
            }

            // Use all goals for label resolution (needed for challenges)
            const allGoalsForLabelResolution: GoalTemplate[] = allGoals;

            console.log(`✅ Loaded ${goals.length} goals and ${challenges.length} challenges for ${activeTab} tab`);
            if (goals.length > 0) {
                console.log('Sample goal:', goals[0]);
            }
            if (challenges.length > 0) {
                console.log('Sample challenge:', challenges[0]);
            }

            // Convert to UI format
            const combinedTemplates: Template[] = [
                ...goals.map((gt) => ({
                    id: gt._id || gt.id || '',
                    type: 'Goal' as const,
                    text: gt.title || gt.description || '',
                    category: getLabelName(gt.label_id, taskLabels),
                    categoryColor: getLabelColor(gt.label_id, taskLabels),
                    source: isPrebuilt ? ('Pre-Built' as const) : ('Mine' as const),
                    originalData: gt,
                })),
                ...challenges.map((ct) => {
                    // For challenges, get label and goal info from related goal if available
                    let labelId: string | undefined;
                    let goalTitle: string | undefined;
                    let goalDescription: string | undefined;

                    if (ct.goal_id) {
                        const relatedGoal = allGoalsForLabelResolution.find(
                            (g) => String(g._id || g.id) === String(ct.goal_id)
                        );
                        if (relatedGoal) {
                            labelId = relatedGoal.label_id;
                            goalTitle = relatedGoal.title;
                            goalDescription = relatedGoal.description;
                            console.log(`Challenge ${ct._id || ct.id} has goal_id ${ct.goal_id}, found goal:`, relatedGoal.title);
                        } else {
                            console.log(`Challenge ${ct._id || ct.id} has goal_id ${ct.goal_id}, but goal not found`);
                        }
                    }

                    return {
                        id: ct._id || ct.id || '',
                        type: 'Challenge' as const,
                        text: ct.title || ct.description || '',
                        goalTitle: goalTitle,
                        goalDescription: goalDescription,
                        challenge: ct.challenge || ct.title || '',
                        mitigation: ct.mitigation || '',
                        category: getLabelName(labelId, taskLabels),
                        categoryColor: getLabelColor(labelId, taskLabels),
                        source: isPrebuilt ? ('Pre-Built' as const) : ('Mine' as const),
                        originalData: ct,
                    };
                }),
            ];

            setTemplates(combinedTemplates);
        } catch (err: any) {
            console.error('Error fetching templates:', err);
            // Don't show error alert for permission errors - they should be resolved now
            // Just log and set error state
            setError(err.message || 'Failed to load templates');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, selectedTemplateType, selectedCategory]);

    // Get unique categories from labels
    const categories = [
        {name: 'All', color: '#F6B8A3'},
        ...labels.map((label) => ({
            name: label.name || label.title || '',
            color: label.color || defaultCategoryColor,
        })),
    ];

    // Refresh data
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    // Fetch labels on mount
    useEffect(() => {
        const loadLabels = async () => {
            try {
                const taskLabels = await getTaskLabels();
                setLabels(taskLabels);
            } catch (err: any) {
                console.error('Error loading labels:', err);
            }
        };
        loadLabels();
    }, []);

    // Fetch data when tab, template type, or category changes
    useEffect(() => {
        if (labels.length > 0 || activeTab === 'Pre-Built') {
            setLoading(true);
            fetchData();
        }
    }, [activeTab, selectedTemplateType, selectedCategory, labels.length, fetchData]);

    // Handle tab change
    const handleTabChange = (tab: 'Mine' | 'Pre-Built') => {
        setActiveTab(tab);
        setSelectedCategory('All'); // Reset filters when switching tabs
        setSelectedTemplateType('All');
    };

    // Templates are already filtered by API, but we can do additional client-side filtering if needed
    const filteredTemplates = templates;


    return (
        <AppWrapper headerTitle="My Templates" headerVariant="default">
            <View style={styles.container}>
                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Mine' && styles.tabActive]}
                        onPress={() => handleTabChange('Mine')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'Mine' && styles.tabTextActive,
                            ]}
                        >
                            Mine
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Pre-Built' && styles.tabActive]}
                        onPress={() => handleTabChange('Pre-Built')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'Pre-Built' && styles.tabTextActive,
                            ]}
                        >
                            Pre-Built
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Template Type Filters */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Type</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filtersContainer}
                        contentContainerStyle={styles.filtersContent}
                    >
                        {[
                            {name: 'All', icon: 'grid'},
                            {name: 'Goal', icon: 'target'},
                            {name: 'Challenge', icon: 'award'},
                        ].map((type) => {
                            const isSelected = selectedTemplateType === type.name;
                            return (
                                <TouchableOpacity
                                    key={type.name}
                                    style={[
                                        styles.filterPill,
                                        isSelected && styles.filterPillActive,
                                        !isSelected && styles.filterPillInactive,
                                    ]}
                                    onPress={() => setSelectedTemplateType(type.name as 'All' | 'Goal' | 'Challenge')}
                                >
                                    <Feather
                                        name={type.icon as any}
                                        size={16}
                                        color={isSelected ? '#1A1D1F' : '#9CA3AF'}
                                        style={styles.filterIcon}
                                    />
                                    <Text
                                        style={[
                                            styles.filterText,
                                            isSelected && styles.filterTextSelected,
                                            !isSelected && styles.filterTextInactive,
                                        ]}
                                    >
                                        {type.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Label Filters */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Label</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filtersContainer}
                        contentContainerStyle={styles.filtersContent}
                    >
                        {categories.map((category) => {
                            const isSelected = selectedCategory === category.name;
                            return (
                                <TouchableOpacity
                                    key={category.name}
                                    style={[
                                        styles.filterPill,
                                        isSelected && {
                                            backgroundColor: category.color,
                                            borderColor: category.color,
                                        },
                                        !isSelected && {
                                            borderColor: category.color,
                                        },
                                    ]}
                                    onPress={() => setSelectedCategory(category.name)}
                                >
                                    <Text
                                        style={[
                                            styles.filterText,
                                            isSelected && styles.filterTextSelected,
                                            !isSelected && {color: category.color},
                                        ]}
                                    >
                                        {category.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Loading State */}
                {loading && !refreshing && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#F6B8A3"/>
                        <Text style={styles.loadingText}>Loading templates...</Text>
                    </View>
                )}

                {/* Error State */}
                {error && !loading && (
                    <View style={styles.errorContainer}>
                        <Feather name="alert-circle" size={24} color="#EF4444"/>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setLoading(true);
                                fetchData();
                            }}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Templates List */}
                {!loading && !error && (
                    <ScrollView
                        style={styles.templatesList}
                        contentContainerStyle={styles.templatesContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                        }
                    >
                        {filteredTemplates.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Feather name="inbox" size={48} color="#9CA3AF"/>
                                <Text style={styles.emptyText}>
                                    {activeTab === 'Mine'
                                        ? "You haven't created any templates yet"
                                        : 'No pre-built templates available'}
                                </Text>
                                {activeTab === 'Mine' && (
                                    <TouchableOpacity
                                        style={styles.createButton}
                                        onPress={() => router.push('/(tabs)/tasks/create-template')}
                                    >
                                        <Text style={styles.createButtonText}>Create Template</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            filteredTemplates.map((template: Template) => (
                                <TouchableOpacity
                                    key={template.id}
                                    style={styles.templateCard}
                                    onPress={() => {
                                        // Get label ID from the template's original data or find it from labels
                                        let labelId = '';
                                        let labelName = template.category;

                                        // Try to get label ID from original data
                                        if (template.type === 'Goal' && template.originalData) {
                                            const goalData = template.originalData as GoalTemplate;
                                            labelId = String(goalData.label_id || '');
                                        } else if (template.type === 'Challenge' && template.originalData) {
                                            const challengeData = template.originalData as ChallengeTemplate;
                                            // For challenges, we need to find the related goal's label_id
                                            // The labelId should already be resolved in the template mapping
                                            // But we can also try to get it from the challenge's goal_id if available
                                        }

                                        // Find label ID from category name if we don't have it yet
                                        if (!labelId && template.category !== 'Uncategorized') {
                                            const matchingLabel = labels.find(
                                                (l) => (l.name || l.title) === template.category
                                            );
                                            if (matchingLabel) {
                                                labelId = String(matchingLabel._id || matchingLabel.id || '');
                                                labelName = matchingLabel.name || matchingLabel.title || template.category;
                                            }
                                        }

                                        // For Goal templates, also try to get label ID from originalData
                                        if (!labelId && template.type === 'Goal' && template.originalData) {
                                            const goalData = template.originalData as GoalTemplate;
                                            if (goalData.label_id) {
                                                labelId = String(goalData.label_id);
                                                // Find the label name from labels list
                                                const labelFromId = labels.find(
                                                    (l) => String(l._id || l.id) === labelId
                                                );
                                                if (labelFromId) {
                                                    labelName = labelFromId.name || labelFromId.title || template.category;
                                                }
                                            }
                                        }

                                        console.log('Navigating with template data:', {
                                            templateId: template.id,
                                            templateType: template.type,
                                            labelId,
                                            labelName,
                                            challenge: template.challenge,
                                            mitigation: template.mitigation,
                                            goalTitle: template.goalTitle,
                                        });

                                        // Navigate to create task with template data
                                        router.push({
                                            pathname: '/(tabs)/tasks/create-task',
                                            params: {
                                                templateId: template.id,
                                                templateType: template.type,
                                                templateText: template.text,
                                                templateCategory: template.category,
                                                templateCategoryColor: template.categoryColor,
                                                templateLabelId: labelId,
                                                templateLabelName: labelName,
                                                templateChallenge: template.challenge || '',
                                                templateMitigation: template.mitigation || '',
                                                templateGoalTitle: template.goalTitle || '',
                                                templateGoalDescription: template.goalDescription || '',
                                            },
                                        });
                                    }}
                                >
                                    <View
                                        style={[
                                            styles.colorBar,
                                            {backgroundColor: template.categoryColor},
                                        ]}
                                    />
                                    <View style={styles.templateContent}>
                                        <View style={styles.templateHeader}>
                                            <View style={styles.typeContainer}>
                                                <Feather
                                                    name={template.type === 'Goal' ? 'target' : 'award'}
                                                    size={16}
                                                    color="#1A1D1F"
                                                />
                                                <Text style={styles.typeText}>{template.type}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[
                                                    styles.sourceButton,
                                                    template.source === 'Pre-Built' &&
                                                    styles.sourceButtonClinic,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.sourceButtonText,
                                                        template.source === 'Pre-Built' &&
                                                        styles.sourceButtonTextClinic,
                                                    ]}
                                                >
                                                    {template.source === 'Pre-Built' ? 'Pre-Built' : 'Mine'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        {/* Show title/description for Goals, or full info for Challenges */}
                                        {template.type === 'Goal' ? (
                                            <Text style={styles.templateText}>{template.text}</Text>
                                        ) : (
                                            <>
                                                {/* Goal Section - Show related goal first */}
                                                {template.goalTitle && (
                                                    <View style={styles.goalSection}>
                                                        <View style={styles.goalHeader}>
                                                            <Feather name="target" size={14} color="#F6B8A3"/>
                                                            <Text style={styles.goalLabel}>Goal:</Text>
                                                        </View>
                                                        <Text style={styles.goalTitle}>{template.goalTitle}</Text>
                                                        {template.goalDescription && (
                                                            <Text
                                                                style={styles.goalDescription}>{template.goalDescription}</Text>
                                                        )}
                                                    </View>
                                                )}

                                                {/* Challenge Text */}
                                                {template.challenge && (
                                                    <View style={styles.challengeSection}>
                                                        <View style={styles.challengeHeader}>
                                                            <Feather name="award" size={14} color="#EF4444"/>
                                                            <Text style={styles.challengeLabel}>Challenge:</Text>
                                                        </View>
                                                        <Text style={styles.templateText}>{template.challenge}</Text>
                                                    </View>
                                                )}

                                                {/* Mitigation Text */}
                                                {template.mitigation && (
                                                    <View style={styles.mitigationSection}>
                                                        <View style={styles.mitigationHeader}>
                                                            <Feather name="shield" size={14} color="#10B981"/>
                                                            <Text style={styles.mitigationLabel}>Mitigation:</Text>
                                                        </View>
                                                        <Text style={styles.mitigationText}>{template.mitigation}</Text>
                                                    </View>
                                                )}

                                                {/* Fallback to text if no goal/challenge/mitigation */}
                                                {!template.goalTitle && !template.challenge && !template.mitigation && template.text && (
                                                    <Text style={styles.templateText}>{template.text}</Text>
                                                )}
                                            </>
                                        )}
                                        <View style={styles.categoryTag}>
                                            <View
                                                style={[
                                                    styles.categoryTagColor,
                                                    {backgroundColor: template.categoryColor},
                                                ]}
                                            />
                                            <Text style={styles.categoryTagText}>{template.category}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                )}

                {/* Floating Action Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push('/(tabs)/tasks/create-template')}
                >
                    <Feather name="plus" size={24} color="#fff"/>
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
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 12,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tabActive: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    tabTextActive: {
        fontWeight: '600',
    },
    filterSection: {
        marginBottom: 16,
    },
    filterSectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    filtersContainer: {
        marginBottom: 0,
    },
    filtersContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: '#fff',
        gap: 6,
    },
    filterPillActive: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    filterPillInactive: {
        borderColor: '#E5E7EB',
    },
    filterIcon: {
        marginRight: 0,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
    },
    filterTextSelected: {
        color: '#1A1D1F',
        fontWeight: '600',
    },
    filterTextInactive: {
        color: '#9CA3AF',
    },
    templatesList: {
        flex: 1,
    },
    templatesContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    templateCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    colorBar: {
        width: 4,
    },
    templateContent: {
        flex: 1,
        padding: 16,
    },
    templateHeader: {
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
    sourceButton: {
        backgroundColor: '#F6B8A3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    sourceButtonClinic: {
        backgroundColor: '#8B4513',
    },
    sourceButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    sourceButtonTextClinic: {
        color: '#fff',
    },
    templateText: {
        fontSize: 16,
        fontWeight: '400',
        color: '#1A1D1F',
        marginBottom: 12,
        lineHeight: 22,
    },
    goalSection: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#F3F4F6',
    },
    goalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    goalLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F6B8A3',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    goalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginBottom: 4,
        lineHeight: 22,
    },
    goalDescription: {
        fontSize: 14,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 20,
    },
    challengeSection: {
        marginBottom: 12,
    },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    challengeLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#EF4444',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    mitigationSection: {
        marginBottom: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    mitigationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    mitigationLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    mitigationText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#4B5563',
        lineHeight: 20,
        fontStyle: 'italic',
    },
    categoryTag: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
    },
    categoryTagColor: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    categoryTagText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    fab: {
        position: 'absolute',
        right: 20,
        top: 90,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4B5563',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
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
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
    createButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#F6B8A3',
        borderRadius: 8,
    },
    createButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1D1F',
    },
});
