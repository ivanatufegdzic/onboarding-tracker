// Email template for overdue task reminders
// To customize email copy, edit the functions below
// Placeholder variables: {{owner_name}}, {{task_title}}, {{hire_name}}, {{cohort_name}}, {{days_overdue}}, {{start_date}}

export interface OverdueTask {
  taskTitle: string;
  hireName: string;
  cohortName: string | null;
  daysOverdue: number;
  startDate: string | null;
}

export function getEmailSubject(ownerName: string): string {
  return `[GreenerField] ${ownerName} — ${new Date().toLocaleDateString()} Overdue Tasks`;
}

export function renderTaskEmailBody(
  ownerName: string,
  tasks: OverdueTask[]
): string {
  if (tasks.length === 0) {
    return '';
  }

  const tasksByHire = new Map<string, OverdueTask[]>();

  tasks.forEach((task) => {
    const key = task.hireName;
    if (!tasksByHire.has(key)) {
      tasksByHire.set(key, []);
    }
    tasksByHire.get(key)!.push(task);
  });

  let html = `
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2D6A4F;">Overdue Tasks — ${ownerName}</h2>

      <p>Hi ${ownerName},</p>

      <p>The following tasks are overdue and need your attention:</p>

      <div style="margin-top: 30px;">
  `;

  tasksByHire.forEach((hireTasks, hireName) => {
    const firstTask = hireTasks[0];
    const isCohort = firstTask.cohortName !== null && firstTask.cohortName === hireName;
    const displayName = isCohort ? `${hireName} (Cohort)` : hireName;

    let metaInfo = '';
    if (!isCohort && firstTask.startDate) {
      metaInfo = `
          <p style="margin: 5px 0; font-size: 0.9em; color: #666;">
            Start date: ${firstTask.startDate} | Days overdue: ${firstTask.daysOverdue}
          </p>
      `;
    }

    html += `
        <div style="margin-bottom: 25px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #DC2626;">
          <h4 style="margin-top: 0; color: #1a1a1a;">${displayName}</h4>
          ${metaInfo}
          <ul style="margin: 10px 0; padding-left: 20px;">
    `;

    hireTasks.forEach((task) => {
      html += `
            <li style="margin: 5px 0;">${task.taskTitle}</li>
      `;
    });

    html += `
          </ul>
        </div>
    `;
  });

  html += `
      </div>

      <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
        Please update task completion in the <a href="http://localhost:3000" style="color: #2D6A4F;">Onboarding Tracker</a> when you complete these items.
      </p>

      <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 0.85em;">
        This is an automated reminder from GreenerField Onboarding Tracker. Do not reply to this email.
      </p>
    </div>
  </body>
</html>
  `;

  return html;
}
