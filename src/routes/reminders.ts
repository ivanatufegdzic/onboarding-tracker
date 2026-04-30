import { Router, Request, Response } from 'express';
import { sendOverdueReminders } from '../services/emailService';
import nodemailer from 'nodemailer';

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

// POST test Gmail transporter connection (for debugging)
router.post('/test-gmail', async (req: Request, res: Response) => {
  try {
    console.log(`\n🔬 Testing Gmail connection...`);
    console.log(`   Email: ${process.env.GMAIL_USER}`);
    console.log(`   Password length: ${process.env.GMAIL_APP_PASSWORD?.length || 0}`);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    console.log(`Verifying transporter...`);
    await transporter.verify();
    console.log(`✓ Gmail transporter verified`);

    res.json({ success: true, message: 'Gmail connection verified' });
  } catch (error: any) {
    console.error(`✗ Gmail test failed:`, {
      code: error.code,
      message: error.message,
      response: error.response,
      command: error.command,
    });
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.response,
    });
  }
});

export default router;
