import 'dotenv/config';
import { connectDB } from '../config/db';
import { createNotification } from '../services/notification.service';
import { User } from '../models/User';
import logger from '../utils/logger';

(async () => {
  await connectDB();
  const user = await User.findOne({ role: 'superadmin' });
  if (!user) { logger.error('No superadmin found'); process.exit(1); }

  await createNotification(user._id.toString(), 'ticket_created', {
    label: 'Test Ticket',
    totalLegs: 5,
  });
  await createNotification(user._id.toString(), 'prediction_hit', {
    market: 'goalsOverUnder',
    selection: 'OVER 2.5',
  });
  await createNotification(user._id.toString(), 'ticket_won', {
    label: 'Weekend Banker',
    legsWon: 5,
    totalLegs: 5,
  });

  logger.info('Test notifications created');
  process.exit(0);
})();
