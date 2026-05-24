import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { access, readFile } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const toPublicResumePath = (resume: string) => {
  const normalized = resume.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/^public\//, '');
  if (normalized.startsWith('/')) return normalized;
  if (normalized.startsWith('uploads/')) return `/${normalized}`;
  return `/uploads/resumes/${normalized.split('/').pop() ?? normalized}`;
};

const parseStoredDataResume = (resume: string) => {
  const normalized = resume.trim();
  if (!normalized.startsWith('data:') || !normalized.includes(';base64,')) return null;

  const [meta, base64] = normalized.split(';base64,');
  const metaWithoutPrefix = meta.slice('data:'.length);
  const [contentType, ...params] = metaWithoutPrefix.split(';');
  const fileNameParam = params.find((part) => part.startsWith('name='));
  const fileName = fileNameParam ? decodeURIComponent(fileNameParam.replace(/^name=/, '')) : 'resume';

  try {
    const file = Buffer.from(base64, 'base64');
    return {
      file,
      contentType: contentType || 'application/octet-stream',
      fileName,
    };
  } catch {
    return null;
  }
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const application = await prisma.application.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      resume: true,
      resumeFileUrl: true,
      resumeFileName: true,
      resumeMimeType: true,
      resumeAsset: { select: { fileName: true, contentType: true, data: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  if (application.resumeFileUrl) {
    return NextResponse.redirect(application.resumeFileUrl);
  }

  // Legacy compatibility path for old records until all historic resumes are migrated.
  if (application.resumeAsset) {
    return new NextResponse(new Uint8Array(application.resumeAsset.data), {
      headers: {
        'Content-Type': application.resumeAsset.contentType || application.resumeMimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${application.resumeAsset.fileName || application.resumeFileName || 'resume'}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  if (!application.resume) {
    return NextResponse.json({ error: 'Resume not found for this application.' }, { status: 404 });
  }

  const resume = application.resume;
  if (resume.startsWith('http://') || resume.startsWith('https://')) {
    return NextResponse.redirect(resume);
  }

  const parsedDataResume = parseStoredDataResume(resume);
  if (parsedDataResume) {
    return new NextResponse(new Uint8Array(parsedDataResume.file), {
      headers: {
        'Content-Type': parsedDataResume.contentType,
        'Content-Disposition': `inline; filename="${parsedDataResume.fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  const publicPath = toPublicResumePath(resume);
  const diskPath = join(process.cwd(), 'public', publicPath.replace(/^\//, ''));

  try {
    await access(diskPath, constants.R_OK);
    const file = await readFile(diskPath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': application.resumeMimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${application.resumeFileName || publicPath.split('/').pop() || 'resume'}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Resume file is missing and no UploadThing URL is available.' }, { status: 404 });
  }
}
