import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {AppWrapper} from '@/app/component/AppWrapper';
import {useRouter} from 'expo-router';

interface FeedbackOption {
    id: string;
    title: string;
    route: string;
}

export default function FeedbacksScreen() {
    const router = useRouter();

    const feedbackOptions: FeedbackOption[] = [
        {id: 'area-of-life', title: 'Area of Life Feedback', route: 'feedbacks/area-of-life'},
        {id: 'daily', title: 'Daily Feedback', route: 'feedbacks/daily'},
        {id: 'phq9', title: 'PHQ9', route: 'feedbacks/phq9'},
    ];

    const handleFeedbackSelect = (route: string) => {
        router.push(`/(tabs)/${route}` as any);
    };

    return (
        <AppWrapper headerTitle="Feedback" headerVariant="default">
            <View style={styles.container}>
                {/* Title Section - Your Feedback */}
                <View style={styles.titleSection}>
                    <Text style={styles.titleText}>Your Feedback</Text>
                </View>

                {/* Feedback Options */}
                {feedbackOptions.map((option) => {
                    return (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.feedbackOption}
                            onPress={() => handleFeedbackSelect(option.route)}
                        >
                            <Text style={styles.feedbackOptionText}>
                                {option.title}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </AppWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 16,
    },
    titleSection: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    titleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
        textAlign: 'center',
    },
    feedbackOption: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    feedbackOptionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
        textAlign: 'center',
    },
});

