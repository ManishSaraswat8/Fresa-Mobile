import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {useState, useEffect, useCallback} from 'react';
import {getPHQ9Feedback, submitPHQ9Feedback} from '@/services/api';
import Toast from 'react-native-toast-message';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';

interface Question {
    id: number;
    text: string;
}

interface Option {
    label: string;
    value: number;
}

export default function PHQ9Screen() {
    const router = useRouter();
    const [answers, setAnswers] = useState<{ [key: number]: number }>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [existingFeedback, setExistingFeedback] = useState<any>(null);
    const [showScore, setShowScore] = useState(false);

    const questions: Question[] = [
        {id: 1, text: 'Little interest or pleasure in doing things'},
        {id: 2, text: 'Feeling down, depressed or hopeless'},
        {id: 3, text: 'Trouble falling asleep, staying asleep, or sleeping too much'},
        {id: 4, text: 'Feeling tired or having little energy'},
        {id: 5, text: 'Poor appetite or overeating'},
        {
            id: 6,
            text: 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down'
        },
        {id: 7, text: 'Trouble concentrating on things, such as reading the newspaper or watching television'},
        {
            id: 8,
            text: 'Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual'
        },
        {id: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself'},
    ];

    const options: Option[] = [
        {label: 'Not at all', value: 0},
        {label: 'Several days', value: 1},
        {label: 'More than half the days', value: 2},
        {label: 'Nearly every day', value: 3},
    ];

    const handleOptionSelect = (questionId: number, value: number) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: value,
        }));
    };

    const calculateTotalScore = (): number => {
        return Object.values(answers).reduce((sum, score) => sum + score, 0);
    };

    const getSeverityColor = (severity: string): string => {
        switch (severity) {
            case 'Minimal or None':
                return '#10B981'; // Green
            case 'Mild':
                return '#3B82F6'; // Blue
            case 'Moderate':
                return '#F59E0B'; // Yellow/Orange
            case 'Moderately Severe':
                return '#EF4444'; // Red
            case 'Severe':
                return '#DC2626'; // Dark Red
            default:
                return '#6B7280';
        }
    };

    // Load existing PHQ9 feedback (most recent)
    const loadExistingFeedback = useCallback(async () => {
        try {
            setLoading(true);
            const feedbacks = await getPHQ9Feedback();

            if (feedbacks && feedbacks.length > 0) {
                const mostRecent = feedbacks[0]; // Already sorted by submitted_at desc
                setExistingFeedback(mostRecent);

                // Populate answers from existing feedback
                if (mostRecent.answers && mostRecent.answers.length === 9) {
                    const answerMap: { [key: number]: number } = {};
                    mostRecent.answers.forEach((answer: number, index: number) => {
                        answerMap[index + 1] = answer;
                    });
                    setAnswers(answerMap);
                }
            } else {
                setExistingFeedback(null);
            }
        } catch (error: any) {
            console.error('Error loading existing PHQ9 feedback:', error);
            // Don't show error toast - it's okay if no feedback exists yet
            setExistingFeedback(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load PHQ9 feedback on mount and when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('🔄 [PHQ9] Screen focused, reloading PHQ9 feedback...');
            loadExistingFeedback();
        }, [loadExistingFeedback])
    );

    const handleSubmit = async () => {
        try {
            // Validate that all 9 questions are answered
            if (Object.keys(answers).length !== 9) {
                Alert.alert(
                    'Validation Error',
                    'Please answer all 9 questions before submitting.',
                    [{text: 'OK'}]
                );
                return;
            }

            // Convert answers object to array (questions 1-9)
            const answersArray = [];
            for (let i = 1; i <= 9; i++) {
                if (answers[i] === undefined || answers[i] === null) {
                    Alert.alert(
                        'Validation Error',
                        'Please answer all 9 questions before submitting.',
                        [{text: 'OK'}]
                    );
                    return;
                }
                answersArray.push(answers[i]);
            }

            setSubmitting(true);

            const result = await submitPHQ9Feedback(answersArray);

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: `PHQ-9 submitted successfully. Score: ${result.total_score}/27 (${result.severity})`,
                position: 'top',
            });

            setShowScore(true);

            // Reload existing feedback
            await loadExistingFeedback();

            // Redirect to feedbacks page after a short delay to show the success message
            setTimeout(() => {
                router.push('/(tabs)/feedbacks' as any);
            }, 1500);
        } catch (error: any) {
            console.error('Error submitting PHQ9:', error);
            Alert.alert(
                'Submission Error',
                error.message || 'Failed to submit PHQ-9. Please try again.',
                [{text: 'OK'}]
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AppWrapper headerTitle="Feedback" headerVariant="default">
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* PHQ-9 Button */}
                <TouchableOpacity style={styles.phq9Button}>
                    <View style={styles.phq9ButtonHeader}>
                        <Text style={styles.phq9ButtonText}>PHQ-9</Text>
                        {existingFeedback && (
                            <View style={styles.submittedBadge}>
                                <Feather name="check-circle" size={16} color="#10B981"/>
                                <Text style={styles.submittedText}>Submitted</Text>
                            </View>
                        )}
                    </View>
                    {existingFeedback && existingFeedback.submitted_at && (
                        <Text style={styles.submittedDate}>
                            Last submitted on {new Date(existingFeedback.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                        </Text>
                    )}
                    {existingFeedback && (
                        <View style={styles.scoreContainer}>
                            <View style={styles.scoreBox}>
                                <Text style={styles.scoreLabel}>Score</Text>
                                <Text style={styles.scoreValue}>{existingFeedback.total_score}/27</Text>
                            </View>
                            <View
                                style={[styles.severityBox, {backgroundColor: getSeverityColor(existingFeedback.severity) + '20'}]}>
                                <Text style={styles.severityLabel}>Severity</Text>
                                <Text
                                    style={[styles.severityValue, {color: getSeverityColor(existingFeedback.severity)}]}>
                                    {existingFeedback.severity}
                                </Text>
                            </View>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Introduction Text */}
                <Text style={styles.introText}>
                    In the last 2 Weeks, how often have you been bothered by the following problems?
                </Text>

                {/* Questions */}
                {questions.map((question) => (
                    <View key={question.id} style={styles.questionCard}>
                        <Text style={styles.questionText}>
                            {question.id}. {question.text}
                        </Text>
                        <View style={styles.optionsContainer}>
                            {options.map((option) => {
                                const isSelected = answers[question.id] === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={styles.optionButton}
                                        onPress={() => handleOptionSelect(question.id, option.value)}
                                    >
                                        <View style={styles.optionContent}>
                                            <View style={styles.radioButtonRow}>
                                                <View style={styles.radioButton}>
                                                    {isSelected && <View style={styles.radioButtonInner}/>}
                                                </View>
                                                <Text style={styles.optionScore}>
                                                    {option.value > 0 ? '+' : ''}{option.value}
                                                </Text>
                                            </View>
                                            <Text style={styles.optionLabel}>{option.label}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}

                {/* Submit Button */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#F6B8A3"/>
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#1A1D1F"/>
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {existingFeedback ? 'Update PHQ-9' : 'Submit PHQ-9'}
                            </Text>
                        )}
                    </TouchableOpacity>
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
        paddingBottom: 40,
    },
    phq9Button: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
    },
    phq9ButtonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    phq9ButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    submittedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    submittedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    submittedDate: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
    },
    scoreContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    scoreBox: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    scoreValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    severityBox: {
        flex: 1,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    severityLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    severityValue: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        marginTop: 24,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    introText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
        marginBottom: 24,
        lineHeight: 24,
    },
    questionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
        marginBottom: 16,
        lineHeight: 22,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'space-between',
    },
    optionButton: {
        flex: 1,
        minWidth: '22%',
        maxWidth: '24%',
    },
    optionContent: {
        alignItems: 'center',
        gap: 6,
    },
    radioButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#1A1D1F',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1A1D1F',
    },
    optionLabel: {
        fontSize: 12,
        fontWeight: '400',
        color: '#1A1D1F',
        textAlign: 'center',
    },
    optionScore: {
        fontSize: 13,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    submitButton: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
});

