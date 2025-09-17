export interface NormalizedFileEntry {
  bucket: string;
  path: string;
  name: string;
}

function lastSegment(p: string): string {
  try {
    const seg = p.split('/').filter(Boolean).pop();
    return seg ? decodeURIComponent(seg) : 'file';
  } catch {
    return p.split('/').filter(Boolean).pop() || 'file';
  }
}

function safeNewURL(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(raw, 'http://localhost');
    } catch {
      return null;
    }
  }
}

export function normalizePOFileEntry(entry: any, projectId: string): NormalizedFileEntry | any {
  if (!entry) return entry;

  // If already normalized
  if (typeof entry === 'object' && entry.bucket && entry.path) {
    return {
      bucket: String(entry.bucket),
      path: String(entry.path),
      name: entry.name ? String(entry.name) : lastSegment(String(entry.path))
    } as NormalizedFileEntry;
  }

  let raw = typeof entry === 'string' ? String(entry) : (entry?.url || '');
  if (!raw) return entry;

  raw = raw.trim().replace(/^['"]|['"]$/g, '');

  // Existing redirect links: /file-redirect?bucket=...&path=...&fileName=...
  if (raw.startsWith('/file-redirect')) {
    const u = safeNewURL(raw);
    const bucket = u?.searchParams.get('bucket') || 'project-files';
    const path = u?.searchParams.get('path') || '';
    const name = u?.searchParams.get('fileName') || entry?.name || lastSegment(path);
    if (path) return { bucket, path, name } as NormalizedFileEntry;
  }

  // Direct Supabase public URL
  const urlObj = safeNewURL(raw);
  const pathname = urlObj?.pathname || raw;
  const publicMatch = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (publicMatch) {
    const bucket = publicMatch[1];
    const path = publicMatch[2];
    const name = entry?.name || lastSegment(path);
    return { bucket, path, name } as NormalizedFileEntry;
  }

  // Legacy proposals links embedded in string
  const proposalsIdx = raw.indexOf('/proposals/');
  if (proposalsIdx !== -1) {
    const after = raw.substring(proposalsIdx + '/proposals/'.length).split(/[?#]/)[0];
    const path = `proposals/${after}`;
    const name = entry?.name || lastSegment(after);
    return { bucket: 'project-files', path, name } as NormalizedFileEntry;
  }

  // Proposal id-like string
  if (typeof entry === 'string' && raw.startsWith('proposal_')) {
    const path = `proposals/${raw}`;
    const name = lastSegment(raw);
    return { bucket: 'project-files', path, name } as NormalizedFileEntry;
  }

  // Fallback: treat as PO attachment id/name under purchase-orders/{projectId}/
  const id = (typeof entry === 'object' ? (entry.id || entry.name) : raw) as string;
  const path = `purchase-orders/${projectId}/${id}`;
  const name = (typeof entry === 'object' ? (entry.name || entry.id) : lastSegment(raw)) as string;
  return { bucket: 'project-files', path, name } as NormalizedFileEntry;
}

export function normalizePOFiles(files: any, projectId: string): NormalizedFileEntry[] {
  if (!files) return [];
  const arr = Array.isArray(files) ? files : [files];
  return arr.map((f) => normalizePOFileEntry(f, projectId));
}
