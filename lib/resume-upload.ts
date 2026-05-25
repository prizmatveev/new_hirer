export const RESUME_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const RESUME_ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

export const MAX_RESUME_SIZE_BYTES = 8 * 1024 * 1024;

export const sanitizeResumeFileName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
