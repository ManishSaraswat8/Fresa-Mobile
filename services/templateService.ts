/**
 * Template Service
 * Handles template-related API calls for goal and challenge templates
 */

import {API_CONFIG} from '../config/api';
import {fetchData} from './api';

export interface GoalTemplate {
    _id?: string;
    id?: string;
    title: string;
    description?: string;
    category?: string;
    label_id?: string;
    is_prebuilt: boolean;
    is_deleted?: boolean;
    deleted_at?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ChallengeTemplate {
    _id?: string;
    id?: string;
    title: string;
    description?: string;
    category?: string;
    goal_id?: string;
    challenge?: string;
    mitigation?: string;
    is_prebuilt: boolean;
    is_deleted?: boolean;
    deleted_at?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TaskLabel {
    _id?: string;
    id?: string;
    name?: string;
    title?: string;
    color?: string;
    isActive?: boolean;
    is_deleted?: boolean;
}

/**
 * Unified function to get templates (goals and challenges)
 * @param isPrebuilt - true for pre-built/system templates, false for user's templates
 * @param type - optional: 'goal' or 'challenge' to filter by type
 * @param labelId - optional: label_id to filter by label
 * @returns Combined array of goal and challenge templates
 */
export async function getTemplates(options?: {
    isPrebuilt?: boolean;
    type?: 'goal' | 'challenge';
    labelId?: string;
}): Promise<{ goals: GoalTemplate[]; challenges: ChallengeTemplate[] }> {
    try {
        const {isPrebuilt, type, labelId} = options || {};

        // Build query params
        const queryParams = new URLSearchParams();
        if (isPrebuilt !== undefined) {
            queryParams.append('is_prebuilt', String(isPrebuilt));
        }
        if (labelId) {
            queryParams.append('label_id', String(labelId));
        }

        const queryString = queryParams.toString();
        const urlSuffix = queryString ? `?${queryString}` : '';

        // Fetch both types in parallel (or filter by type if specified)
        const promises: Promise<any>[] = [];

        if (!type || type === 'goal') {
            promises.push(
                fetchData<GoalTemplate[]>(
                    `${API_CONFIG.TEMPLATES_API_URL}/goal-template${urlSuffix}`
                ).catch((err) => {
                    console.error('Error fetching goal templates:', err);
                    return [];
                })
            );
        } else {
            promises.push(Promise.resolve([]));
        }

        if (!type || type === 'challenge') {
            promises.push(
                fetchData<ChallengeTemplate[]>(
                    `${API_CONFIG.TEMPLATES_API_URL}/challenge-template${urlSuffix}`
                ).catch((err) => {
                    console.error('Error fetching challenge templates:', err);
                    return [];
                })
            );
        } else {
            promises.push(Promise.resolve([]));
        }

        const [goals, challenges] = await Promise.all(promises);

        return {
            goals: Array.isArray(goals) ? goals : [],
            challenges: Array.isArray(challenges) ? challenges : [],
        };
    } catch (error: any) {
        console.error('Error fetching templates:', error);
        return {goals: [], challenges: []};
    }
}

/**
 * Get all goal templates (user's templates)
 * @deprecated Use getTemplates({ isPrebuilt: false, type: 'goal' }) instead
 */
export async function getAllGoalTemplates(): Promise<GoalTemplate[]> {
    const result = await getTemplates({isPrebuilt: false, type: 'goal'});
    return result.goals;
}

/**
 * Get pre-built goal templates
 * @deprecated Use getTemplates({ isPrebuilt: true, type: 'goal' }) instead
 */
export async function getPrebuiltGoalTemplates(): Promise<GoalTemplate[]> {
    const result = await getTemplates({isPrebuilt: true, type: 'goal'});
    return result.goals;
}

/**
 * Get all challenge templates (user's templates)
 * @deprecated Use getTemplates({ isPrebuilt: false, type: 'challenge' }) instead
 */
export async function getAllChallengeTemplates(): Promise<ChallengeTemplate[]> {
    const result = await getTemplates({isPrebuilt: false, type: 'challenge'});
    return result.challenges;
}

/**
 * Get pre-built challenge templates
 * @deprecated Use getTemplates({ isPrebuilt: true, type: 'challenge' }) instead
 */
export async function getPrebuiltChallengeTemplates(): Promise<ChallengeTemplate[]> {
    const result = await getTemplates({isPrebuilt: true, type: 'challenge'});
    return result.challenges;
}

/**
 * Get all task labels from database
 */
export async function getTaskLabels(): Promise<TaskLabel[]> {
    try {
        const labels = await fetchData<TaskLabel[]>(
            `${API_CONFIG.TEMPLATES_API_URL}/labels`
        );
        // Filter out deleted and inactive labels, and transform to consistent format
        return (Array.isArray(labels) ? labels : [])
            .filter((label) => label.isActive !== false && label.is_deleted !== true)
            .map((label) => ({
                ...label,
                name: label.name || label.title || '',
            }));
    } catch (error: any) {
        console.error('Error fetching task labels:', error);
        return [];
    }
}

/**
 * Create a new task label
 */
export async function createTaskLabel(
    labelData: {
        title: string;
        description: string;
        color: string;
        categoryId?: string;
    }
): Promise<TaskLabel> {
    try {
        return await fetchData<TaskLabel>(
            `${API_CONFIG.TEMPLATES_API_URL}/labels`,
            {
                method: 'POST',
                body: JSON.stringify(labelData),
            }
        );
    } catch (error: any) {
        console.error('Error creating task label:', error);
        throw error;
    }
}

/**
 * Update an existing task label
 */
export async function updateTaskLabel(
    labelId: string,
    labelData: {
        title?: string;
        description?: string;
        color?: string;
        categoryId?: string;
        isActive?: boolean;
    }
): Promise<TaskLabel> {
    try {
        return await fetchData<TaskLabel>(
            `${API_CONFIG.TEMPLATES_API_URL}/labels/${labelId}`,
            {
                method: 'PUT',
                body: JSON.stringify(labelData),
            }
        );
    } catch (error: any) {
        console.error('Error updating task label:', error);
        throw error;
    }
}

/**
 * Delete a task label
 */
export async function deleteTaskLabel(labelId: string): Promise<void> {
    try {
        await fetchData(
            `${API_CONFIG.TEMPLATES_API_URL}/labels/${labelId}`,
            {
                method: 'DELETE',
            }
        );
    } catch (error: any) {
        console.error('Error deleting task label:', error);
        throw error;
    }
}

/**
 * Create a goal template
 */
export async function createGoalTemplate(
    templateData: Partial<GoalTemplate>
): Promise<GoalTemplate> {
    try {
        return await fetchData<GoalTemplate>(
            `${API_CONFIG.TEMPLATES_API_URL}/goal-template`,
            {
                method: 'POST',
                body: JSON.stringify(templateData),
            }
        );
    } catch (error: any) {
        console.error('Error creating goal template:', error);
        throw error;
    }
}

/**
 * Create a challenge template
 */
export async function createChallengeTemplate(
    templateData: Partial<ChallengeTemplate>
): Promise<ChallengeTemplate> {
    try {
        return await fetchData<ChallengeTemplate>(
            `${API_CONFIG.TEMPLATES_API_URL}/challenge-template`,
            {
                method: 'POST',
                body: JSON.stringify(templateData),
            }
        );
    } catch (error: any) {
        console.error('Error creating challenge template:', error);
        throw error;
    }
}

/**
 * Update a goal template
 */
export async function updateGoalTemplate(
    templateId: string,
    templateData: Partial<GoalTemplate>
): Promise<GoalTemplate> {
    try {
        return await fetchData<GoalTemplate>(
            `${API_CONFIG.TEMPLATES_API_URL}/goal-template/${templateId}`,
            {
                method: 'PUT',
                body: JSON.stringify(templateData),
            }
        );
    } catch (error: any) {
        console.error('Error updating goal template:', error);
        throw error;
    }
}

/**
 * Update a challenge template
 */
export async function updateChallengeTemplate(
    templateId: string,
    templateData: Partial<ChallengeTemplate>
): Promise<ChallengeTemplate> {
    try {
        return await fetchData<ChallengeTemplate>(
            `${API_CONFIG.TEMPLATES_API_URL}/challenge-template/${templateId}`,
            {
                method: 'PUT',
                body: JSON.stringify(templateData),
            }
        );
    } catch (error: any) {
        console.error('Error updating challenge template:', error);
        throw error;
    }
}

/**
 * Delete a goal template
 */
export async function deleteGoalTemplate(templateId: string): Promise<void> {
    try {
        await fetchData(
            `${API_CONFIG.TEMPLATES_API_URL}/goal-template/${templateId}`,
            {
                method: 'DELETE',
            }
        );
    } catch (error: any) {
        console.error('Error deleting goal template:', error);
        throw error;
    }
}

/**
 * Delete a challenge template
 */
export async function deleteChallengeTemplate(templateId: string): Promise<void> {
    try {
        await fetchData(
            `${API_CONFIG.TEMPLATES_API_URL}/challenge-template/${templateId}`,
            {
                method: 'DELETE',
            }
        );
    } catch (error: any) {
        console.error('Error deleting challenge template:', error);
        throw error;
    }
}
