import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DUMMY_JOB = {
  title: 'QA Resume Upload Test Role',
  category: 'Web Development',
  description:
    'Temporary dummy role to validate Recruit/Hirer job sync and resume upload flows end-to-end.',
  location: 'Remote',
  salary: '$1 - Test',
  experience: '0+ years',
  employmentType: 'Contract',
  skills: ['Testing', 'Recruiting Workflow'],
  isOpen: true,
};

async function main() {
  // Non-destructive seed: keeps real production/test data intact.
  await prisma.job.upsert({
    where: {
      title_category_location: {
        title: DUMMY_JOB.title,
        category: DUMMY_JOB.category,
        location: DUMMY_JOB.location,
      },
    },
    update: {
      ...DUMMY_JOB,
      isOpen: true,
    },
    create: DUMMY_JOB,
  });
}

main().finally(() => prisma.$disconnect());
