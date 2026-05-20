import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  return NextResponse.json(await prisma.job.update({ where: { id: params.id }, data }));
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const jobId = params.id;

  await prisma.$transaction(async (tx) => {
    const relatedApps = await tx.application.findMany({
      where: { jobId },
      select: { id: true },
    });

    if (relatedApps.length > 0) {
      await tx.adminNotes.deleteMany({
        where: { applicationId: { in: relatedApps.map((a) => a.id) } },
      });

      await tx.application.deleteMany({ where: { jobId } });
    }

    await tx.job.delete({ where: { id: jobId } });
  });

  return NextResponse.json({ ok: true });
}
