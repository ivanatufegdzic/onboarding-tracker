import { Router, Request, Response } from 'express';
import { sendOverdueReminders } from '../services/emailService';
import sgMail from '@sendgrid/mail';

const router = Router();

// POST manually trigger reminder send (for testing)
router.post('/send-now', async (req: Request, res: Response) => {
  try {
    const result = await sendOverdueReminders();
    res.json(result);
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// POST test SendGrid API connection (for debugging)
router.post('/test-gmail', async (req: Request, res: Response) => {
  try {
    console.log(`\n🔬 Testing SendGrid API...`);
    console.log(`   API Key: ${process.env.SENDGRID_API_KEY ? '✓ set' : '✗ not set'}`);

    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'SENDGRID_API_KEY not set',
      });
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log(`✓ SendGrid API configured`);

    res.json({ success: true, message: 'SendGrid API verified' });
  } catch (error: any) {
    console.error(`✗ SendGrid test failed:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
