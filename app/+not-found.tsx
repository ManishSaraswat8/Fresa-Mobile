import {View, Text, StyleSheet} from 'react-native';
import {Link, Stack} from 'expo-router';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{title: 'Oops! Not Found'}}/>
            <View style={styles.container}>
                <Text style={styles.title}>This screen doesn't exist.</Text>
                <Link href="/(tabs)/" style={styles.link}>
                    <Text style={styles.linkText}>Go to home screen!</Text>
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
    linkText: {
        fontSize: 14,
        color: '#6200ee',
        fontWeight: '600',
    },
});

