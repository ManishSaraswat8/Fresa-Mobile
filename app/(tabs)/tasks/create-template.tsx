import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useState, useEffect} from 'react';
import {useRouter} from 'expo-router';
import {
    createGoalTemplate,
    createChallengeTemplate,
    getTaskLabels,
    getPrebuiltGoalTemplates,
    TaskLabel,
    GoalTemplate,
} from '@/services/templateService';

export default function CreateTemplateScreen() {
    const router = useRouter();
    const [templateType, setTemplateType] = useState<'Goal' | 'Challenge'>('Goal');
    const [loading, setLoading] = useState(false);
    const [labels, setLabels] = useState<TaskLabel[]>([]);
    const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([]);
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);

    const [goalForm, setGoalForm] = useState({
        title: '',
        description: '',
        label_id: '',
    });

    const [challengeForm, setChallengeForm] = useState({
        title: '',
        challenge: '',
        mitigation: '',
        goal_id: '',
    });

    const [errors, setErrors] = useState<{
        title?: string;
        challenge?: string;
        goal_id?: string;
    }>({});

    // Fetch labels and goal templates on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [labelsData, goalsData] = await Promise.all([
                    getTaskLabels(),
                    getPrebuiltGoalTemplates(),
                ]);
                setLabels(labelsData);
                setGoalTemplates(goalsData);
            } catch (error) {
                console.error('Error fetching data:', error);
                Alert.alert('Error', 'Failed to load labels and goals');
            }
        };
        fetchData();
    }, []);

    const handleGoalInputChange = (field: string, value: string) => {
        setGoalForm((prev) => ({...prev, [field]: value}));
        if (errors[field as keyof typeof errors]) {
            setErrors((prev) => ({...prev, [field]: undefined}));
        }
    };

    const handleChallengeInputChange = (field: string, value: string) => {
        setChallengeForm((prev) => ({...prev, [field]: value}));
        if (errors[field as keyof typeof errors]) {
            setErrors((prev) => ({...prev, [field]: undefined}));
        }
    };

    const getLabelName = (labelId: string | undefined): string => {
        if (!labelId) return 'Select Label';
        const label = labels.find((l) => (l._id || l.id) === labelId);
        return label?.name || 'Select Label';
    };

    const getLabelColor = (labelId: string | undefined): string => {
        if (!labelId) return '#F6B8A3';
        const label = labels.find((l) => (l._id || l.id) === labelId);
        return label?.color || '#F6B8A3';
    };

    const getGoalTitle = (goalId: string | undefined): string => {
        if (!goalId) return 'Select Goal';
        const goal = goalTemplates.find((g) => (g._id || g.id) === goalId);
        return goal?.title || 'Select Goal';
    };

    const handleSave = async () => {
        // Reset errors
        setErrors({});

        // Validate based on template type
        if (templateType === 'Goal') {
            if (!goalForm.title.trim()) {
                setErrors({title: 'Title is required'});
                return;
            }

            try {
                setLoading(true);
                const templateData = {
                    title: goalForm.title.trim(),
                    description: goalForm.description.trim() || undefined,
                    label_id: goalForm.label_id || undefined,
                    is_prebuilt: false,
                };

                await createGoalTemplate(templateData);
                Alert.alert('Success', 'Goal template created successfully', [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]);
            } catch (error: any) {
                console.error('Error creating goal template:', error);
                Alert.alert('Error', error.message || 'Failed to create goal template');
            } finally {
                setLoading(false);
            }
        } else {
            // Challenge template
            if (!challengeForm.title.trim() && !challengeForm.challenge.trim()) {
                setErrors({challenge: 'Challenge title or description is required'});
                return;
            }

            try {
                setLoading(true);
                const templateData = {
                    title: challengeForm.title.trim() || challengeForm.challenge.trim(),
                    challenge: challengeForm.challenge.trim() || challengeForm.title.trim(),
                    mitigation: challengeForm.mitigation.trim() || undefined,
                    goal_id: challengeForm.goal_id || undefined,
                    is_prebuilt: false,
                };

                await createChallengeTemplate(templateData);
                Alert.alert('Success', 'Challenge template created successfully', [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]);
            } catch (error: any) {
                console.error('Error creating challenge template:', error);
                Alert.alert('Error', error.message || 'Failed to create challenge template');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <AppWrapper headerTitle="Create Template" headerVariant="default">
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Template Type Selector */}
                <View style={styles.typeSelector}>
                    <TouchableOpacity
                        style={[
                            styles.typeButton,
                            templateType === 'Goal' && styles.typeButtonActive,
                        ]}
                        onPress={() => setTemplateType('Goal')}
                    >
                        <Feather
                            name="target"
                            size={20}
                            color={templateType === 'Goal' ? '#1A1D1F' : '#9CA3AF'}
                        />
                        <Text
                            style={[
                                styles.typeButtonText,
                                templateType === 'Goal' && styles.typeButtonTextActive,
                            ]}
                        >
                            Goal
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.typeButton,
                            templateType === 'Challenge' && styles.typeButtonActive,
                        ]}
                        onPress={() => setTemplateType('Challenge')}
                    >
                        <Feather
                            name="award"
                            size={20}
                            color={templateType === 'Challenge' ? '#1A1D1F' : '#9CA3AF'}
                        />
                        <Text
                            style={[
                                styles.typeButtonText,
                                templateType === 'Challenge' && styles.typeButtonTextActive,
                            ]}
                        >
                            Challenge
                        </Text>
                    </TouchableOpacity>
                </View>

                {templateType === 'Goal' ? (
                    <>
                        {/* Goal Title */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Title <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, errors.title && styles.inputError]}
                                placeholder="Enter goal title"
                                placeholderTextColor="#9CA3AF"
                                value={goalForm.title}
                                onChangeText={(value) => handleGoalInputChange('title', value)}
                            />
                            {errors.title && (
                                <Text style={styles.errorText}>{errors.title}</Text>
                            )}
                        </View>

                        {/* Goal Description */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Enter goal description (optional)"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                value={goalForm.description}
                                onChangeText={(value) =>
                                    handleGoalInputChange('description', value)
                                }
                            />
                        </View>

                        {/* Label Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Label</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setShowLabelModal(true)}
                            >
                                <View style={styles.labelInputContent}>
                                    {goalForm.label_id ? (
                                        <View style={styles.selectedLabelRow}>
                                            <View
                                                style={[
                                                    styles.labelColorBar,
                                                    {backgroundColor: getLabelColor(goalForm.label_id)},
                                                ]}
                                            />
                                            <Text style={styles.selectedLabelText}>
                                                {getLabelName(goalForm.label_id)}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.placeholderText}>Select Label</Text>
                                    )}
                                    <Feather name="chevron-down" size={20} color="#9CA3AF"/>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Challenge Title */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter challenge title (optional)"
                                placeholderTextColor="#9CA3AF"
                                value={challengeForm.title}
                                onChangeText={(value) =>
                                    handleChallengeInputChange('title', value)
                                }
                            />
                        </View>

                        {/* Challenge Description */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Challenge <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textArea,
                                    errors.challenge && styles.inputError,
                                ]}
                                placeholder="Enter challenge description"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                value={challengeForm.challenge}
                                onChangeText={(value) =>
                                    handleChallengeInputChange('challenge', value)
                                }
                            />
                            {errors.challenge && (
                                <Text style={styles.errorText}>{errors.challenge}</Text>
                            )}
                        </View>

                        {/* Mitigation */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Mitigation</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Enter mitigation strategies (optional)"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                value={challengeForm.mitigation}
                                onChangeText={(value) =>
                                    handleChallengeInputChange('mitigation', value)
                                }
                            />
                        </View>

                        {/* Goal Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Related Goal</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setShowGoalModal(true)}
                            >
                                <View style={styles.labelInputContent}>
                                    {challengeForm.goal_id ? (
                                        <Text style={styles.selectedLabelText}>
                                            {getGoalTitle(challengeForm.goal_id)}
                                        </Text>
                                    ) : (
                                        <Text style={styles.placeholderText}>Select Goal (optional)</Text>
                                    )}
                                    <Feather name="chevron-down" size={20} color="#9CA3AF"/>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#1A1D1F"/>
                    ) : (
                        <Text style={styles.saveButtonText}>Save Template</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Label Selection Modal */}
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
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Label</Text>
                            <TouchableOpacity
                                onPress={() => setShowLabelModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Feather name="x" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalContent}>
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => {
                                    handleGoalInputChange('label_id', '');
                                    setShowLabelModal(false);
                                }}
                            >
                                <Text style={styles.modalItemText}>None</Text>
                            </TouchableOpacity>
                            {labels.map((label) => (
                                <TouchableOpacity
                                    key={label._id || label.id}
                                    style={styles.modalItem}
                                    onPress={() => {
                                        handleGoalInputChange('label_id', label._id || label.id || '');
                                        setShowLabelModal(false);
                                    }}
                                >
                                    <View
                                        style={[
                                            styles.labelColorBar,
                                            {backgroundColor: label.color || '#F6B8A3'},
                                        ]}
                                    />
                                    <Text style={styles.modalItemText}>{label.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Goal Selection Modal */}
            <Modal
                visible={showGoalModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGoalModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowGoalModal(false)}
                    />
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Goal</Text>
                            <TouchableOpacity
                                onPress={() => setShowGoalModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Feather name="x" size={24} color="#1A1D1F"/>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalContent}>
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => {
                                    handleChallengeInputChange('goal_id', '');
                                    setShowGoalModal(false);
                                }}
                            >
                                <Text style={styles.modalItemText}>None</Text>
                            </TouchableOpacity>
                            {goalTemplates.map((goal) => (
                                <TouchableOpacity
                                    key={goal._id || goal.id}
                                    style={styles.modalItem}
                                    onPress={() => {
                                        handleChallengeInputChange('goal_id', goal._id || goal.id || '');
                                        setShowGoalModal(false);
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{goal.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        marginBottom: 24,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    typeButtonActive: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    typeButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    typeButtonTextActive: {
        color: '#1A1D1F',
        fontWeight: '600',
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
    required: {
        color: '#EF4444',
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
    inputError: {
        borderColor: '#EF4444',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    placeholderText: {
        color: '#9CA3AF',
        fontSize: 16,
    },
    errorText: {
        marginTop: 4,
        fontSize: 12,
        color: '#EF4444',
    },
    labelInputContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectedLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    labelColorBar: {
        width: 4,
        height: 20,
        borderRadius: 2,
    },
    selectedLabelText: {
        fontSize: 16,
        color: '#1A1D1F',
    },
    saveButton: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
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
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalContent: {
        maxHeight: 400,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 12,
    },
    modalItemText: {
        fontSize: 16,
        color: '#1A1D1F',
    },
});
