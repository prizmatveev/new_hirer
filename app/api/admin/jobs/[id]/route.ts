import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const data = (await req.json()) as Prisma.JobUpdateInput;
  const updated = await prisma.job.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const jobId = params.id;

  await prisma.$transaction(async (tx) => {
    const relatedApps = await tx.application.findMany({
      where: { jobId },
      select: { id: true },
    });

    if (relatedApps.length > 0) {
      const applicationIds = relatedApps.map((application) => application.id);

      await tx.adminNotes.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });

      await tx.application.deleteMany({ where: { jobId } });
    }

    await tx.job.delete({ where: { id: jobId } });
  });

  return NextResponse.json({ ok: true });
}
