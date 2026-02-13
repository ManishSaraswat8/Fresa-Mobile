/**
 * Master Week Service
 * Handles API calls for master week CRUD operations
 */

import {fetchData} from './api';
import {API_CONFIG} from '../config/api';

export interface TimeBlock {
    id: string;
    labelId: string;
    labelName: string;
    labelColor: string;
    hours: number;
    startTime: string; // Format: "HH:mm"
    endTime: string; // Format: "HH:mm"
}

export interface DayTimeBlocks {
    [dayKey: string]: TimeBlock[];
}

export interface MasterWeek {
    _id?: string;
    id?: string;
    name: string;
    weekStart: string; // ISO date string
    weekEnd: string; // ISO date string
    timeBlocks: DayTimeBlocks;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Get all master weeks for the current user
 */
export async function getMasterWeeks(): Promise<MasterWeek[]> {
    return fetchData<MasterWeek[]>(`${API_CONFIG.TEMPLATES_API_URL}/master-week`);
}

/**
 * Get master week by ID
 */
export async function getMasterWeekById(id: string): Promise<MasterWeek> {
    return fetchData<MasterWeek>(`${API_CONFIG.TEMPLATES_API_URL}/master-week/${id}`);
}

/**
 * Create a new master week
 */
export async function createMasterWeek(masterWeekData: {
    name: string;
    weekStart: string;
    weekEnd: string;
    timeBlocks: DayTimeBlocks;
}): Promise<MasterWeek> {
    return fetchData<MasterWeek>(`${API_CONFIG.TEMPLATES_API_URL}/master-week`, {
        method: 'POST',
        body: JSON.stringify(masterWeekData),
    });
}

/**
 * Update an existing master week
 */
export async function updateMasterWeek(
    id: string,
    masterWeekData: {
        name?: string;
        weekStart?: string;
        weekEnd?: string;
        timeBlocks?: DayTimeBlocks;
    }
): Promise<MasterWeek> {
    return fetchData<MasterWeek>(`${API_CONFIG.TEMPLATES_API_URL}/master-week/${id}`, {
        method: 'PUT',
        body: JSON.stringify(masterWeekData),
    });
}

/**
 * Delete a master week
 */
export async function deleteMasterWeek(id: string): Promise<void> {
    return fetchData<void>(`${API_CONFIG.TEMPLATES_API_URL}/master-week/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Get master weeks for a specific date range
 */
export async function getMasterWeeksByDateRange(
    startDate: string,
    endDate: string
): Promise<MasterWeek[]> {
    return fetchData<MasterWeek[]>(
        `${API_CONFIG.TEMPLATES_API_URL}/master-week?startDate=${startDate}&endDate=${endDate}`
    );
}
