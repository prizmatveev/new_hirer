import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
]);

const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.svg']);

const sanitizeFileName = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');

export async function POST(req: Request) {
  const form = await req.formData();
  const jobId = String(form.get('jobId') || '');
  const fullName = String(form.get('fullName') || '');
  const email = String(form.get('email') || '');
  const phone = String(form.get('phone') || '');
  const location = String(form.get('location') || '');
  const experience = String(form.get('experience') || '');
  const currentCompany = String(form.get('currentCompany') || '');
  const expectedSalary = String(form.get('expectedSalary') || '');
  const coverLetter = String(form.get('coverLetter') || '');
  const linkedin = String(form.get('linkedin') || '');
  const github = String(form.get('github') || '');
  const portfolio = String(form.get('portfolio') || '');
  const resume = form.get('resume');

  if (!jobId || !fullName || !email || !phone || !linkedin || !github || !(resume instanceof File)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const fileName = resume.name || 'resume';
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop()?.toLowerCase()}` : '';
  if (!allowedMimeTypes.has(resume.type) || !allowedExtensions.has(ext)) {
    return NextResponse.json({ error: 'Only image and document resume files are allowed.' }, { status: 400 });
  }

  const bytes = await resume.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const storedName = `${Date.now()}-${sanitizeFileName(fileName)}`;

  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'resumes');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, storedName), buffer);
  } catch {
    // Optional best-effort local write only.
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: fullName },
    create: { name: fullName, email, role: 'CANDIDATE' },
  });

  const resumeDataUrl = `data:${resume.type || 'application/octet-stream'};name=${encodeURIComponent(storedName)};base64,${buffer.toString('base64')}`;

  try {
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId,
        phone,
        location: location || null,
        yearsExperience: experience || null,
        currentCompany: currentCompany || null,
        expectedSalary: expectedSalary || null,
        coverLetter: coverLetter || null,
        linkedin,
        github,
        portfolio: portfolio || null,
        resume: `dbasset:${storedName}`,
        status: 'PENDING',
        resumeAsset: {
          create: {
            fileName: storedName,
            contentType: resume.type || 'application/octet-stream',
            data: buffer,
          },
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, applicationId: application.id });
  } catch {
    // Fallback for deployments where DB schema is not yet migrated for ResumeAsset.
    const fallbackApplication = await prisma.application.create({
      data: {
        userId: user.id,
        jobId,
        phone,
        location: location || null,
        yearsExperience: experience || null,
        currentCompany: currentCompany || null,
        expectedSalary: expectedSalary || null,
        coverLetter: coverLetter || null,
        linkedin,
        github,
        portfolio: portfolio || null,
        resume: resumeDataUrl,
        status: 'PENDING',
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, applicationId: fallbackApplication.id });
  }
}
