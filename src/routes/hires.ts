import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { saveData, findHireAnywhere } from '../services/dataStore';
import { IndividualHire, HireTask } from '../types';

const router = Router();

// GET all individual hires
router.get('/', (req: any, res: Response) => {
  try {
    res.json({ hires: req.appData.individualHires });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hires' });
  }
});

// POST create individual hire
router.post('/', (req: any, res: Response) => {
  try {
    const { name, startDate } = req.body;

    if (!name || !startDate) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: name, startDate' });
    }

    const newHire: IndividualHire = {
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

    req.appData.individualHires.push(newHire);
    saveData(req.appData);

    res.json({ hire: newHire });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hire' });
  }
});

// GET hire by id (searches both individual and cohort hires)
router.get('/:hireId', (req: any, res: Response) => {
  try {
    const result = findHireAnywhere(req.params.hireId, req.appData);

    if (!result) {
      return res.status(404).json({ error: 'Hire not found' });
    }

    res.json({ hire: result.hire, cohortId: result.cohortId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hire' });
  }
});

// DELETE hire (individual only)
router.delete('/:hireId', (req: any, res: Response) => {
  try {
    const hireIndex = req.appData.individualHires.findIndex(
      (h: IndividualHire) => h.id === req.params.hireId
    );

    if (hireIndex === -1) {
      return res.status(404).json({ error: 'Individual hire not found' });
    }

    req.appData.individualHires.splice(hireIndex, 1);
    saveData(req.appData);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hire' });
  }
});

// PATCH task toggle (works for both individual and cohort hires)
router.patch('/:hireId/tasks/:taskId', (req: any, res: Response) => {
  try {
    const { completed } = req.body;

    const result = findHireAnywhere(req.params.hireId, req.appData);

    if (!result) {
      return res.status(404).json({ error: 'Hire not found' });
    }

    const task = result.hire.tasks.find((t: HireTask) => t.taskId === req.params.taskId);

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
});

export default router;
