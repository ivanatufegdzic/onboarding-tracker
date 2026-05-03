import nodemailer from 'nodemailer';
import { getEmailSubject, renderTaskEmailBody, OverdueTask } from '../emailTemplate';
import { calculateDueDate, isOverdue, getDeadlineRule, loadData } from './dataStore';
import { Cohort, IndividualHire, GlobalTask, Owner, DeadlineRule } from '../types';

// Create transporter for Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Verify transporter connection
async function verifyTransporter(transporter: any): Promise<boolean> {
  try {
    console.log(`🔐 Verifying Gmail transporter...`);
    console.log(`   Email: ${process.env.GMAIL_USER}`);
    await transporter.verify();
    console.log(`✓ Gmail transporter verified successfully`);
    return true;
  } catch (error: any) {
    console.error(`✗ Gmail transporter verification failed:`, {
      code: error.code,
      message: error.message,
      response: error.response,
      command: error.command,
    });
    return false;
  }
}

export async function sendOverdueReminders(): Promise<{ sent: number; recipients: string[] }> {
  try {
    const data = loadData();
    const globalTasks: GlobalTask[] = data.globalTasks;
    const owners: Owner[] = data.owners;
    const rules: DeadlineRule[] = data.deadlineRules;

    // Process all hires (cohort + individual)
    const allHires: Array<any & { cohortName?: string }> = [];

    // Add cohort hires with cohort name
    data.cohorts.forEach((cohort: Cohort) => {
      cohort.hires.forEach((hire: any) => {
        allHires.push({ ...hire, cohortName: cohort.name });
      });
    });

    // Add individual hires (no cohort name)
    data.individualHires.forEach((hire: IndividualHire) => {
      allHires.push({ ...hire, cohortName: null });
    });

    // Collect reminders by owner
    const remindersByOwner = new Map<string, OverdueTask[]>();

    // First, check which owner+phase combinations have been started (at least one task completed)
    const startedSections = new Set<string>();
    let completedTasksFound = 0;

    allHires.forEach((hire: any, hireIdx: number) => {
      hire.tasks.forEach((hireTask: any, taskIdx: number) => {
        const globalTask = globalTasks.find((t) => t.id === hireTask.taskId);
        if (!globalTask || !globalTask.active) return;

        if (hireTask.completed) {
          completedTasksFound++;
          const sectionKey = `${globalTask.phase}_${globalTask.ownerId}`;
          startedSections.add(sectionKey);
          console.log(`✓ Completed task found: ${globalTask.title} (${sectionKey})`);
        }
      });
    });

    console.log(`Total completed tasks: ${completedTasksFound}, Started sections: ${startedSections.size}`);

    // For each started section, get the next 2 incomplete tasks for that owner
    startedSections.forEach((sectionKey) => {
      const [phase, ownerId] = sectionKey.split('_');
      console.log(`\n🔍 Processing started section: ${sectionKey}`);

      // Get all incomplete global tasks for this owner in this phase, sorted by order
      const incompleteGlobalTasks = globalTasks
        .filter((t) => t.phase === phase && t.ownerId === ownerId && t.active)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      console.log(`  Found ${incompleteGlobalTasks.length} global tasks for ${ownerId} in ${phase}`);

      // Get the next 2 incomplete tasks
      const nextTwoTaskIds = new Set<string>();
      let count = 0;
      for (const globalTask of incompleteGlobalTasks) {
        if (count >= 2) break;

        // Check if this task is incomplete for any hire
        const hasIncomplete = allHires.some((hire: any) => {
          const hireTask = hire.tasks.find((t: any) => t.taskId === globalTask.id);
          return hireTask && !hireTask.completed;
        });

        if (hasIncomplete) {
          nextTwoTaskIds.add(globalTask.id);
          count++;
          console.log(`  ✓ Next task: ${globalTask.title}`);
        }
      }

      console.log(`  Total next 2 tasks: ${nextTwoTaskIds.size}`);

      // Add reminders for these tasks, one entry per hire (grouped by cohort)
      allHires.forEach((hire: any) => {
        hire.tasks.forEach((hireTask: any) => {
          if (hireTask.completed) return; // Skip completed tasks

          const globalTask = globalTasks.find((t) => t.id === hireTask.taskId);
          if (!globalTask || globalTask.phase !== phase || globalTask.ownerId !== ownerId) return;

          if (nextTwoTaskIds.has(globalTask.id)) {
            if (!remindersByOwner.has(ownerId)) {
              remindersByOwner.set(ownerId, []);
            }

            remindersByOwner.get(ownerId)!.push({
              taskTitle: globalTask.title,
              hireName: hire.name,
              cohortName: hire.cohortName || null,
              daysOverdue: 0,
              startDate: hire.startDate,
            });
          }
        });
      });
    });

    // Also include overdue tasks
    allHires.forEach((hire: any) => {
      hire.tasks.forEach((hireTask: any) => {
        const globalTask = globalTasks.find((t) => t.id === hireTask.taskId);
        if (!globalTask || !globalTask.active || hireTask.completed) return;

        const rule = getDeadlineRule(globalTask.phase, globalTask.ownerId, rules);
        if (!rule) {
          console.warn(`No rule found for ${globalTask.phase} - ${globalTask.ownerId}`);
          return;
        }

        const dueDate = calculateDueDate(hire.startDate, rule.daysFromStart);
        const isTaskOverdue = isOverdue(dueDate);

        console.log(
          `Task: ${globalTask.title}, Due: ${dueDate.toISOString()}, Overdue: ${isTaskOverdue}`
        );

        if (isTaskOverdue) {
          if (!remindersByOwner.has(globalTask.ownerId)) {
            remindersByOwner.set(globalTask.ownerId, []);
          }

          const daysOverdue = Math.floor(
            (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          const existing = remindersByOwner.get(globalTask.ownerId) || [];

          // Use cohort name if available (for deduplication), otherwise use hire name
          const dedupeKey = hire.cohortName || hire.name;
          const isDuplicate = existing.some(
            (t) => t.taskTitle === globalTask.title && t.hireName === dedupeKey
          );

          if (!isDuplicate) {
            existing.push({
              taskTitle: globalTask.title,
              hireName: dedupeKey,
              cohortName: hire.cohortName || null,
              daysOverdue,
              startDate: hire.startDate,
            });
          }
        }
      });
    });

    // Send emails
    const transporter = createTransporter();
    const sentRecipients: string[] = [];
    let sentCount = 0;

    // Verify transporter before sending any emails
    const isVerified = await verifyTransporter(transporter);
    if (!isVerified) {
      console.error(`Cannot send reminders: Gmail authentication failed`);
      console.error(`Environment check:`);
      console.error(`  GMAIL_USER: ${process.env.GMAIL_USER ? '✓ set' : '✗ not set'}`);
      console.error(`  GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '✓ set' : '✗ not set'}`);
      return { sent: 0, recipients: [] };
    }

    for (const [ownerId, tasks] of remindersByOwner.entries()) {
      const owner = owners.find((o) => o.id === ownerId);

      if (!owner) {
        console.warn(`Owner ${ownerId} not found`);
        continue;
      }

      if (!owner.email) {
        console.warn(`Owner ${owner.name} has no email configured, skipping`);
        continue;
      }

      // Remove duplicates
      const uniqueTasks = Array.from(
        new Map(tasks.map((t) => [`${t.taskTitle}_${t.hireName}`, t])).values()
      );

      console.log(`\n📧 Owner ${owner.name}: ${tasks.length} raw tasks, ${uniqueTasks.length} unique`);

      if (uniqueTasks.length === 0) {
        console.log(`  ⏭️  Skipping ${owner.name} - no unique tasks`);
        continue;
      }

      try {
        const subject = getEmailSubject(owner.name);
        const html = renderTaskEmailBody(owner.name, uniqueTasks);

        console.log(`  Sending email to ${owner.email}...`);
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: owner.email,
          subject,
          html,
        });

        sentRecipients.push(owner.email);
        sentCount++;
        console.log(`✓ Sent reminder to ${owner.name} (${owner.email}) — ${uniqueTasks.length} tasks`);
      } catch (error: any) {
        console.error(`✗ Failed to send email to ${owner.email}:`, {
          code: error.code,
          message: error.message,
          response: error.response,
          command: error.command,
        });
      }
    }

    return { sent: sentCount, recipients: sentRecipients };
  } catch (error) {
    console.error('Error in sendOverdueReminders:', error);
    return { sent: 0, recipients: [] };
  }
}
