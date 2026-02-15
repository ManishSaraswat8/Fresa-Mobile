/**
 * Media Service
 * Handles fetching public media (onboarding/explainer videos) for mobile app
 */

import {API_CONFIG} from '../config/api';

export interface PublicMediaItem {
    _id: string;
    name: string;
    type: 'onboarding' | 'explainer';
    media_type: 'url' | 'upload';
    url: string | null;
}

/**
 * Fetch public onboarding videos for a clinic (no auth required)
 * Used during onboarding flow
 */
export async function getPublicOnboardingVideos(clinicId: string): Promise<PublicMediaItem[]> {
    try {
        const response = await fetch(
            `${API_CONFIG.ANALYTICS_API_URL}/media-manager/public?clinic_id=${encodeURIComponent(clinicId)}&type=onboarding`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.warn('Failed to fetch onboarding videos:', response.status);
            return [];
        }

        const data = await response.json();
        const items = data?.data?.items ?? [];
        return items.filter((item: PublicMediaItem) => item.url);
    } catch (error: any) {
        console.error('Error fetching onboarding videos:', error);
        return [];
    }
}
