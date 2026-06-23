import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SYSTEM_ROLES } from '../src/permissions';
import { config } from '../src/config';
import { parseFrDate, parseFrNumber } from '../src/utils/dates';
import { computeRendementTotal } from '../src/utils/yield';

const prisma = new PrismaClient();

// Donnees d'exemple issues du modele Excel fourni
const SAMPLE_ROWS = [
  ['31/01/2024', '', '', 'OF Cloture', 'LIGNE OTC', 'PFMEB02', 'ZINC+Vitamine C MEDIBIO+ 10 mg+250 mg', '14158', '04/04/2022', 'NA', '04/04/2022', '04/04/2022', 'NA', '117,14', '195484', '99,64', '98,00', '98,13', 'NA', 'NA', 'OUI', '07/04/2022', 'TOUATI LEILA', '17/04/2022', '', '', '119,988', '97,63', 'CONFORME', '04/06/2022', '2', 'PRODUIT EN STOCK'],
  ['29/10/2023', '', '', 'OF Cloture', 'LIGNE OTC', 'PFMEB16', 'Vitamine C MEDIBIO+ 500 mg', '14169', '11/04/2022', 'NA', '13/03/2023', '13/03/2023', 'NA', '118,12', '98306', '99,80', '98,63', '98,50', 'NA', 'NA', 'OUI', '12/04/2022', 'TOUATI LEILA', '15/04/2022', '', '', '119,988', '98,44', 'CONFORME', '26/01/2023', '2', 'PRODUIT EN STOCK'],
  ['29/10/2023', '', '', 'OF Cloture', 'LIGNE OTC', 'PFMEB16', 'Vitamine C MEDIBIO+ 500 mg', '14170', '11/04/2022', 'NA', '13/03/2023', '13/03/2023', 'NA', '117,63', '97948', '99,73', '98,28', '98,21', 'NA', 'NA', 'OUI', '13/04/2022', 'MEGUELLATI ABDELGHANI', '14/04/2022', '', '', '119,988', '98,03', 'CONFORME', '30/01/2023', '2', 'PRODUIT EN STOCK'],
  ['29/10/2023', '', '', 'OF Cloture', 'LIGNE OTC', 'PFMEB16', 'Vitamine C MEDIBIO+ 500 mg', '14171', '11/04/2022', 'NA', '13/03/2023', '13/03/2023', 'NA', '118,74', '99001', '99,85', '99,09', '99,14', 'NA', 'NA', 'OUI', '13/04/2022', 'MIHOUBI YASSER', '15/04/2022', '', '', '119,988', '98,96', 'CONFORME', '20/02/2023', '2', 'PRODUIT EN STOCK'],
  ['29/10/2023', '', '', 'OF Cloture', 'LIGNE OTC', 'PFMEB16', 'Vitamine C MEDIBIO+ 500 mg', '14172', '12/04/2022', 'NA', '13/03/2023', '13/03/2023', 'NA', '118,76', '99018', '99,98', '99,08', '99,13', 'NA', 'NA', 'OUI', '13/04/2022', 'MEGUELLATI ABDELGHANI', '15/04/2022', '', '', '119,988', '98,98', 'CONFORME', '06/02/2023', '2', 'PRODUIT EN STOCK'],
];

function rowToOf(row: string[]) {
  const [
    dateDeclarationSF, receptionOF, finValiditeOF, validiteOF, cndt, codeProduit, designation, numeroLot,
    dateFinPesee, dateFinGranulation, dateFinMelange, dateFinCompRemp, dateFinPelliculage,
    quantiteKg, quantiteFabriqueeCps, rendementKg1, rendementKg2, rendementCps1, rendementKg3, rendementCps2,
    statutLibere, dateFinFabrication, verificateurNom, dateEnvoi, dateReceptionRectif, dateEnvoiApresRectif,
    quantiteTheoriqueKg, rendementTotal, aql, dateFinCNDT, test3, test4,
  ] = row;

  const qKg = parseFrNumber(quantiteKg);
  const qTh = parseFrNumber(quantiteTheoriqueKg);

  return {
    dateDeclarationSF: parseFrDate(dateDeclarationSF),
    receptionOF: parseFrDate(receptionOF),
    finValiditeOF: parseFrDate(finValiditeOF),
    validiteOF: validiteOF || null,
    cndt: cndt || null,
    codeProduit,
    designation,
    numeroLot,
    dateFinPesee: parseFrDate(dateFinPesee),
    dateFinGranulation: parseFrDate(dateFinGranulation),
    dateFinMelange: parseFrDate(dateFinMelange),
    dateFinCompRemp: parseFrDate(dateFinCompRemp),
    dateFinPelliculage: parseFrDate(dateFinPelliculage),
    quantiteKg: qKg,
    quantiteFabriqueeCps: parseFrNumber(quantiteFabriqueeCps),
    quantiteTheoriqueKg: qTh,
    rendementKg1: parseFrNumber(rendementKg1),
    rendementKg2: parseFrNumber(rendementKg2),
    rendementCps1: parseFrNumber(rendementCps1),
    rendementKg3: parseFrNumber(rendementKg3),
    rendementCps2: parseFrNumber(rendementCps2),
    rendementTotal: parseFrNumber(rendementTotal) ?? computeRendementTotal(qKg, qTh),
    statutLibere: statutLibere || null,
    dateFinFabrication: parseFrDate(dateFinFabrication),
    verificateurNom: verificateurNom || null,
    dateEnvoi: parseFrDate(dateEnvoi),
    dateReceptionRectif: parseFrDate(dateReceptionRectif),
    dateEnvoiApresRectif: parseFrDate(dateEnvoiApresRectif),
    aql: aql || null,
    dateFinCNDT: parseFrDate(dateFinCNDT),
    test3: test3 || null,
    test4: test4 || null,
    workflowStatus: (validiteOF ?? '').toLowerCase().includes('clotur') ? 'CLOTURE' : 'CREATION',
  };
}

async function main() {
  console.log('Seed : roles systeme...');
  const roleByName = new Map<string, string>();
  for (const r of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, permissions: JSON.stringify(r.permissions), isSystem: true },
      create: { name: r.name, description: r.description, permissions: JSON.stringify(r.permissions), isSystem: true },
    });
    roleByName.set(r.name, role.id);
  }

  console.log('Seed : compte administrateur...');
  const adminRoleId = roleByName.get('Administrateur')!;
  const existing = await prisma.user.findUnique({ where: { email: config.admin.email.toLowerCase() } });
  let adminId: string;
  if (existing) {
    adminId = existing.id;
    console.log(`  -> admin existant: ${existing.email}`);
  } else {
    const admin = await prisma.user.create({
      data: {
        matricule: config.admin.matricule,
        email: config.admin.email.toLowerCase(),
        firstName: 'Admin',
        lastName: 'Systeme',
        service: 'Direction',
        passwordHash: await bcrypt.hash(config.admin.password, 12),
        mustChangePassword: true,
        roles: { create: [{ roleId: adminRoleId }] },
      },
    });
    adminId = admin.id;
    console.log(`  -> admin cree: ${admin.email} / mot de passe initial: ${config.admin.password}`);
  }

  console.log('Seed : ordres de fabrication (exemples)...');
  const count = await prisma.ordreFabrication.count();
  if (count === 0) {
    for (const row of SAMPLE_ROWS) {
      await prisma.ordreFabrication.create({ data: { ...rowToOf(row), createdById: adminId } });
    }
    console.log(`  -> ${SAMPLE_ROWS.length} ordres importes.`);
  } else {
    console.log(`  -> deja ${count} ordres en base, import ignore.`);
  }

  console.log('Seed termine.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
