import { Router, Request, Response } from 'express';
import { calculateDueDate, isOverdue, getDeadlineRule } from '../services/dataStore';
import { DashboardStats, OwnerStats, Cohort, IndividualHire } from '../types';

const router = Router();

router.get('/', (req: any, res: Response) => {
  try {
    const owners = req.appData.owners;
    const rules = req.appData.deadlineRules;
    const globalTasks = req.appData.globalTasks;

    const stats: DashboardStats = {
      totalTasks: 0,
      completed: 0,
      remaining: 0,
      overdue: 0,
      byOwner: [],
    };

    const ownerStatsMap: Map<string, OwnerStats> = new Map();

    // Initialize owner stats
    owners.forEach((owner: any) => {
      ownerStatsMap.set(owner.id, {
        ownerId: owner.id,
        ownerName: owner.name,
        total: 0,
        completed: 0,
        overdue: 0,
      });
    });

    // Process all hires (cohort + individual)
    const allHires: Array<any> = [];

    // Add cohort hires
    req.appData.cohorts.forEach((cohort: Cohort) => {
      cohort.hires.forEach((hire: any) => {
        allHires.push({ ...hire, startDate: hire.startDate });
      });
    });

    // Add individual hires
    req.appData.individualHires.forEach((hire: IndividualHire) => {
      allHires.push(hire);
    });

    // Collect unique task IDs per owner
    const uniqueTasksByOwner: Map<string, Set<string>> = new Map();

    allHires.forEach((hire: any) => {
      hire.tasks.forEach((hireTask: any) => {
        const globalTask = globalTasks.find((t: any) => t.id === hireTask.taskId);
        if (!globalTask || !globalTask.active) return;

        const ownerId = globalTask.ownerId;
        if (!uniqueTasksByOwner.has(ownerId)) {
          uniqueTasksByOwner.set(ownerId, new Set());
        }

        uniqueTasksByOwner.get(ownerId)!.add(globalTask.id);
      });
    });

    // Count unique tasks and completion status
    uniqueTasksByOwner.forEach((uniqueTaskIds, ownerId) => {
      const owner = ownerStatsMap.get(ownerId);
      if (!owner) return;

      owner.total = uniqueTaskIds.size;
      stats.totalTasks += uniqueTaskIds.size;

      // Count completion for each unique task
      uniqueTaskIds.forEach((taskId) => {
        const globalTask = globalTasks.find((t: any) => t.id === taskId);

        // Check if ANY hire completed this task
        const isCompleted = allHires.some((hire: any) => {
          const hireTask = hire.tasks.find((t: any) => t.taskId === taskId);
          return hireTask && hireTask.completed;
        });

        if (isCompleted) {
          owner.completed++;
          stats.completed++;
        } else {
          stats.remaining++;

          // Check if ANY hire has this task overdue
          const rule = getDeadlineRule(globalTask.phase, globalTask.ownerId, rules);
          if (rule) {
            const isTaskOverdue = allHires.some((hire: any) => {
              const dueDate = calculateDueDate(hire.startDate, rule.daysFromStart);
              return isOverdue(dueDate);
            });

            if (isTaskOverdue) {
              owner.overdue++;
              stats.overdue++;
            }
          }
        }
      });
    });

    stats.byOwner = Array.from(ownerStatsMap.values());

    res.json(stats);
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

export default router;
