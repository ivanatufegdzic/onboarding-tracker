import cron from 'node-cron';
import { sendOverdueReminders } from './services/emailService';

export function startScheduler(): void {
  // Schedule daily at 9:00 AM
  // Format: minute hour day month day-of-week
  const job = cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running scheduled reminder check at 9:00 AM');
    try {
      const result = await sendOverdueReminders();
      if (result.sent > 0) {
        console.log(`✓ Sent ${result.sent} reminder email(s)`);
      } else {
        console.log('✓ No overdue tasks to remind about');
      }
    } catch (error) {
      console.error('Error running scheduler:', error);
    }
  });

  console.log('✓ Scheduler started — daily reminder at 9:00 AM');
  return;
}
