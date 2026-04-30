import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  AppData,
  Owner,
  DeadlineRule,
  GlobalTask,
  CohortHire,
  IndividualHire,
  Cohort,
  HireTask,
} from '../types';

const DATA_FILE = path.join(process.cwd(), 'data.json');

const DEFAULT_OWNERS: Owner[] = [
  {
    id: 'hr',
    name: 'HR',
    email: 'ivana_tufegdzic@greenerfield.com',
  },
  {
    id: 'operations',
    name: 'Operations',
    email: 'katarina.matic@greenerfield.com',
  },
  {
    id: 'managers',
    name: 'Managers',
    email: null,
  },
];

const DEFAULT_DEADLINE_RULES: DeadlineRule[] = [
  { id: 'pre_hr', phase: 'pre_onboarding', ownerId: 'hr', daysFromStart: 0 },
  {
    id: 'pre_operations',
    phase: 'pre_onboarding',
    ownerId: 'operations',
    daysFromStart: 0,
  },
  {
    id: 'pre_managers',
    phase: 'pre_onboarding',
    ownerId: 'managers',
    daysFromStart: 0,
  },
  {
    id: 'onboarding_hr',
    phase: 'onboarding',
    ownerId: 'hr',
    daysFromStart: 14,
  },
  {
    id: 'onboarding_operations',
    phase: 'onboarding',
    ownerId: 'operations',
    daysFromStart: 7,
  },
  {
    id: 'onboarding_managers',
    phase: 'onboarding',
    ownerId: 'managers',
    daysFromStart: 14,
  },
];

const DEFAULT_TASKS: GlobalTask[] = [
  // Pre-Onboarding HR (1-10)
  {
    id: 'task_001',
    title:
      'Prepare onboarding documents (Total Compensation Overview, Employment contract, Employee Handbook, GF Culture Deck, PTO policy, Training plan)',
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 1,
  },
  {
    id: 'task_002',
    title: 'Acquire info for employment contracts via Google Form',
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 2,
  },
  {
    id: 'task_003',
    title: 'Prepare employment contracts and send to Kat for signing',
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 3,
  },
  {
    id: 'task_004',
    title: 'Inform bookkeeping agency about new hires',
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 4,
  },
  {
    id: 'task_005',
    title: 'Send welcome aboard email with onboarding docs and questionnaire',
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 5,
  },
  {
    id: 'task_006',
    title: 'Inform Kat she can proceed with her pre-onboarding tasks',
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 6,
  },
  {
    id: 'task_007',
    title: 'Inform team of new hire start',
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 7,
  },
  {
    id: 'task_008',
    title: 'Remind Andrew to send welcome message on Day 1',
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 8,
  },
  {
    id: 'task_009',
    title: "Send email to existing employees about new hires' first day",
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 9,
  },
  {
    id: 'task_010',
    title: 'Send reminder to Matt and Andrew to set up Week 1 meetings',
    phase: 'pre_onboarding',
    ownerId: 'hr',
    active: true,
    order: 10,
  },
  // Pre-Onboarding Operations (11-15)
  {
    id: 'task_011',
    title: 'Sign employment contracts and send to new hires',
    phase: 'pre_onboarding',
    ownerId: 'operations',
    active: true,
    order: 1,
  },
  {
    id: 'task_012',
    title: 'Send signed contracts to bookkeeping agency',
    phase: 'pre_onboarding',
    ownerId: 'operations',
    active: true,
    order: 2,
  },
  {
    id: 'task_013',
    title: 'Create GreenerField email accounts for new hires',
    phase: 'pre_onboarding',
    ownerId: 'operations',
    active: true,
    order: 3,
  },
  {
    id: 'task_014',
    title: 'Confirm new hires have set up email accounts and inform team',
    phase: 'pre_onboarding',
    ownerId: 'operations',
    active: true,
    order: 4,
  },
  {
    id: 'task_015',
    title:
      'Organize and send company welcome swag (GF mug, notepad, water bottle, powerbank, welcome message)',
    phase: 'pre_onboarding',
    ownerId: 'operations',
    active: true,
    order: 5,
  },
  // Onboarding Operations (16-23)
  {
    id: 'task_016',
    title:
      'Add new hires to GF WhatsApp groups (Perfect Chaos, Pulling team, Serbian team, GF company wide, GF social chat)',
    phase: 'onboarding',
    ownerId: 'operations',
    active: true,
    order: 1,
  },
  {
    id: 'task_017',
    title: 'Reach out to new hires regarding equipment needed',
    phase: 'onboarding',
    ownerId: 'operations',
    active: true,
    order: 2,
  },
  {
    id: 'task_018',
    title: 'Add new hires to Kumospace',
    phase: 'onboarding',
    ownerId: 'operations',
    active: true,
    order: 3,
  },
  {
    id: 'task_019',
    title: 'Provide access to Google Drive and GF Training Folder',
    phase: 'onboarding',
    ownerId: 'operations',
    active: true,
    order: 4,
  },
  {
    id: 'task_020',
    title:
      'Add new hires to SOP folder (Daily Sales, TicketMaster, NonTM account, Credit card documents)',
    phase: 'onboarding',
    ownerId: 'operations',
    active: true,
    order: 5,
  },
  {
    id: 'task_021',
    title:
      'Create required accounts (Insomniac, Loom, DTI logins, 1Ticket, Textchest, Anydesk access)',
    phase: 'onboarding',
    ownerId: 'operations',
    active: true,
    order: 6,
  },
  {
    id: 'task_022',
    title: 'Assign AXS, TM, and MLB accounts',
    phase: 'onboarding',
    ownerId: 'operations',
    active: true,
    order: 7,
  },
  {
    id: 'task_023',
    title:
      'Mail company welcome swag to new hires (mug, notepad, water bottle, powerbank, welcome message)',
    phase: 'onboarding',
    ownerId: 'operations',
    active: true,
    order: 8,
  },
  // Onboarding HR (24-36)
  {
    id: 'task_024',
    title: 'Set up HR WhatsApp group with new hires',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 1,
  },
  {
    id: 'task_025',
    title: 'Set up onboarding WhatsApp group for entire Serbian team',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 2,
  },
  {
    id: 'task_026',
    title: 'Set up accounts in Staff Leave app',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 3,
  },
  {
    id: 'task_027',
    title: 'Set up accounts in 15Five and provide instructions',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 4,
  },
  {
    id: 'task_028',
    title: 'Organize 15Five platform training and follow up',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 5,
  },
  {
    id: 'task_029',
    title: 'Set up Generali health insurance for new hires',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 6,
  },
  {
    id: 'task_030',
    title: 'Send health insurance email and proceed with setup',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 7,
  },
  {
    id: 'task_031',
    title: 'Add new hires to payroll',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 8,
  },
  {
    id: 'task_032',
    title: 'Instruct Social Media team to prepare welcome post using questionnaire info',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 9,
  },
  {
    id: 'task_033',
    title: 'Set up 1-on-1 with each new hire and create 1-on-1 challenge for the team',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 10,
  },
  {
    id: 'task_034',
    title: 'Get professional pictures taken for website and email signatures',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 11,
  },
  {
    id: 'task_035',
    title: 'Ask new staff to write website testimonial',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 12,
  },
  {
    id: 'task_036',
    title: 'Ask Maja to prepare email signatures and add new staff to website',
    phase: 'onboarding',
    ownerId: 'hr',
    active: true,
    order: 13,
  },
  // Onboarding Managers (37-39)
  {
    id: 'task_037',
    title: 'Schedule presentations/meetings with new hires per training plan',
    phase: 'onboarding',
    ownerId: 'managers',
    active: true,
    order: 1,
  },
  {
    id: 'task_038',
    title: 'Provide feedback and follow-up in onboarding WhatsApp group',
    phase: 'onboarding',
    ownerId: 'managers',
    active: true,
    order: 2,
  },
  {
    id: 'task_039',
    title: 'Set up regular weekly check-ins with new hires',
    phase: 'onboarding',
    ownerId: 'managers',
    active: true,
    order: 3,
  },
];

export function loadData(): AppData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading data.json:', error);
  }
  return {
    owners: [],
    deadlineRules: [],
    globalTasks: [],
    cohorts: [],
    individualHires: [],
  };
}

export function saveData(data: AppData): void {
  try {
    const tmpFile = DATA_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (error) {
    console.error('Error writing data.json:', error);
    throw error;
  }
}

export function seedIfEmpty(data: AppData): AppData {
  if (data.owners.length === 0) {
    data.owners = DEFAULT_OWNERS;
    data.deadlineRules = DEFAULT_DEADLINE_RULES;
    data.globalTasks = DEFAULT_TASKS;
    data.cohorts = [];
    data.individualHires = [];
    console.log('Seeded data.json with default owners, rules, and tasks');
  }
  return data;
}

export function getDeadlineRule(
  phase: string,
  ownerId: string,
  rules: DeadlineRule[]
): DeadlineRule | null {
  return rules.find((r) => r.phase === phase && r.ownerId === ownerId) || null;
}

export function calculateDueDate(
  startDate: string,
  daysFromStart: number
): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() + daysFromStart);
  return date;
}

export function isOverdue(dueDate: Date): boolean {
  return new Date() > dueDate;
}

export function findHireAnywhere(
  hireId: string,
  data: AppData
): {
  hire: CohortHire | IndividualHire;
  cohortId: string | null;
} | null {
  // Search individual hires
  const individual = data.individualHires.find((h) => h.id === hireId);
  if (individual) {
    return { hire: individual, cohortId: null };
  }

  // Search cohort hires
  for (const cohort of data.cohorts) {
    const cohortHire = cohort.hires.find((h) => h.id === hireId);
    if (cohortHire) {
      return { hire: cohortHire, cohortId: cohort.id };
    }
  }

  return null;
}

export function propagateNewTaskToAllHires(
  data: AppData,
  newTaskId: string
): void {
  const newTaskEntry: HireTask = {
    taskId: newTaskId,
    completed: false,
    completedAt: null,
  };

  // Add to all cohort hires
  for (const cohort of data.cohorts) {
    for (const hire of cohort.hires) {
      hire.tasks.push(newTaskEntry);
    }
  }

  // Add to all individual hires
  for (const hire of data.individualHires) {
    hire.tasks.push(newTaskEntry);
  }
}

export function getNextTaskOrder(phase: string, ownerId: string, tasks: GlobalTask[]): number {
  const tasksInGroup = tasks.filter((t) => t.phase === phase && t.ownerId === ownerId);
  if (tasksInGroup.length === 0) return 1;
  return Math.max(...tasksInGroup.map((t) => t.order)) + 1;
}
