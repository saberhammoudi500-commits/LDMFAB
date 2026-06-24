import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, isProd } from './config';
import { prisma } from './prisma';
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
import { SYSTEM_ROLES } from './permissions';
import { hashPassword } from './utils/auth';
import bcrypt from 'bcryptjs';

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requetes sans origine (Vercel, mobile) et l'origine configuree
    if (!origin || origin === config.corsOrigin) return callback(null, true);
    callback(null, true); // permissif en attendant la config finale
  },
  credentials: true,
}));
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
app.use('/api/realisations', importExportRouter);
app.use('/api/meta', metaRouter);

app.use(notFound);
app.use(errorHandler);

// Auto-initialisation de la base de donnees au premier demarrage
async function autoInit() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) return; // deja initialise

    console.log('[ldmfab] Premiere initialisation de la base de donnees...');

    // Creer les roles systeme
    const roleByName = new Map<string, string>();
    for (const r of SYSTEM_ROLES) {
      const role = await prisma.role.upsert({
        where: { name: r.name },
        update: { permissions: JSON.stringify(r.permissions), isSystem: true },
        create: { name: r.name, description: r.description, permissions: JSON.stringify(r.permissions), isSystem: true },
      });
      roleByName.set(r.name, role.id);
    }

    // Creer le compte admin
    const adminRoleId = roleByName.get('Administrateur')!;
    const admin = await prisma.user.create({
      data: {
        matricule: config.admin.matricule,
        email: config.admin.email.toLowerCase(),
        firstName: 'Admin',
        lastName: 'Systeme',
        service: 'Direction',
        passwordHash: await hashPassword(config.admin.password),
        mustChangePassword: true,
        roles: { create: [{ roleId: adminRoleId }] },
      },
    });

    // Charger les donnees d'exemple
    const samples = [
      { codeProduit: 'PFMEB02', designation: 'ZINC+Vitamine C MEDIBIO+ 10 mg+250 mg', numeroLot: '14158', cndt: 'LIGNE OTC', quantiteKg: 117.14, quantiteTheoriqueKg: 119.988, rendementTotal: 97.63, aql: 'CONFORME', workflowStatus: 'CLOTURE', validiteOF: 'OF Cloture' },
      { codeProduit: 'PFMEB16', designation: 'Vitamine C MEDIBIO+ 500 mg', numeroLot: '14169', cndt: 'LIGNE OTC', quantiteKg: 118.12, quantiteTheoriqueKg: 119.988, rendementTotal: 98.44, aql: 'CONFORME', workflowStatus: 'CLOTURE', validiteOF: 'OF Cloture' },
      { codeProduit: 'PFMEB16', designation: 'Vitamine C MEDIBIO+ 500 mg', numeroLot: '14170', cndt: 'LIGNE OTC', quantiteKg: 117.63, quantiteTheoriqueKg: 119.988, rendementTotal: 98.03, aql: 'CONFORME', workflowStatus: 'CLOTURE', validiteOF: 'OF Cloture' },
      { codeProduit: 'PFMEB16', designation: 'Vitamine C MEDIBIO+ 500 mg', numeroLot: '14171', cndt: 'LIGNE OTC', quantiteKg: 118.74, quantiteTheoriqueKg: 119.988, rendementTotal: 98.96, aql: 'CONFORME', workflowStatus: 'CLOTURE', validiteOF: 'OF Cloture' },
      { codeProduit: 'PFMEB16', designation: 'Vitamine C MEDIBIO+ 500 mg', numeroLot: '14172', cndt: 'LIGNE OTC', quantiteKg: 118.76, quantiteTheoriqueKg: 119.988, rendementTotal: 98.98, aql: 'CONFORME', workflowStatus: 'CLOTURE', validiteOF: 'OF Cloture' },
    ];
    for (const s of samples) {
      await prisma.ordreFabrication.create({ data: { ...s, createdById: admin.id } });
    }

    console.log('[ldmfab] Base initialisee : admin + roles + 5 ordres crees.');
  } catch (err) {
    console.error('[ldmfab] Erreur auto-init (ignoree) :', err);
  }
}

// Demarrage
const PORT = config.port;
app.listen(PORT, async () => {
  console.log(`[ldmfab] API demarree sur http://localhost:${PORT} (${config.nodeEnv})`);
  await autoInit();
});

// Export pour Vercel (serverless)
export default app;
