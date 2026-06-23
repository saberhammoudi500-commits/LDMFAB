import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
import { notFound, errorHandler } from './middleware/error';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
if (!isProd) app.use(morgan('dev'));

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
app.use('/api/realisations', importExportRouter); // /import, /export
app.use('/api/meta', metaRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[ldmfab] API demarree sur http://localhost:${config.port} (${config.nodeEnv})`);
});
