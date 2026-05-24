import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  MAX_RESUME_SIZE_BYTES,
  RESUME_ALLOWED_EXTENSIONS,
  RESUME_ALLOWED_MIME_TYPES,
  sanitizeResumeFileName,
} from '@/lib/resume-upload';

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

  const fileName = resume.name || 'resume.pdf';
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop()?.toLowerCase()}` : '';

  if (!RESUME_ALLOWED_MIME_TYPES.has(resume.type) || !RESUME_ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'Only PDF, DOC, and DOCX resume files are allowed.' }, { status: 400 });
  }

  if (resume.size <= 0 || resume.size > MAX_RESUME_SIZE_BYTES) {
    return NextResponse.json({ error: 'Resume file must be between 1 byte and 8MB.' }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: fullName },
    create: { name: fullName, email, role: 'CANDIDATE' },
  });

  const safeFileName = `${Date.now()}-${sanitizeResumeFileName(fileName)}`;
  const resumeBuffer = Buffer.from(await resume.arrayBuffer());

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
      // Keep legacy column as a metadata pointer while storing binary in ResumeAsset.
      resume: `db-asset://${safeFileName}` ,
      resumeFileUrl: null,
      resumeFileKey: null,
      resumeFileName: fileName,
      resumeMimeType: resume.type || 'application/pdf',
      resumeAsset: {
        create: {
          fileName,
          contentType: resume.type || 'application/pdf',
          data: resumeBuffer,
        },
      },
      status: 'PENDING',
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, applicationId: application.id });
}
