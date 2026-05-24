export const RESUME_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const RESUME_ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

export const MAX_RESUME_SIZE_BYTES = 8 * 1024 * 1024;

export const sanitizeResumeFileName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');

export async function uploadResumeToUploadThing(file: File, customId: string) {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) {
    throw new Error('Missing UPLOADTHING_TOKEN');
  }

  const uploadRes = await fetch('https://uploadthing.com/api/uploadFiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-uploadthing-api-key': token,
    },
    body: JSON.stringify({
      files: [
        {
          name: file.name,
          size: file.size,
          type: file.type,
          customId,
        },
      ],
    }),
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`UploadThing presign failed: ${uploadRes.status} ${body}`);
  }

  const payload = (await uploadRes.json()) as Array<{ key: string; url: string; fields: Record<string, string> }>;
  const presigned = payload?.[0];
  if (!presigned?.url || !presigned?.key || !presigned?.fields) {
    throw new Error('UploadThing presign response missing fields');
  }

  const formData = new FormData();
  Object.entries(presigned.fields).forEach(([k, v]) => formData.append(k, v));
  formData.append('file', file);

  const storeRes = await fetch(presigned.url, { method: 'POST', body: formData });
  if (!storeRes.ok) {
    const body = await storeRes.text();
    throw new Error(`UploadThing file upload failed: ${storeRes.status} ${body}`);
  }

  return {
    key: presigned.key,
    url: `https://utfs.io/f/${presigned.key}`,
  };
}
