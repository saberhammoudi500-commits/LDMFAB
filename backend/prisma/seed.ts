import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SYSTEM_ROLES } from '../src/permissions';
import { config } from '../src/config';

const prisma = new PrismaClient();

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

  console.log('Seed : referentiels de base...');

  // Formes galeniques
  const formes = [
    { code: 'CPS', nom: 'Comprime' },
    { code: 'GLE', nom: 'Gelule' },
    { code: 'CRM', nom: 'Creme' },
    { code: 'POM', nom: 'Pommade' },
    { code: 'TUB', nom: 'Tube' },
    { code: 'SUS', nom: 'Suspension' },
  ];
  const formeMap = new Map<string, string>();
  for (const f of formes) {
    const row = await prisma.formeGalenique.upsert({
      where: { code: f.code },
      update: { nom: f.nom },
      create: f,
    });
    formeMap.set(f.code, row.id);
  }

  // Donneurs d'ordre
  const donneurs = [
    { code: 'LDM', nom: 'Portfolio LDM' },
    { code: 'SERVIER', nom: 'Servier' },
    { code: 'GSK', nom: 'GSK' },
    { code: 'ABBOTT', nom: 'Abbott' },
    { code: 'PHARMETIC', nom: 'Pharmetic' },
    { code: 'JULPHAR', nom: 'JULPHAR' },
    { code: 'LDM_SF', nom: 'LDM Sante Familiale' },
    { code: 'GENERIQUE', nom: 'Generique' },
    { code: 'OTC', nom: 'OTC' },
  ];
  const donneurMap = new Map<string, string>();
  for (const d of donneurs) {
    const row = await prisma.donneurOrdre.upsert({
      where: { code: d.code },
      update: { nom: d.nom },
      create: { code: d.code, nom: d.nom },
    });
    donneurMap.set(d.code, row.id);
  }

  // Equipements fabrication
  const equipements = [
    { code: 'PESEE-1', nom: 'Balance Pesee 1', atelier: 'FABRICATION', type: 'PESEE' },
    { code: 'GRAN-1', nom: 'Granulateur 1', atelier: 'FABRICATION', type: 'GRANULATION' },
    { code: 'MEL-1', nom: 'Melangeur 1', atelier: 'FABRICATION', type: 'MELANGE' },
    { code: 'COMP-1', nom: 'Compresseuse FETTE 1', atelier: 'FABRICATION', type: 'COMPRESSION' },
    { code: 'COMP-2', nom: 'Compresseuse GLATTE 1', atelier: 'FABRICATION', type: 'COMPRESSION' },
    { code: 'GEL-1', nom: 'Encapsuleuse 1', atelier: 'FABRICATION', type: 'GELULE' },
    { code: 'PEL-1', nom: 'Pelliculeuse 1', atelier: 'FABRICATION', type: 'PELLICULAGE' },
    { code: 'CRM-1', nom: 'Ligne creme 1', atelier: 'FABRICATION', type: 'CREME' },
    { code: 'IMA-1', nom: 'Ligne IMA', atelier: 'CONDITIONNEMENT', type: 'CONDITIONNEMENT' },
    { code: 'INTEGRA-1', nom: 'Ligne INTEGRA', atelier: 'CONDITIONNEMENT', type: 'CONDITIONNEMENT' },
    { code: 'MARCH-1', nom: 'Ligne MARCHESINI', atelier: 'CONDITIONNEMENT', type: 'CONDITIONNEMENT' },
    { code: 'OTC-1', nom: 'Ligne OTC', atelier: 'CONDITIONNEMENT', type: 'CONDITIONNEMENT' },
  ];
  for (const e of equipements) {
    await prisma.equipement.upsert({
      where: { code: e.code },
      update: { nom: e.nom, atelier: e.atelier, type: e.type },
      create: e,
    });
  }

  // Produits de demo
  const produits = [
    {
      codePF: 'PFMEB02',
      designation: 'ZINC+Vitamine C MEDIBIO+ 10 mg+250 mg',
      donneurOrdreCode: 'OTC',
      formeCode: 'CPS',
      activite: 'OTC',
      nbUnitesParBoite: 30,
      tailleStandardLot: 120.0,
      dureeVie: 36,
      aql: 'NIVEAU II',
    },
    {
      codePF: 'PFMEB16',
      designation: 'Vitamine C MEDIBIO+ 500 mg',
      donneurOrdreCode: 'OTC',
      formeCode: 'CPS',
      activite: 'OTC',
      nbUnitesParBoite: 20,
      tailleStandardLot: 120.0,
      dureeVie: 36,
      aql: 'NIVEAU II',
    },
    {
      codePF: 'PFGEN01',
      designation: 'Amoxicilline 500 mg gelule',
      donneurOrdreCode: 'GENERIQUE',
      formeCode: 'GLE',
      activite: 'GENERIQUE',
      nbUnitesParBoite: 12,
      tailleStandardLot: 100.0,
      dureeVie: 24,
      aql: 'NIVEAU I',
    },
    {
      codePF: 'PFSRV01',
      designation: 'Servier Product 1',
      donneurOrdreCode: 'SERVIER',
      formeCode: 'CPS',
      activite: 'FACADE',
      nbUnitesParBoite: 30,
      tailleStandardLot: 80.0,
      dureeVie: 30,
      aql: 'NIVEAU II',
    },
  ];

  for (const p of produits) {
    const donneurId = donneurMap.get(p.donneurOrdreCode);
    const formeId = formeMap.get(p.formeCode);
    if (!donneurId || !formeId) continue;
    await prisma.produit.upsert({
      where: { codePF: p.codePF },
      update: { designation: p.designation },
      create: {
        codePF: p.codePF,
        designation: p.designation,
        donneurOrdreId: donneurId,
        formeGaleniqueId: formeId,
        activite: p.activite,
        nbUnitesParBoite: p.nbUnitesParBoite,
        tailleStandardLot: p.tailleStandardLot,
        dureeVie: p.dureeVie,
        aql: p.aql,
      },
    });
  }

  // OF de demonstration
  const ofCount = await prisma.ordreFabrication.count();
  if (ofCount === 0) {
    const prodPFMEB02 = await prisma.produit.findUnique({ where: { codePF: 'PFMEB02' } });
    const prodPFMEB16 = await prisma.produit.findUnique({ where: { codePF: 'PFMEB16' } });

    if (prodPFMEB02) {
      const of1 = await prisma.ordreFabrication.create({
        data: {
          numeroOF: 'OF-2024-001',
          produitId: prodPFMEB02.id,
          numeroLot: '14158',
          receptionOF: new Date('2024-01-01'),
          finValiditeOF: new Date('2026-12-31'),
          tailleLoT: 117.14,
          qteTheorique: 195484,
          workflowStatus: 'CLOTURE',
          dateDeclarationSF: new Date('2024-01-31'),
          qteSF: 117.14,
          createdById: adminId,
        },
      });

      // DDL cloture
      await prisma.dossierLot.create({
        data: {
          ofId: of1.id,
          statut: 'VALIDE',
          dateEmission: new Date('2024-02-01'),
          dateEnvoi: new Date('2024-02-05'),
          dateVerification: new Date('2024-02-10'),
          dateValidation: new Date('2024-02-12'),
        },
      });

      // Conditionnement cloture
      await prisma.conditionnement.create({
        data: {
          ofId: of1.id,
          statut: 'TERMINE',
          qteFabrique: 195484,
          qteCndt: 190000,
          qteRestante: 5484,
          tauxCndt: 97.2,
          dateDebutCndt: new Date('2024-02-15'),
          dateFinCndt: new Date('2024-02-20'),
        },
      });
    }

    if (prodPFMEB16) {
      const of2 = await prisma.ordreFabrication.create({
        data: {
          numeroOF: 'OF-2025-042',
          produitId: prodPFMEB16.id,
          numeroLot: '25042',
          receptionOF: new Date('2025-03-01'),
          finValiditeOF: new Date('2026-09-30'),
          tailleLoT: 118.0,
          qteTheorique: 100000,
          workflowStatus: 'SF_DECLARE',
          dateDeclarationSF: new Date('2025-04-10'),
          qteSF: 117.5,
          createdById: adminId,
        },
      });

      // Phases
      const compEquip = await prisma.equipement.findUnique({ where: { code: 'COMP-1' } });
      await prisma.phaseRealisation.createMany({
        data: [
          { ofId: of2.id, phase: 'PESEE', dateDebut: new Date('2025-03-02'), dateFin: new Date('2025-03-02'), qteEntreeKg: 120, qteSortieKg: 119.5, rendementKg: 99.6, statut: 'CONFORME' },
          { ofId: of2.id, phase: 'GRANULATION', dateDebut: new Date('2025-03-03'), dateFin: new Date('2025-03-04'), qteEntreeKg: 119.5, qteSortieKg: 118.8, rendementKg: 99.4, statut: 'CONFORME' },
          { ofId: of2.id, phase: 'MELANGE', dateDebut: new Date('2025-03-05'), dateFin: new Date('2025-03-05'), qteEntreeKg: 118.8, qteSortieKg: 118.5, rendementKg: 99.7, statut: 'CONFORME' },
          { ofId: of2.id, phase: 'COMPRESSION', equipementId: compEquip?.id, dateDebut: new Date('2025-03-06'), dateFin: new Date('2025-03-08'), qteEntreeKg: 118.5, qteSortieKg: 118.0, rendementKg: 99.6, statut: 'CONFORME' },
        ],
      });

      // DDL en attente
      await prisma.dossierLot.create({
        data: {
          ofId: of2.id,
          statut: 'EN_ATTENTE',
          dateEmission: new Date('2025-04-12'),
          dateEnvoi: new Date('2025-04-15'),
        },
      });
    }

    console.log('  -> OF de demonstration crees.');
  } else {
    console.log(`  -> deja ${ofCount} OF en base, import ignore.`);
  }

  // PDP demo pour le mois courant
  const now = new Date();
  const pdpCount = await prisma.pdp.count();
  if (pdpCount === 0) {
    const pdp = await prisma.pdp.create({
      data: { annee: now.getFullYear(), mois: now.getMonth() + 1 },
    });
    const prodPFMEB02 = await prisma.produit.findUnique({ where: { codePF: 'PFMEB02' } });
    const donneurOTC = await prisma.donneurOrdre.findUnique({ where: { code: 'OTC' } });
    if (prodPFMEB02 && donneurOTC) {
      await prisma.pdpLigne.create({
        data: {
          pdpId: pdp.id,
          produitId: prodPFMEB02.id,
          donneurOrdreId: donneurOTC.id,
          planQteFab: 100000,
          planQteCndt: 95000,
          planValeur: 5000000,
          realiseFab: 72000,
          realiseCndt: 60000,
          realiseValeur: 3600000,
        },
      });
    }
    console.log('  -> PDP de demonstration cree.');
  }

  console.log('Seed termine.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
