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

const mimeFromPath = (path: string) => {
  const ext = path.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt': return 'text/plain; charset=utf-8';
    case 'rtf': return 'application/rtf';
    case 'odt': return 'application/vnd.oasis.opendocument.text';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'bmp': return 'image/bmp';
    case 'tif':
    case 'tiff': return 'image/tiff';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const application = await prisma.application.findUnique({
    where: { id: params.id },
    select: { id: true, resume: true, resumeAsset: { select: { fileName: true, contentType: true, data: true } } },
  });

  if (!application?.resume) {
    return NextResponse.json({ error: 'Resume not found for this application.' }, { status: 404 });
  }


  if (application.resumeAsset) {
    return new NextResponse(new Uint8Array(application.resumeAsset.data), {
      headers: {
        'Content-Type': application.resumeAsset.contentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${application.resumeAsset.fileName || 'resume'}"`,
        'Cache-Control': 'private, no-store',
      },
    });
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
  } catch {
    return NextResponse.json({ error: 'Resume file is missing on server storage. This is usually a legacy record saved before persistent resume storage was enabled.' }, { status: 404 });
  }

  const file = await readFile(diskPath);

  // Backfill legacy path-based records into persistent DB storage once file is available.
  const inferredType = mimeFromPath(publicPath);
  const inferredName = publicPath.split('/').pop() || 'resume';
  const persistentDataUrl = `data:${inferredType};name=${encodeURIComponent(inferredName)};base64,${file.toString('base64')}`;

  await prisma.application.update({
    where: { id: application.id },
    data: { resume: persistentDataUrl },
  }).catch(() => {
    // Non-blocking: download should still succeed even if backfill fails.
  });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': inferredType,
      'Content-Disposition': `inline; filename="${publicPath.split('/').pop() || 'resume'}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
