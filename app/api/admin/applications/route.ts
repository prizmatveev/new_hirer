import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const rows = await prisma.application.findMany({
    include: { user: true, job: true, notes: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(rows);
}
