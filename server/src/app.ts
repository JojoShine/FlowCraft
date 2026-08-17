import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { dateTransformMiddleware } from './lib/timezone';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import artifactRoutes from './routes/artifacts';
import artifactFileRoutes from './routes/artifactFiles';
import phaseRoutes from './routes/phases';
import templateRoutes from './routes/templates';
import reportRoutes from './routes/reports';
import userRoutes from './routes/users';
import searchRoutes from './routes/search';
import aiRoutes from './routes/ai';
import publicRoutes from './routes/public';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(dateTransformMiddleware);

app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/projects', authenticate, projectRoutes);
app.use('/api/v1/tasks', authenticate, taskRoutes);
app.use('/api/v1/artifacts', artifactFileRoutes);
app.use('/api/v1/artifacts', authenticate, artifactRoutes);
app.use('/api/v1/phases', authenticate, phaseRoutes);
app.use('/api/v1/templates', authenticate, templateRoutes);
app.use('/api/v1/reports', authenticate, reportRoutes);
app.use('/api/v1/users', authenticate, userRoutes);
app.use('/api/v1/search', authenticate, searchRoutes);
app.use('/api/v1/ai', authenticate, aiRoutes);
app.use('/api/v1/public', publicRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
