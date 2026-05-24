import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  MAX_RESUME_SIZE_BYTES,
  RESUME_ALLOWED_EXTENSIONS,
  RESUME_ALLOWED_MIME_TYPES,
  sanitizeResumeFileName,
  uploadResumeToUploadThing,
} from '@/lib/uploadthing';

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

  // UploadThing is the only write path for new resume documents.
  const uploadName = `${Date.now()}-${sanitizeResumeFileName(fileName)}`;
  let uploadedUrl = '';
  let uploadedKey = '';

  try {
    const result = await uploadResumeToUploadThing(new File([resume], uploadName, { type: resume.type || 'application/pdf' }), uploadName);

    if (!result.url || !result.key) {
      console.error('[applications] UploadThing returned missing url/key:', result);
      return NextResponse.json({ error: 'Resume upload response was invalid.' }, { status: 502 });
    }

    uploadedUrl = result.url;
    uploadedKey = result.key;
  } catch (error) {
    console.error('[applications] UploadThing API exception:', error);
    const message = error instanceof Error ? error.message : 'Unexpected resume upload failure.';
    return NextResponse.json(
      {
        error: `Unexpected resume upload failure: ${message}`,
        hint: 'Verify Vercel env var UPLOADTHING_TOKEN is raw token only (no quotes, no UPLOADTHING_TOKEN= prefix), then redeploy.',
      },
      { status: 502 },
    );
  }

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
      // Keep legacy column for backward compatibility while shifting reads to dedicated fields.
      resume: uploadedUrl,
      resumeFileUrl: uploadedUrl,
      resumeFileKey: uploadedKey,
      resumeFileName: fileName,
      resumeMimeType: resume.type || 'application/pdf',
      status: 'PENDING',
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, applicationId: application.id });
}
