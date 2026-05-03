import 'dotenv/config';
import * as net from 'net';
import express, { Express, Request, Response } from 'express';
import path from 'path';
import { loadData, saveData, seedIfEmpty } from './services/dataStore';
import { startScheduler } from './scheduler';

import cohortsRouter from './routes/cohorts';
import hiresRouter from './routes/hires';
import settingsRouter from './routes/settings';
import remindersRouter from './routes/reminders';
import statsRouter from './routes/stats';

// --- Gmail SMTP connectivity diagnostic ---
console.log('🔍 Testing Gmail SMTP connectivity...');
const _smtpSocket = new net.Socket();
_smtpSocket.setTimeout(10000);

_smtpSocket.on('connect', () => {
  console.log('✓ SUCCESS: Connected to smtp.gmail.com:465');
  _smtpSocket.destroy();
});

_smtpSocket.on('timeout', () => {
  console.log('✗ TIMEOUT: Cannot reach smtp.gmail.com:465 (connection timed out)');
  _smtpSocket.destroy();
});

_smtpSocket.on('error', (err: Error) => {
  console.log('✗ ERROR: Cannot reach smtp.gmail.com:465 -', err.message);
});

_smtpSocket.connect(465, 'smtp.gmail.com');
// --- End diagnostic ---

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize data on startup
let appData = loadData();
appData = seedIfEmpty(appData);
saveData(appData);

// Pass data to routes via middleware
app.use((req: any, res: any, next) => {
  req.appData = appData;
  next();
});

// Routes
app.use('/api/cohorts', cohortsRouter);
app.use('/api/hires', hiresRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/stats', statsRouter);

// Fallback to index.html for SPA-like behavior
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ Onboarding tracker running at http://localhost:${PORT}`);
  console.log(`✓ Data loaded from data.json`);
  startScheduler();
});
