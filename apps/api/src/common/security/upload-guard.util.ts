import { randomUUID } from 'crypto';
import { connect } from 'net';

/**
 * Mandatory validation for every file upload. No upload route may write a
 * user-supplied file without passing it through validateUpload() first.
 *
 * Defences, in order:
 *  1. size cap (default 10 MB)
 *  2. extension allowlist
 *  3. magic-byte sniffing — the declared type must match the actual bytes,
 *     so a .png that is really a shell script is rejected
 *  4. random storage filename — the client's filename never touches the
 *     filesystem (no traversal, no collisions, nothing executable by name)
 *  5. optional ClamAV scan when CLAMAV_HOST is configured
 * Uploaded content must additionally be stored outside any web root and
 * served with Content-Disposition: attachment (see docs/SECURITY.md §6).
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface TypeRule {
  extensions: string[];
  matches: (buf: Buffer) => boolean;
}

const ascii = (buf: Buffer, offset: number, text: string) =>
  buf.subarray(offset, offset + text.length).toString('latin1') === text;

const TYPE_RULES: Record<string, TypeRule> = {
  pdf: { extensions: ['pdf'], matches: (b) => ascii(b, 0, '%PDF-') },
  png: {
    extensions: ['png'],
    matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  jpeg: {
    extensions: ['jpg', 'jpeg'],
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  webp: { extensions: ['webp'], matches: (b) => ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP') },
  heic: { extensions: ['heic', 'heif'], matches: (b) => ascii(b, 4, 'ftyp') },
  // docx/xlsx are ZIP containers; the extension pins which is claimed.
  docx: { extensions: ['docx'], matches: (b) => b[0] === 0x50 && b[1] === 0x4b },
  xlsx: { extensions: ['xlsx'], matches: (b) => b[0] === 0x50 && b[1] === 0x4b },
  csv: {
    extensions: ['csv'],
    // Text-only check: no NUL bytes in the first 4 KB.
    matches: (b) => !b.subarray(0, 4096).includes(0),
  },
};

export class UploadRejectedError extends Error {}

export interface ValidatedUpload {
  /** Random name to store the file under (client filename is discarded). */
  storageName: string;
  extension: string;
}

export async function validateUpload(
  buffer: Buffer,
  originalName: string,
  opts: { allowedExtensions?: string[]; maxBytes?: number } = {},
): Promise<ValidatedUpload> {
  const maxBytes = opts.maxBytes ?? MAX_UPLOAD_BYTES;
  if (buffer.length === 0) throw new UploadRejectedError('Empty file');
  if (buffer.length > maxBytes) {
    throw new UploadRejectedError(`File exceeds the ${Math.round(maxBytes / 1048576)} MB limit`);
  }

  const extension = originalName.split('.').pop()?.toLowerCase() ?? '';
  const rule = Object.values(TYPE_RULES).find((r) => r.extensions.includes(extension));
  if (!rule) throw new UploadRejectedError(`File type .${extension || '?'} is not allowed`);
  if (opts.allowedExtensions && !opts.allowedExtensions.includes(extension)) {
    throw new UploadRejectedError(`Only ${opts.allowedExtensions.join(', ')} files are allowed here`);
  }
  if (!rule.matches(buffer)) {
    throw new UploadRejectedError('File content does not match its declared type');
  }

  await scanWithClamAV(buffer);

  return { storageName: `${randomUUID()}.${extension}`, extension };
}

/**
 * Streams the buffer to a clamd daemon (INSTREAM protocol) when
 * CLAMAV_HOST is set; no-op otherwise so dev machines don't need ClamAV.
 * docker-compose ships a clamav service — enable it in production.
 */
async function scanWithClamAV(buffer: Buffer): Promise<void> {
  const host = process.env['CLAMAV_HOST'];
  if (!host) return;
  const port = Number(process.env['CLAMAV_PORT'] ?? 3310);

  const verdict = await new Promise<string>((resolve, reject) => {
    const socket = connect({ host, port, timeout: 30_000 }, () => {
      socket.write('zINSTREAM\0');
      const size = Buffer.alloc(4);
      size.writeUInt32BE(buffer.length);
      socket.write(size);
      socket.write(buffer);
      socket.write(Buffer.from([0, 0, 0, 0]));
    });
    let response = '';
    socket.on('data', (chunk) => (response += chunk.toString()));
    socket.on('end', () => resolve(response));
    socket.on('error', reject);
    socket.on('timeout', () => reject(new Error('ClamAV scan timed out')));
  });

  if (!verdict.includes('OK') || verdict.includes('FOUND')) {
    throw new UploadRejectedError('File failed the virus scan');
  }
}
