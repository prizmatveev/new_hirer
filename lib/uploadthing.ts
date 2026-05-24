import { UTApi } from 'uploadthing/server';

export const RESUME_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const RESUME_ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

export const MAX_RESUME_SIZE_BYTES = 8 * 1024 * 1024;

export const sanitizeResumeFileName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');

const normalizeUploadThingToken = (value: string | undefined) => {
  if (!value) return '';

  let normalized = value.trim();
  if (normalized.startsWith('UPLOADTHING_TOKEN=')) {
    normalized = normalized.slice('UPLOADTHING_TOKEN='.length).trim();
  }

  if (
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
};

export async function uploadResumeToUploadThing(file: File, customId: string) {
  const normalizedToken = normalizeUploadThingToken(process.env.UPLOADTHING_TOKEN);
  if (!normalizedToken) {
    throw new Error('Missing UPLOADTHING_TOKEN');
  }

  // Official UploadThing server SDK flow; avoids brittle manual presign APIs.
  const utapi = new UTApi({ token: normalizedToken });
  const uploaded = await utapi.uploadFiles(
    new File([file], file.name, { type: file.type || 'application/pdf' }),
    { metadata: { customId } },
  );

  const result = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  if (result.error) {
    throw new Error(`UploadThing SDK upload failed: ${result.error.message}`);
  }

  if (!result.data?.url || !result.data?.key) {
    throw new Error('UploadThing SDK upload response missing url/key');
  }

  return {
    key: result.data.key,
    url: result.data.url,
  };
}
