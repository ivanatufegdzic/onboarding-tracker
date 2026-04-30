import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { saveData, propagateNewTaskToAllHires, getNextTaskOrder } from '../services/dataStore';
import { GlobalTask, Owner, DeadlineRule } from '../types';

const router = Router();

// ============ Tasks ============

// GET all tasks
router.get('/tasks', (req: any, res: Response) => {
  try {
    res.json({ tasks: req.appData.globalTasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST create task
router.post('/tasks', (req: any, res: Response) => {
  try {
    const { title, phase, ownerId } = req.body;

    if (!title || !phase || !ownerId) {
      return res.status(400).json({
        error: 'Missing required fields: title, phase, ownerId',
      });
    }

    const newTask: GlobalTask = {
      id: `task_${uuidv4().slice(0, 8)}`,
      title,
      phase,
      ownerId,
      active: true,
      order: getNextTaskOrder(phase, ownerId, req.appData.globalTasks),
    };

    req.appData.globalTasks.push(newTask);
    propagateNewTaskToAllHires(req.appData, newTask.id);
    saveData(req.appData);

    res.json({ task: newTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH update task
router.patch('/tasks/:taskId', (req: any, res: Response) => {
  try {
    const { title, active, order } = req.body;

    const task = req.appData.globalTasks.find((t: GlobalTask) => t.id === req.params.taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (title !== undefined) task.title = title;
    if (active !== undefined) task.active = active;
    if (order !== undefined) task.order = order;

    saveData(req.appData);

    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE task (hard delete)
router.delete('/tasks/:taskId', (req: any, res: Response) => {
  try {
    const taskIndex = req.appData.globalTasks.findIndex(
      (t: GlobalTask) => t.id === req.params.taskId
    );

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    req.appData.globalTasks.splice(taskIndex, 1);
    saveData(req.appData);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ============ Owners ============

// GET all owners
router.get('/owners', (req: any, res: Response) => {
  try {
    res.json({ owners: req.appData.owners });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch owners' });
  }
});

// POST create owner
router.post('/owners', (req: any, res: Response) => {
  try {
    const { name, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const newOwner: Owner = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      email: email || null,
    };

    // Check if owner with this id already exists
    if (req.appData.owners.find((o: Owner) => o.id === newOwner.id)) {
      return res.status(400).json({ error: 'Owner with this name already exists' });
    }

    req.appData.owners.push(newOwner);

    // Create default deadline rules for this owner
    const preRule: DeadlineRule = {
      id: `pre_${newOwner.id}`,
      phase: 'pre_onboarding',
      ownerId: newOwner.id,
      daysFromStart: 0,
    };

    const onboardingRule: DeadlineRule = {
      id: `onboarding_${newOwner.id}`,
      phase: 'onboarding',
      ownerId: newOwner.id,
      daysFromStart: 14,
    };

    req.appData.deadlineRules.push(preRule, onboardingRule);

    saveData(req.appData);

    res.json({ owner: newOwner });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create owner' });
  }
});

// PATCH update owner
router.patch('/owners/:ownerId', (req: any, res: Response) => {
  try {
    const { name, email } = req.body;

    const owner = req.appData.owners.find((o: Owner) => o.id === req.params.ownerId);

    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    if (name !== undefined) owner.name = name;
    if (email !== undefined) owner.email = email || null;

    saveData(req.appData);

    res.json({ owner });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update owner' });
  }
});

// DELETE owner
router.delete('/owners/:ownerId', (req: any, res: Response) => {
  try {
    const owner = req.appData.owners.find((o: Owner) => o.id === req.params.ownerId);

    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    // Check if any task is assigned to this owner
    if (req.appData.globalTasks.some((t: GlobalTask) => t.ownerId === req.params.ownerId)) {
      return res.status(409).json({ error: 'Owner has assigned tasks' });
    }

    const ownerIndex = req.appData.owners.findIndex(
      (o: Owner) => o.id === req.params.ownerId
    );
    req.appData.owners.splice(ownerIndex, 1);

    // Remove deadline rules for this owner
    req.appData.deadlineRules = req.appData.deadlineRules.filter(
      (r: DeadlineRule) => r.ownerId !== req.params.ownerId
    );

    saveData(req.appData);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete owner' });
  }
});

// ============ Deadline Rules ============

// GET all deadline rules
router.get('/deadline-rules', (req: any, res: Response) => {
  try {
    res.json({ rules: req.appData.deadlineRules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deadline rules' });
  }
});

// PATCH update deadline rule
router.patch('/deadline-rules/:ruleId', (req: any, res: Response) => {
  try {
    const { daysFromStart } = req.body;

    const rule = req.appData.deadlineRules.find(
      (r: DeadlineRule) => r.id === req.params.ruleId
    );

    if (!rule) {
      return res.status(404).json({ error: 'Deadline rule not found' });
    }

    if (daysFromStart !== undefined) {
      rule.daysFromStart = daysFromStart;
    }

    saveData(req.appData);

    res.json({ rule });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update deadline rule' });
  }
});

export default router;
