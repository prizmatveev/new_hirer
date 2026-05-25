import { ApplicationStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const isValidStatus = (value: unknown): value is ApplicationStatus =>
  typeof value === 'string' && Object.values(ApplicationStatus).includes(value as ApplicationStatus);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status, note } = await req.json();

  if (status !== undefined && !isValidStatus(status)) {
    return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, jobId: true, job: { select: { openings: true } } },
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  const nextStatus = status as ApplicationStatus | undefined;
  const previousStatus = application.status;
  const shouldUpdateStatus = !!nextStatus && nextStatus !== previousStatus;

  let openingsDelta = 0;
  if (shouldUpdateStatus) {
    if (previousStatus !== 'SHORTLISTED' && nextStatus === 'SHORTLISTED') openingsDelta = -1;
    if (previousStatus === 'SHORTLISTED' && nextStatus !== 'SHORTLISTED') openingsDelta = 1;
  }

  if (openingsDelta < 0 && application.job.openings <= 0) {
    return NextResponse.json(
      { error: 'Cannot shortlist candidate because no openings are available for this job.' },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedApp = shouldUpdateStatus
      ? await tx.application.update({ where: { id: params.id }, data: { status: nextStatus } })
      : await tx.application.findUniqueOrThrow({ where: { id: params.id } });

    if (openingsDelta !== 0) {
      await tx.job.update({
        where: { id: application.jobId },
        data: { openings: { increment: openingsDelta } },
      });
    }

    if (typeof note === 'string' && note.trim()) {
      await tx.adminNotes.create({ data: { applicationId: params.id, note: note.trim() } });
    }

    return updatedApp;
  });

  return NextResponse.json(updated);
}
