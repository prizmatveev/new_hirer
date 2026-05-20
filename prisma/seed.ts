import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.adminNotes.deleteMany();
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();
  // intentionally no dummy jobs seeded
}

main().finally(() => prisma.$disconnect());
