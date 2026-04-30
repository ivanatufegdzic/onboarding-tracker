export type Phase = 'pre_onboarding' | 'onboarding';

export interface Owner {
  id: string;
  name: string;
  email: string | null;
}

export interface DeadlineRule {
  id: string;
  phase: Phase;
  ownerId: string;
  daysFromStart: number;
}

export interface GlobalTask {
  id: string;
  title: string;
  phase: Phase;
  ownerId: string;
  active: boolean;
  order: number;
}

export interface HireTask {
  taskId: string;
  completed: boolean;
  completedAt: string | null;
}

export interface CohortHire {
  id: string;
  name: string;
  startDate: string;
  tasks: HireTask[];
}

export interface Cohort {
  id: string;
  name: string;
  startDate: string;
  hires: CohortHire[];
}

export interface IndividualHire {
  id: string;
  name: string;
  startDate: string;
  tasks: HireTask[];
}

export interface AppData {
  owners: Owner[];
  deadlineRules: DeadlineRule[];
  globalTasks: GlobalTask[];
  cohorts: Cohort[];
  individualHires: IndividualHire[];
}

export interface TaskWithStatus {
  taskId: string;
  title: string;
  phase: Phase;
  ownerId: string;
  ownerName: string;
  completed: boolean;
  completedAt: string | null;
  dueDate: string | null;
  overdue: boolean;
  active: boolean;
}

export interface OwnerStats {
  ownerId: string;
  ownerName: string;
  total: number;
  completed: number;
  overdue: number;
}

export interface DashboardStats {
  totalTasks: number;
  completed: number;
  remaining: number;
  overdue: number;
  byOwner: OwnerStats[];
}
