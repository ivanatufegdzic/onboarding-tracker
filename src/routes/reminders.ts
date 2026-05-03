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

// POST test SendGrid transporter connection (for debugging)
router.post('/test-gmail', async (req: Request, res: Response) => {
  try {
    console.log(`\n🔬 Testing SendGrid connection...`);
    console.log(`   API Key: ${process.env.SENDGRID_API_KEY ? '✓ set' : '✗ not set'}`);

    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });

    console.log(`Verifying transporter...`);
    await transporter.verify();
    console.log(`✓ SendGrid transporter verified`);

    res.json({ success: true, message: 'SendGrid connection verified' });
  } catch (error: any) {
    console.error(`✗ SendGrid test failed:`, {
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
