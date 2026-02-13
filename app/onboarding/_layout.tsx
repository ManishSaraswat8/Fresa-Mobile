import {Stack} from 'expo-router';

export default function OnboardingLayout() {
    return (
        <Stack screenOptions={{headerShown: false}}>
            <Stack.Screen name="splash"/>
            <Stack.Screen name="phone-number"/>
            <Stack.Screen name="set-pin"/>
            <Stack.Screen name="profile"/>
            <Stack.Screen name="video"/>
        </Stack>
    );
}
