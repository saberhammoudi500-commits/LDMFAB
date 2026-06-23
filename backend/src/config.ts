import dotenv from 'dotenv';

dotenv.config();

function int(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: int('PORT', 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '8h',
  },

  security: {
    passwordMinLength: int('PASSWORD_MIN_LENGTH', 10),
    maxLoginAttempts: int('MAX_LOGIN_ATTEMPTS', 5),
    lockoutMinutes: int('LOCKOUT_MINUTES', 15),
  },

  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@ldmfab.local',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@12345',
    matricule: process.env.ADMIN_MATRICULE ?? 'ADM-0001',
  },
};

export const isProd = config.nodeEnv === 'production';
