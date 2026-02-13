import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useState} from 'react';

interface FAQItem {
    id: number;
    question: string;
    answer: string;
}

export default function FAQScreen() {
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

    const faqItems: FAQItem[] = [
        {
            id: 1,
            question: 'How much water should I drink daily?',
            answer:
                'Most adults need around 2-3 liters of water per day, depending on activity, climate, and overall health. Listen to your thirst and keep urine light yellow as a good indicator.',
        },
        {
            id: 2,
            question: 'How many hours of sleep are recommended?',
            answer:
                'Adults should aim for 7-9 hours of sleep per night. Quality sleep is essential for physical and mental health, helping with memory, mood, and overall well-being.',
        },
        {
            id: 3,
            question: 'How often should I exercise?',
            answer:
                'The World Health Organization recommends at least 150 minutes of moderate-intensity aerobic activity or 75 minutes of vigorous-intensity activity per week, plus muscle-strengthening activities on 2 or more days.',
        },
        {
            id: 4,
            question: 'Are all fats bad for health?',
            answer:
                'No, not all fats are bad. Unsaturated fats (found in nuts, avocados, and fish) are beneficial for heart health. Saturated and trans fats should be limited. Focus on a balanced diet with healthy fat sources.',
        },
        {
            id: 5,
            question: 'Is skipping breakfast unhealthy?',
            answer:
                'While breakfast can provide important nutrients and energy, skipping it isn\'t necessarily unhealthy if you maintain a balanced diet throughout the day. Listen to your body\'s hunger cues and eat when you feel hungry.',
        },
        {
            id: 6,
            question: 'When should I see a doctor about mental health?',
            answer:
                'You should see a doctor or mental health professional if you experience persistent feelings of sadness, anxiety, changes in sleep or appetite, difficulty concentrating, or thoughts of self-harm. Early intervention is key to effective treatment.',
        },
        {
            id: 7,
            question: 'Do I need vaccines as an adult?',
            answer:
                'Yes, adults need certain vaccines including annual flu shots, COVID-19 boosters, tetanus boosters every 10 years, and others depending on age, health conditions, and lifestyle. Consult with your healthcare provider for a personalized vaccination schedule.',
        },
    ];

    const toggleItem = (id: number) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedItems(newExpanded);
    };

    return (
        <AppWrapper headerTitle="FAQ's" headerVariant="default">
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {faqItems.map((item) => {
                    const isExpanded = expandedItems.has(item.id);
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.faqCard}
                            onPress={() => toggleItem(item.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.faqHeader}>
                                <View style={styles.faqContent}>
                                    <Text style={styles.faqNumber}>{item.id}.</Text>
                                    <Text style={styles.faqQuestion}>{item.question}</Text>
                                </View>
                                <Feather
                                    name={isExpanded ? 'minus' : 'plus'}
                                    size={24}
                                    color="#1A1D1F"
                                />
                            </View>
                            {isExpanded && (
                                <View style={styles.faqAnswerContainer}>
                                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
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
    faqCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    faqContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginRight: 12,
    },
    faqNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        marginRight: 8,
    },
    faqQuestion: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
        lineHeight: 24,
    },
    faqAnswerContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    faqAnswer: {
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 22,
    },
});

