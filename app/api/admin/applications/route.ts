import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const rows = await prisma.application.findMany({
    include: { user: true, job: true, notes: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(rows, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
