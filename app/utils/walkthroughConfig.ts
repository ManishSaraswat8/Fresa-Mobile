import {WalkthroughStep} from '@/app/component/Walkthrough';

// Storage keys
export const WALKTHROUGH_KEYS = {
    CREATE_TASK: 'walkthrough_create_task',
    TASKS_SCREEN: 'walkthrough_tasks_screen',
} as const;

// Walkthrough steps for Tasks Screen (starting point)
export const tasksScreenWalkthrough: WalkthroughStep[] = [
    {
        id: 'add-button',
        title: 'Create Your First Task',
        description: 'Tap the + button to start creating a new task. You can create a task from scratch or choose from templates.',
        position: 'top',
    },
    {
        id: 'filters',
        title: 'Filter Your Tasks',
        description: 'Use these filters to view tasks by type: Mine (your tasks), Clinic (assigned by clinic), or Repeat (recurring tasks).',
        position: 'bottom',
    },
    {
        id: 'view-mode',
        title: 'Switch Views',
        description: 'Toggle between Weekly and Daily views to see your tasks in different formats.',
        position: 'bottom',
    },
];

// Walkthrough steps for Create Task Form
export const createTaskWalkthrough: WalkthroughStep[] = [
    {
        id: 'label',
        title: 'Step 1: Select Area of Life',
        description: 'Tap here to select a label (Area of Life). This helps categorize your task. Choose from Partner, Family, Career, Fitness, Relaxation, or Friends.',
        position: 'bottom',
    },
    {
        id: 'task-name',
        title: 'Step 2: Name Your Task',
        description: 'Enter a clear name for your task. This makes it easy to identify later.',
        position: 'bottom',
    },
    {
        id: 'goals',
        title: 'Step 3: Define Goals',
        description: 'Describe what you want to achieve with this task. Be specific about your objectives.',
        position: 'bottom',
    },
    {
        id: 'challenges',
        title: 'Step 4: Identify Challenges',
        description: 'If you anticipate any challenges, write them here. This helps you prepare.',
        position: 'bottom',
    },
    {
        id: 'mitigations',
        title: 'Step 5: Plan Mitigations',
        description: 'If you added challenges, describe how you\'ll overcome them. This is required when challenges are present.',
        position: 'bottom',
    },
    {
        id: 'start-date-time',
        title: 'Step 6: Set Start Date & Time',
        description: 'Tap here to set when your task begins. Both date and time are required.',
        position: 'bottom',
    },
    {
        id: 'end-date-time',
        title: 'Step 7: Set End Date & Time',
        description: 'Tap here to set when your task ends. This helps you plan your schedule.',
        position: 'bottom',
    },
    {
        id: 'save-button',
        title: 'Step 8: Save Your Task',
        description: 'Once you\'ve filled in the required fields, tap "Save task" to create it. You can always edit it later!',
        position: 'top',
    },
];
