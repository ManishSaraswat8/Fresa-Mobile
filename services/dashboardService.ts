/**
 * Dashboard Service
 * Handles dashboard-related API calls
 */

import {API_CONFIG} from '../config/api';
import {fetchData} from './api';
import {getUserData} from './authService';

export interface Task {
    _id: string;
    title: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'ON_HOLD' | 'PENDING';
    time_line?: {
        start?: string;
        end?: string;
    };
    sections?: any[];
    group_id?: string;
    category_id?: string;
    segment_id?: string;
    label_id?: string;
    template_id?: string;
    is_template?: boolean;
    goal_ids?: string[];
    challenge_ids?: string[];
    user_id?: string;
    clinic_id?: string;
    qr_scan_required_to_start_task?: boolean;
    qr_scan_required_to_complete_task?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Get all patient tasks
 */
export async function getPatientTasks(): Promise<Task[]> {
    try {
        const tasks = await fetchData<Task[]>(`${API_CONFIG.TEMPLATES_API_URL}/patientApp/task`);
        return Array.isArray(tasks) ? tasks : [];
    } catch (error: any) {
        console.error('Error fetching patient tasks:', error);
        return [];
    }
}

/**
 * Get a single patient task by ID
 */
export async function getPatientTaskById(taskId: string): Promise<Task | null> {
    try {
        const task = await fetchData<Task>(`${API_CONFIG.TEMPLATES_API_URL}/patientApp/task/${taskId}`);
        return task || null;
    } catch (error: any) {
        console.error('Error fetching task by ID:', error);
        return null;
    }
}

/**
 * Get tasks for today
 */
export function getTodayTasks(tasks: Task[]): Task[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter(task => {
        if (!task.time_line?.start) return false;
        const taskDate = new Date(task.time_line.start);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= today && taskDate < tomorrow;
    });
}

/**
 * Get tasks for this week
 */
export function getWeekTasks(tasks: Task[]): Task[] {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return tasks.filter(task => {
        if (!task.time_line?.start) return false;
        const taskDate = new Date(task.time_line.start);
        return taskDate >= weekStart && taskDate < weekEnd;
    });
}

/**
 * Get tasks for this month
 */
export function getMonthTasks(tasks: Task[]): Task[] {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    return tasks.filter(task => {
        if (!task.time_line?.start) return false;
        const taskDate = new Date(task.time_line.start);
        return taskDate >= monthStart && taskDate < monthEnd;
    });
}

/**
 * Format task time for display
 */
export function formatTaskTime(task: Task): string {
    if (!task.time_line?.start) return '';

    const startDate = new Date(task.time_line.start);
    const endDate = task.time_line.end ? new Date(task.time_line.end) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(startDate);
    taskDate.setHours(0, 0, 0, 0);

    const isToday = taskDate.getTime() === today.getTime();

    // Format date: "Today" or "Sun, Jan 30" or "Jan 30, 2026"
    let dateLabel = '';
    if (isToday) {
        dateLabel = 'Today';
    } else {
        // Check if it's within the current week (same year)
        const daysDiff = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff <= 6) {
            // Same week: show day name and date
            dateLabel = startDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        } else {
            // Different week/month: show full date
            dateLabel = startDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: startDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    const startTime = startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    if (endDate) {
        const endTime = endDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        return `${dateLabel}, ${startTime} - ${endTime}`;
    }

    return `${dateLabel}, ${startTime}`;
}

/**
 * Check if a task is in the past (missed)
 */
function isTaskMissed(task: Task): boolean {
    if (task.status === 'COMPLETED') {
        return false; // Completed tasks are never "missed"
    }

    if (!task.time_line?.start) {
        return false; // No start date, can't determine if missed
    }

    const now = new Date();
    const taskEndDate = task.time_line?.end
        ? new Date(task.time_line.end)
        : new Date(task.time_line.start);

    // Task is missed if end date/time is in the past and status is not completed
    return taskEndDate < now;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string, task?: Task): string {
    // Check if task is missed (past due and not completed)
    if (task && isTaskMissed(task)) {
        return '#F44336'; // Red for missed
    }

    switch (status) {
        case 'COMPLETED':
            return '#4CAF50';
        case 'IN_PROGRESS':
            return '#2196F3';
        case 'ON_HOLD':
            return '#FF9800';
        case 'PENDING':
            return '#4CAF50'; // Green for upcoming
        default:
            return '#9E9E9E';
    }
}

/**
 * Get status label
 */
export function getStatusLabel(status: string, task?: Task): string {
    // Check if task is missed (past due and not completed)
    if (task && isTaskMissed(task)) {
        return 'Missed';
    }

    switch (status) {
        case 'COMPLETED':
            return 'Completed';
        case 'IN_PROGRESS':
            return 'In Progress';
        case 'ON_HOLD':
            return 'On Hold';
        case 'PENDING':
            return 'Upcoming';
        default:
            return status;
    }
}

/**
 * Depression Analysis Types
 */
export interface DepressionDataPoint {
    date: string; // ISO date string (YYYY-MM-DD)
    totalScore?: number; // PHQ9 total score (0-27) - from dashboard endpoint
    depressivität?: number; // PHQ9 total score (0-27) - from patient endpoint
    severity?: string; // Severity level
    averageScore?: number; // Average score if multiple patients
    patientCount?: number; // Number of patients with data for this date
}

export interface DepressionBalanceResponse {
    data: DepressionDataPoint[];
}

/**
 * Task Analytics Types
 */
export interface LabelAnalytics {
    labelId: string;
    labelName: string;
    completed: number;
    total: number;
    color?: string;
}

export interface TaskAnalyticsResponse {
    label?: {
        tasks: Array<{
            labelId: string;
            labelName: string;
            completed: number;
            total: number;
        }>;
        feedback: Array<{
            labelId: string;
            labelName: string;
            count: number;
        }>;
    };
}

/**
 * Get patient ID for current user
 * Returns null if not found, but doesn't throw error
 */
async function getCurrentPatientId(): Promise<string | null> {
    try {
        const userData = await getUserData();
        if (!userData) return null;

        const userId = (userData as any)._id || userData.id;
        if (!userId) return null;

        // Don't fetch all patients - instead, we'll use userId directly in the API call
        // The backend endpoint now accepts userId as query param or uses current user
        return null; // Return null to trigger userId-based API call
    } catch (error: any) {
        console.error('Error getting patient ID:', error);
        return null;
    }
}

/**
 * Get depression evaluation data for current patient
 * Uses patient-specific endpoint that requires VIEW_PATIENT permission
 */
export async function getPatientDepressionEvaluation(
    patientId: string,
    startDate?: string,
    endDate?: string
): Promise<DepressionBalanceResponse> {
    try {
        const params = new URLSearchParams();
        if (startDate) {
            params.append('startDate', startDate);
            params.append('from', startDate); // Backend supports both
        }
        if (endDate) {
            params.append('endDate', endDate);
            params.append('until', endDate); // Backend supports both
        }

        const url = `${API_CONFIG.CORE_API_URL}/patient/${patientId}/evaluation/depression${params.toString() ? '?' + params.toString() : ''}`;

        const response = await fetchData<any>(url, {
            method: 'GET',
        });

        // Backend returns: { success: true, message: "...", data: { data: [...] } }
        // Or sometimes: { data: [...] }
        let dataArray: DepressionDataPoint[] = [];

        if (response) {
            // Handle nested data structure
            if (response.data && Array.isArray(response.data)) {
                dataArray = response.data;
            } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                dataArray = response.data.data;
            } else if (Array.isArray(response)) {
                dataArray = response;
            }
        }

        // Transform patient endpoint format (depressivität) to standard format (totalScore)
        const transformedData = dataArray.map((point: any) => ({
            date: point.date,
            totalScore: point.totalScore ?? point.depressivität ?? 0,
            depressivität: point.depressivität ?? point.totalScore ?? 0,
            severity: point.severity,
            averageScore: point.averageScore,
            patientCount: point.patientCount,
        }));

        return {data: transformedData};
    } catch (error: any) {
        console.error('Error fetching patient depression evaluation:', error);
        throw error;
    }
}

/**
 * Get depression balance graph data
 * For patients: uses patient-specific endpoint
 * For doctors/admins: uses dashboard endpoint
 */
export async function getDepressionBalanceGraph(
    startDate?: string,
    endDate?: string,
    patientId?: string
): Promise<DepressionBalanceResponse> {
    try {
        // If patientId is provided, use patient endpoint
        if (patientId) {
            return await getPatientDepressionEvaluation(patientId, startDate, endDate);
        }

        // For patient users, use "self" endpoint to get their own depression data
        const userData = await getUserData();
        if (userData) {
            const userId = (userData as any)._id || userData.id;
            if (userId) {
                try {
                    const params = new URLSearchParams();
                    if (startDate) {
                        params.append('startDate', startDate);
                        params.append('from', startDate);
                    }
                    if (endDate) {
                        params.append('endDate', endDate);
                        params.append('until', endDate);
                    }

                    // Call with "self" as patientId - backend will use current user's ID
                    const url = `${API_CONFIG.CORE_API_URL}/patient/self/evaluation/depression${params.toString() ? '?' + params.toString() : ''}`;
                    const response = await fetchData<any>(url, {
                        method: 'GET',
                    });

                    // Handle response format
                    let dataArray: DepressionDataPoint[] = [];
                    if (response && 'data' in response && Array.isArray(response.data)) {
                        dataArray = response.data;
                    } else if (Array.isArray(response)) {
                        dataArray = response;
                    }

                    const transformedData = dataArray.map((point: any) => ({
                        date: point.date,
                        totalScore: point.totalScore ?? point.depressivität ?? 0,
                        depressivität: point.depressivität ?? point.totalScore ?? 0,
                        severity: point.severity,
                        averageScore: point.averageScore,
                        patientCount: point.patientCount,
                    }));

                    return {data: transformedData};
                } catch (err: any) {
                    // If self endpoint fails, check if it's a permission error
                    // If so, don't try dashboard endpoint (which also requires permission)
                    const errorMessage = err.message || '';
                    if (errorMessage.includes('Permission') || errorMessage.includes('Unauthorized')) {
                        console.error('Permission denied for self endpoint:', err);
                        throw err;
                    }
                    // For other errors, still throw (don't fall back to dashboard)
                    console.error('Error fetching depression data via self endpoint:', err);
                    throw err;
                }
            } else {
                // No user data - can't proceed
                throw new Error('User not logged in');
            }
        } else {
            // No user data - can't proceed
            throw new Error('User not logged in');
        }

        // Removed dashboard endpoint fallback - it requires VIEW_REPORT permission
        // Patients should use the "self" endpoint above
        // Doctors/admins can call this function with a specific patientId
    } catch (error: any) {
        console.error('Error fetching depression balance graph:', error);
        throw error;
    }
}

/**
 * Get task analytics by labels
 * For patients: calculates directly from tasks (no permission required)
 * For doctors/admins: can use analytics API endpoint
 */
export async function getTaskAnalyticsByLabels(
    startDate?: string,
    endDate?: string
): Promise<LabelAnalytics[]> {
    // For patients, calculate directly from tasks (no VIEW_REPORT permission needed)
    // This avoids permission errors and works for all users
    try {
        return await calculateTaskAnalyticsFromTasks(startDate, endDate);
    } catch (error: any) {
        console.error('Error calculating task analytics from tasks:', error);
        // If that fails, try the analytics API (for doctors/admins with VIEW_REPORT permission)
        try {
            const params = new URLSearchParams();
            params.append('configType', 'label');
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const url = `${API_CONFIG.ANALYTICS_API_URL}/dashboard/analytics/configurations${params.toString() ? '?' + params.toString() : ''}`;

            const response = await fetchData<TaskAnalyticsResponse>(url, {
                method: 'GET',
            });

            // Get labels to match colors
            const {getTaskLabels} = await import('./templateService');
            const labels = await getTaskLabels();
            const labelColorMap = new Map<string, string>();
            labels.forEach((label: any) => {
                const labelId = String(label._id || label.id || '');
                labelColorMap.set(labelId, label.color || '#F6B8A3');
            });

            // Transform response to LabelAnalytics format
            if (response && response.label && response.label.tasks) {
                return response.label.tasks.map((item) => ({
                    labelId: item.labelId,
                    labelName: item.labelName,
                    completed: item.completed || 0,
                    total: item.total || 0,
                    color: labelColorMap.get(item.labelId) || '#F6B8A3',
                }));
            }

            return [];
        } catch (apiError: any) {
            console.error('Error fetching task analytics from API:', apiError);
            // Return empty array if both methods fail
            return [];
        }
    }
}

/**
 * Calculate task analytics from tasks directly (fallback method)
 */
async function calculateTaskAnalyticsFromTasks(
    startDate?: string,
    endDate?: string
): Promise<LabelAnalytics[]> {
    try {
        // Get all tasks
        const tasks = await getPatientTasks();

        // Get all labels
        const {getTaskLabels} = await import('./templateService');
        const labels = await getTaskLabels();

        // Filter tasks by date range if provided (use time_line.start, not createdAt)
        let filteredTasks = tasks;
        if (startDate || endDate) {
            filteredTasks = tasks.filter((task) => {
                // Use time_line.start if available, otherwise fall back to createdAt
                const taskDateStr = task.time_line?.start || task.createdAt;
                if (!taskDateStr) return false;
                const taskDate = new Date(taskDateStr);
                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    if (taskDate < start) return false;
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (taskDate > end) return false;
                }
                return true;
            });
        }

        // Group tasks by label (check both label_id and sections array)
        const labelStats = new Map<string, {
            completed: number;
            total: number;
            name: string;
            color: string;
            labelId: string
        }>();

        filteredTasks.forEach((task) => {
            let labelId: string | null = null;
            let labelName = 'Unlabeled';
            let labelColor = '#9CA3AF'; // Gray color for unlabeled tasks

            // First, check if label is populated (from backend)
            const populatedLabel = (task as any).label;
            if (populatedLabel) {
                labelId = String(populatedLabel._id || populatedLabel.id);
                labelName = populatedLabel.name || populatedLabel.title || 'Unknown';
                labelColor = populatedLabel.color || '#F6B8A3';
            }

            // If not populated, try to get label from label_id field
            if (!labelId && task.label_id) {
                labelId = String(task.label_id);
                const label = labels.find((l: any) => String(l._id || l.id) === labelId);
                if (label) {
                    labelName = label.name || label.title || 'Unknown';
                    labelColor = label.color || '#F6B8A3';
                }
            }

            // If no label_id, check sections array for label
            if (!labelId && task.sections && task.sections.length > 0) {
                // First, try to find section with type === 'label' (most common case)
                let labelSection = task.sections.find((s: any) => s.type === 'label');

                // If not found, check if first section might be a label (some tasks store label as first section)
                if (!labelSection && task.sections.length > 0) {
                    const firstSection = task.sections[0];
                    // Check if first section looks like a label (has a name that matches a known label)
                    if (firstSection && firstSection.name) {
                        const sectionName = String(firstSection.name).trim();
                        const matchesKnownLabel = labels.some((l: any) => {
                            const labelTitle = (l.title || l.name || '').trim();
                            return labelTitle.toLowerCase() === sectionName.toLowerCase();
                        });
                        if (matchesKnownLabel) {
                            labelSection = firstSection;
                        }
                    }
                }

                if (labelSection) {
                    const labelNameFromSection = String(labelSection.name || labelSection.value || '').trim();

                    if (labelNameFromSection) {
                        // Try to find matching label by name/title
                        const matchingLabel = labels.find((l: any) => {
                            const labelTitle = (l.title || l.name || '').trim();
                            return labelTitle.toLowerCase() === labelNameFromSection.toLowerCase();
                        });

                        if (matchingLabel) {
                            labelId = String(matchingLabel._id || matchingLabel.id);
                            labelName = matchingLabel.name || matchingLabel.title || labelNameFromSection;
                            labelColor = matchingLabel.color || '#F6B8A3';
                        } else {
                            // Label name exists in section but not found in labels list
                            // Use the name from section as-is
                            labelId = `section_${labelNameFromSection}`;
                            labelName = labelNameFromSection;
                            labelColor = '#F6B8A3'; // Default color
                        }
                    }
                }
            }

            // If still no label found, mark as unlabeled
            if (!labelId) {
                labelId = '__unlabeled__';
            }

            // Use labelId as the key, but store the actual label name and color
            const statsKey = labelId;

            if (!labelStats.has(statsKey)) {
                labelStats.set(statsKey, {
                    completed: 0,
                    total: 0,
                    name: labelName,
                    color: labelColor,
                    labelId: labelId,
                });
            }

            const stats = labelStats.get(statsKey)!;
            stats.total += 1;
            if (task.status === 'COMPLETED') {
                stats.completed += 1;
            }
        });

        // Convert to array format
        return Array.from(labelStats.entries()).map(([key, stats]) => ({
            labelId: stats.labelId,
            labelName: stats.name,
            completed: stats.completed,
            total: stats.total,
            color: stats.color,
        }));
    } catch (error: any) {
        console.error('Error calculating task analytics from tasks:', error);
        return [];
    }
}


/**
 * Get PHQ9 severity level from score
 */
export function getPHQ9Severity(score: number): string {
    if (score >= 0 && score <= 4) return 'Minimal';
    if (score >= 5 && score <= 9) return 'Mild';
    if (score >= 10 && score <= 14) return 'Moderate';
    if (score >= 15 && score <= 19) return 'Moderately Severe';
    return 'Severe';
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: string): string {
    switch (severity.toLowerCase()) {
        case 'minimal':
            return '#10B981'; // Green
        case 'mild':
            return '#FCD34D'; // Yellow
        case 'moderate':
            return '#FB923C'; // Orange
        case 'moderately severe':
            return '#F472B6'; // Pink
        case 'severe':
            return '#EF4444'; // Red
        default:
            return '#6B7280'; // Gray
    }
}
