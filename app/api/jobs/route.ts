import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const jobs = await prisma.job.findMany({ where: { isOpen: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(jobs);
}
