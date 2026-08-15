import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { dateTransformMiddleware } from './lib/timezone';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import artifactRoutes from './routes/artifacts';
import phaseRoutes from './routes/phases';
import templateRoutes from './routes/templates';
import reportRoutes from './routes/reports';
import userRoutes from './routes/users';
import searchRoutes from './routes/search';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(dateTransformMiddleware);

app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/artifacts', artifactRoutes);
app.use('/api/v1/phases', phaseRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/search', searchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
