export const RESUME_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const RESUME_ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

export const MAX_RESUME_SIZE_BYTES = 8 * 1024 * 1024;

export const sanitizeResumeFileName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');

type PresignedUpload = {
  key: string;
  url: string;
  fields?: Record<string, string>;
};

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

const decodeUploadThingApiKey = (token: string) => {
  try {
    const parsed = JSON.parse(token) as { apiKey?: string };
    if (parsed?.apiKey) return parsed.apiKey;
  } catch {
    // noop
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { apiKey?: string };
    if (parsed?.apiKey) return parsed.apiKey;
  } catch {
    // noop
  }

  return token;
};

const safeTokenDebug = (raw: string | undefined) => {
  const normalized = normalizeUploadThingToken(raw);
  const prefix = normalized ? `${normalized.slice(0, 6)}...${normalized.slice(-6)}` : 'missing';
  return {
    present: Boolean(normalized),
    length: normalized.length,
    preview: prefix,
    hadQuotes: Boolean(raw && raw.trim().match(/^['"].*['"]$/)),
    hadEnvPrefix: Boolean(raw?.includes('UPLOADTHING_TOKEN=')),
  };
};

export async function uploadResumeToUploadThing(file: File, customId: string) {
  const normalizedToken = normalizeUploadThingToken(process.env.UPLOADTHING_TOKEN);
  if (!normalizedToken) {
    throw new Error('Missing UPLOADTHING_TOKEN');
  }
  const apiKey = decodeUploadThingApiKey(normalizedToken);

  const requestBody = JSON.stringify({
    files: [
      {
        name: file.name,
        size: file.size,
        type: file.type,
        customId,
      },
    ],
  });

  const presignAttempts = [
    {
      label: 'api-host-with-key-header',
      url: 'https://api.uploadthing.com/v6/uploadFiles',
      headers: {
        'Content-Type': 'application/json',
        'x-uploadthing-api-key': apiKey,
        'x-uploadthing-version': '7.0.0',
        'x-uploadthing-package': 'resume-uploader',
      },
    },
    {
      label: 'legacy-host-with-key-header',
      url: 'https://uploadthing.com/api/uploadFiles',
      headers: {
        'Content-Type': 'application/json',
        'x-uploadthing-api-key': apiKey,
      },
    },
    {
      label: 'api-host-with-bearer',
      url: 'https://api.uploadthing.com/v6/uploadFiles',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-uploadthing-version': '7.0.0',
        'x-uploadthing-package': 'resume-uploader',
      },
    },
  ] as const;

  let uploadRes: Response | null = null;
  let failureDetails = '';

  for (const attempt of presignAttempts) {
    const res = await fetch(attempt.url, {
      method: 'POST',
      headers: attempt.headers,
      body: requestBody,
    });

    if (res.ok) {
      uploadRes = res;
      break;
    }

    const failureBody = await res.text();
    failureDetails += `${attempt.label}:${res.status}:${failureBody} | `;
  }

  if (!uploadRes) {
    const debug = safeTokenDebug(process.env.UPLOADTHING_TOKEN);
    throw new Error(`UploadThing presign failed across attempts. details=${failureDetails} tokenDebug=${JSON.stringify(debug)}`);
  }

  const payload = (await uploadRes.json()) as PresignedUpload[] | { data?: PresignedUpload[] };
  const presigned = Array.isArray(payload) ? payload?.[0] : payload?.data?.[0];
  if (!presigned?.url || !presigned?.key) {
    throw new Error('UploadThing presign response missing fields');
  }

  const uploadBody = presigned.fields
    ? (() => {
        const formData = new FormData();
        Object.entries(presigned.fields ?? {}).forEach(([k, v]) => formData.append(k, v));
        formData.append('file', file);
        return formData;
      })()
    : file;

  // UploadThing storage endpoint expects PUT for file transfer.
  const storeRes = await fetch(presigned.url, { method: 'PUT', body: uploadBody });
  if (!storeRes.ok) {
    const body = await storeRes.text();
    throw new Error(`UploadThing file upload failed: ${storeRes.status} ${body}`);
  }

  return {
    key: presigned.key,
    url: `https://utfs.io/f/${presigned.key}`,
  };
}
