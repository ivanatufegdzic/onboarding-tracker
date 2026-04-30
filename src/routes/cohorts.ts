import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { saveData } from '../services/dataStore';
import { Cohort, CohortHire, HireTask } from '../types';

const router = Router();

// GET all cohorts
router.get('/', (req: any, res: Response) => {
  try {
    res.json({ cohorts: req.appData.cohorts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cohorts' });
  }
});

// POST create cohort
router.post('/', (req: any, res: Response) => {
  try {
    const { name, startDate } = req.body;

    if (!name || !startDate) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: name, startDate' });
    }

    const newCohort: Cohort = {
      id: uuidv4(),
      name,
      startDate,
      hires: [],
    };

    req.appData.cohorts.push(newCohort);
    saveData(req.appData);

    res.json({ cohort: newCohort });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create cohort' });
  }
});

// GET cohort by id
router.get('/:cohortId', (req: any, res: Response) => {
  try {
    const cohort = req.appData.cohorts.find(
      (c: Cohort) => c.id === req.params.cohortId
    );

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    res.json({ cohort });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cohort' });
  }
});

// DELETE cohort
router.delete('/:cohortId', (req: any, res: Response) => {
  try {
    const cohortIndex = req.appData.cohorts.findIndex(
      (c: Cohort) => c.id === req.params.cohortId
    );

    if (cohortIndex === -1) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    req.appData.cohorts.splice(cohortIndex, 1);
    saveData(req.appData);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete cohort' });
  }
});

// POST hire to cohort
router.post('/:cohortId/hires', (req: any, res: Response) => {
  try {
    const { name, startDate } = req.body;

    if (!name || !startDate) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: name, startDate' });
    }

    const cohort = req.appData.cohorts.find(
      (c: Cohort) => c.id === req.params.cohortId
    );

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    const newHire: CohortHire = {
      id: uuidv4(),
      name,
      startDate,
      tasks: [],
    };

    // Snapshot active tasks
    const activeTasks = req.appData.globalTasks.filter((t: any) => t.active);
    newHire.tasks = activeTasks.map((t: any) => ({
      taskId: t.id,
      completed: false,
      completedAt: null,
    }));

    cohort.hires.push(newHire);
    saveData(req.appData);

    res.json({ hire: newHire });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hire' });
  }
});

// DELETE hire from cohort
router.delete('/:cohortId/hires/:hireId', (req: any, res: Response) => {
  try {
    const cohort = req.appData.cohorts.find(
      (c: Cohort) => c.id === req.params.cohortId
    );

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    const hireIndex = cohort.hires.findIndex(
      (h: CohortHire) => h.id === req.params.hireId
    );

    if (hireIndex === -1) {
      return res.status(404).json({ error: 'Hire not found' });
    }

    cohort.hires.splice(hireIndex, 1);
    saveData(req.appData);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hire' });
  }
});

// PATCH task toggle in cohort hire
router.patch(
  '/:cohortId/hires/:hireId/tasks/:taskId',
  (req: any, res: Response) => {
    try {
      const { completed } = req.body;

      const cohort = req.appData.cohorts.find(
        (c: Cohort) => c.id === req.params.cohortId
      );

      if (!cohort) {
        return res.status(404).json({ error: 'Cohort not found' });
      }

      const hire = cohort.hires.find(
        (h: CohortHire) => h.id === req.params.hireId
      );

      if (!hire) {
        return res.status(404).json({ error: 'Hire not found' });
      }

      const task = hire.tasks.find((t: HireTask) => t.taskId === req.params.taskId);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      task.completed = completed;
      task.completedAt = completed ? new Date().toISOString() : null;

      saveData(req.appData);

      res.json({ task });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle task' });
    }
  }
);

export default router;
