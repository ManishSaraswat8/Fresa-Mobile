import AsyncStorage from '@react-native-async-storage/async-storage';
import {WALKTHROUGH_KEYS} from './walkthroughConfig';

/**
 * Reset walkthrough completion status
 * Useful for testing or allowing users to replay tutorials
 */
export const resetWalkthrough = async (key: string) => {
    try {
        await AsyncStorage.removeItem(key);
    } catch (error) {
        console.error('Error resetting walkthrough:', error);
    }
};

/**
 * Reset all walkthroughs
 */
export const resetAllWalkthroughs = async () => {
    try {
        await Promise.all(
            Object.values(WALKTHROUGH_KEYS).map((key) => AsyncStorage.removeItem(key))
        );
    } catch (error) {
        console.error('Error resetting all walkthroughs:', error);
    }
};

/**
 * Check if a walkthrough has been completed
 */
export const isWalkthroughCompleted = async (key: string): Promise<boolean> => {
    try {
        const status = await AsyncStorage.getItem(key);
        return status === 'true';
    } catch (error) {
        console.error('Error checking walkthrough status:', error);
        return false;
    }
};
