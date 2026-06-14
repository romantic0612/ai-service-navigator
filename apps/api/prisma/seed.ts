import { PrismaClient } from '@prisma/client';
import { demoItems } from '../src/modules/services/service-items.service';
import { ensureDatabaseUrl } from '../src/config/database-url';

ensureDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  for (const item of demoItems) {
    await prisma.serviceItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.description,
        handlerCount: item.handlerCount,
        targetRoles: ['教职工', '本科生', '研究生'],
        entryUrl: item.entryUrl,
        department: item.department,
        contactPerson: item.contactPerson,
        contactPhone: item.contactPhone,
        serviceTime: item.serviceTime,
        basis: item.basis,
        materials: item.materials,
        processSteps: item.processSteps,
        notice: item.notice,
        keywords: item.searchTerms,
        status: 'ENABLED',
        lastVerifiedAt: item.lastVerifiedAt ? new Date(item.lastVerifiedAt) : undefined,
      },
      update: {
        title: item.title,
        category: item.category,
        description: item.description,
        handlerCount: item.handlerCount,
        targetRoles: ['教职工', '本科生', '研究生'],
        entryUrl: item.entryUrl,
        department: item.department,
        contactPerson: item.contactPerson,
        contactPhone: item.contactPhone,
        serviceTime: item.serviceTime,
        basis: item.basis,
        materials: item.materials,
        processSteps: item.processSteps,
        notice: item.notice,
        keywords: item.searchTerms,
        status: 'ENABLED',
        lastVerifiedAt: item.lastVerifiedAt ? new Date(item.lastVerifiedAt) : undefined,
      },
    });
  }

  console.log(`Seeded ${demoItems.length} service items.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
