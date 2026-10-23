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

import documentRoutes from './routes/documents';
import drawingRoutes from './routes/drawings';
import contentAssetRoutes from './routes/contentAssets';
import contentPreferenceRoutes from './routes/contentPreferences';
import {contentAuthenticate,contentParserError} from './routes/contentHttp';
const app = express();

app.use(cors());
const contentPaths=['/api/v1/documents','/api/v1/drawings','/api/v1/content-assets','/api/v1/content-preferences'];
app.use(contentPaths,contentAuthenticate);
app.use('/api/v1/documents',express.json({limit:2*1024*1024+64*1024}));
app.use('/api/v1/drawings',express.json({limit:10*1024*1024+64*1024}));
app.use(['/api/v1/content-assets','/api/v1/content-preferences'],express.json());
app.use(contentPaths,contentParserError);
app.use('/api/v1/ai/task-breakdown',express.json({limit:1024*1024}),contentParserError);
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

app.use('/api/v1/documents',documentRoutes);
app.use('/api/v1/drawings',drawingRoutes);
app.use('/api/v1/content-assets',contentAssetRoutes);
app.use('/api/v1/content-preferences',contentPreferenceRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
