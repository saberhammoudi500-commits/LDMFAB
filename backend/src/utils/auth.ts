import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export interface AccessTokenPayload {
  sub: string; // user id
  matricule: string;
  email: string;
  name: string;
  permissions: string[];
  roles: string[];
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires,
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { sub: string };
}

export function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 8);
}

/**
 * Politique de mot de passe (21 CFR Part 11) :
 * longueur mini + majuscule + minuscule + chiffre + caractere special.
 */
export function validatePasswordPolicy(password: string): string[] {
  const errors: string[] = [];
  if (password.length < config.security.passwordMinLength) {
    errors.push(`Au moins ${config.security.passwordMinLength} caracteres.`);
  }
  if (!/[A-Z]/.test(password)) errors.push('Au moins une majuscule.');
  if (!/[a-z]/.test(password)) errors.push('Au moins une minuscule.');
  if (!/[0-9]/.test(password)) errors.push('Au moins un chiffre.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Au moins un caractere special.');
  return errors;
}
