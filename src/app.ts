import cors from 'cors';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';

import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import fixtureRoutes from './routes/fixture.routes';
import healthRoutes from './routes/health.routes';
import notificationRoutes from './routes/notification.routes';
import predictionRoutes from './routes/prediction.routes';
import stripeRoutes from './routes/stripe.routes';
import ticketRoutes from './routes/ticket.routes';
import userRoutes from './routes/user.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

// Trust the first proxy hop (Back4App's reverse proxy) so that
// req.ip and the X-Forwarded-For header are handled correctly by
// express-rate-limit and other middleware that key off client IP.
app.set('trust proxy', 1);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    data: {},
    message:
      'Too Many Requests — rate limit exceeded, please slow down and try again',
    error:
      'You have exceeded the maximum number of authentication attempts. Wait 15 minutes before trying again.',
  },
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fixtures', fixtureRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/notifications', notificationRoutes); // NEW

// 404 handler — must be after all routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    data: {},
    message: 'Not Found — the requested resource could not be found',
    error: `No route found for ${req.method} ${req.originalUrl}. Check the API documentation for valid endpoints.`,
  });
});

app.use(errorHandler);

export default app;
