import { describe, it, expect } from 'vitest';
import { computeRendementTotal, isRendementHorsSeuil } from '../utils/yield';
import { parseFrDate, parseFrNumber, formatFrDate } from '../utils/dates';

describe('computeRendementTotal', () => {
  it('calcule le rendement en pourcentage', () => {
    expect(computeRendementTotal(117.14, 119.988)).toBeCloseTo(97.63, 1);
  });
  it('retourne null si quantite theorique nulle ou absente', () => {
    expect(computeRendementTotal(100, 0)).toBeNull();
    expect(computeRendementTotal(100, null)).toBeNull();
    expect(computeRendementTotal(null, 120)).toBeNull();
  });
});

describe('isRendementHorsSeuil', () => {
  it('detecte les rendements sous le seuil', () => {
    expect(isRendementHorsSeuil(90)).toBe(true);
    expect(isRendementHorsSeuil(98)).toBe(false);
    expect(isRendementHorsSeuil(null)).toBe(false);
  });
});

describe('parseFrNumber', () => {
  it('gere les espaces de milliers et la virgule decimale', () => {
    expect(parseFrNumber(' 195 484 ')).toBe(195484);
    expect(parseFrNumber('117,14')).toBeCloseTo(117.14);
    expect(parseFrNumber('99,64%')).toBeCloseTo(99.64);
    expect(parseFrNumber('NA')).toBeNull();
    expect(parseFrNumber('')).toBeNull();
  });
});

describe('parseFrDate', () => {
  it('parse le format JJ/MM/AAAA', () => {
    const d = parseFrDate('04/04/2022');
    expect(d?.getUTCFullYear()).toBe(2022);
    expect(d?.getUTCMonth()).toBe(3);
    expect(d?.getUTCDate()).toBe(4);
  });
  it('retourne null pour NA et vide', () => {
    expect(parseFrDate('NA')).toBeNull();
    expect(parseFrDate('')).toBeNull();
  });
  it('formate en JJ/MM/AAAA', () => {
    expect(formatFrDate(parseFrDate('04/04/2022'))).toBe('04/04/2022');
  });
});
