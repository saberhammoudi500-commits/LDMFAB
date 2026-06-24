import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config, isProd } from './config';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { rolesRouter } from './routes/roles';
import { ordresRouter } from './routes/ordres';
import { signaturesRouter } from './routes/signatures';
import { auditRouter } from './routes/audit';
import { dashboardRouter } from './routes/dashboard';
import { importExportRouter } from './routes/importExport';
import { metaRouter } from './routes/meta';
import { errorHandler } from './middleware/error';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
if (!isProd) app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
if (!isProd) app.use(morgan('dev'));

// Routes API
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ldmfab-backend', time: new Date().toISOString() });
});
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/ordres', ordresRouter);
app.use('/api/signatures', signaturesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/realisations', importExportRouter);
app.use('/api/meta', metaRouter);

// Servir le frontend en production
if (isProd) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`[ldmfab] Serveur demarre sur le port ${PORT}`);
});

export default app;
