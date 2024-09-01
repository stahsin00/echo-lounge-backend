import cron from 'node-cron';
import { cleanupSessions } from './sessionService.js';


cron.schedule('* * * * *', cleanupSessions);  // TODO: currently running every minute