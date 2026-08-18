import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Folder, ChevronRight, FileText } from "lucide-react";
import JSZip from 'jszip';
import { supabase } from "@/integrations/supabase/client";

interface SharedPhoto {
  id: string;
  url: string;
  description: string | null;
  project_id: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface SharedFile {
  id: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  project_id: string;
  uploaded_by: string;
  uploaded_at: string;
  relative_path?: string;
}

const relativeParts = (path: string, rootPath: string) => {
  const normalized = path.replace(/^\/+|\/+$/g, '');
  const root = rootPath.replace(/^\/+|\/+$/g, '');
  const relative = root && normalized.startsWith(`${root}/`)
    ? normalized.slice(root.length + 1)
    : normalized;
  return relative.split('/').filter(Boolean);
};

export default function SharedFolder() {
  const { shareId } = useParams();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [rootPath, setRootPath] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [shareType, setShareType] = useState<'photos' | 'files'>('photos');
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFolder = async () => {
      try {
        if (!shareId) {
          setError('Invalid share link');
          setLoading(false);
          return;
        }

        const { data: shareData, error } = await supabase
          .from('shared_links')
          .select('*')
          .eq('share_id', shareId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (error) {
          setError('Failed to load shared folder');
          setLoading(false);
          return;
        }

        if (!shareData) {
          setError('Share not found - the link may be invalid or expired');
          setExpired(true);
          setLoading(false);
          return;
        }

        if (new Date() > new Date(shareData.expires_at)) {
          setExpired(true);
          setLoading(false);
          return;
        }

        const data = shareData.data as any;
        let path = data.folder_path || data.folderPath || '';

        const sharedFiles = Array.isArray(data.files) ? data.files : [];
        const sharedFolders = Array.isArray(data.folders) ? data.folders : [];

        // Single-file shares: treat the file's own directory as the root so the
        // file shows immediately with its Download button (no folder drilling).
        if (!path && sharedFiles.length === 1 && sharedFolders.length === 0) {
          const f = sharedFiles[0];
          const full: string = f.relative_path || f.original_filename || '';
          const dir = full.replace(/^\/+/, '').split('/').slice(0, -1).join('/');
          if (dir) path = dir;
        }

        setRootPath(path);
        setCurrentPath(path);

        if (sharedFiles.length > 0) {
          setShareType('files');
          setFiles(sharedFiles);
          setFolders(sharedFolders);
        } else if (data.folders && data.folders.length > 0) {

          setShareType('files');
          setFolders(data.folders);
        } else if (data.photos && data.photos.length > 0) {
          setShareType('photos');
          setPhotos(data.photos);
        } else {
          setError('This shared folder is empty');
        }

        setLoading(false);
      } catch (e) {
        console.error('Error loading shared folder:', e);
        setError('Failed to load shared folder');
        setLoading(false);
      }
    };

    if (shareId) loadFolder();
  }, [shareId]);

  // Compute relative path parts for each file (stripped of the shared root)
  const filesWithRel = useMemo(() => {
    return files.map((f) => {
      let name = f.relative_path || f.original_filename || '';
      if (!f.relative_path && rootPath && name.startsWith(`${rootPath}/`)) {
        name = name.slice(rootPath.length + 1);
      }
      const parts = f.relative_path
        ? name.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
        : relativeParts(name, rootPath);
      const leaf = parts[parts.length - 1] || name;
      const parentParts = parts.slice(0, -1);
      return { file: f, parentParts, leaf };
    });
  }, [files, rootPath]);

  // Derive relative segments from currentPath (relative to rootPath)
  const currentRelParts = useMemo(() => {
    if (!currentPath || currentPath === rootPath) return [] as string[];
    const rel = rootPath && currentPath.startsWith(`${rootPath}/`)
      ? currentPath.slice(rootPath.length + 1)
      : currentPath;
    return rel.split('/').filter(Boolean);
  }, [currentPath, rootPath]);

  const folderParts = useMemo(
    () => folders.map((path) => relativeParts(path, rootPath)).filter((parts) => parts.length > 0),
    [folders, rootPath]
  );

  // Immediate child folders from explicit folder records, with a fallback to file paths for old links.
  const currentFolders = useMemo(() => {
    const counts = new Map<string, number>();
    const depth = currentRelParts.length;
    for (const parts of folderParts) {
      if (parts.length <= depth) continue;
      if (!currentRelParts.every((part, index) => parts[index] === part)) continue;
      counts.set(parts[depth], 0);
    }
    for (const { parentParts } of filesWithRel) {
      if (parentParts.length <= depth) continue;
      if (!currentRelParts.every((part, index) => parentParts[index] === part)) continue;
      const childName = parentParts[depth];
      counts.set(childName, (counts.get(childName) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [filesWithRel, folderParts, currentRelParts]);

  // Files at the current view (exact parent match)
  const currentFiles = useMemo(() => {
    const depth = currentRelParts.length;
    return filesWithRel
      .filter(({ parentParts }) => {
        if (parentParts.length !== depth) return false;
        for (let i = 0; i < depth; i++) {
          if (parentParts[i] !== currentRelParts[i]) return false;
        }
        return true;
      })
      .sort((a, b) => a.leaf.localeCompare(b.leaf, undefined, { numeric: true }));
  }, [filesWithRel, currentRelParts]);

  const rootName = rootPath ? rootPath.split('/').pop() || rootPath : 'Shared Files';

  const goToCrumb = (index: number) => {
    // index = -1 => root; else index into currentRelParts
    if (index < 0) {
      setCurrentPath(rootPath);
    } else {
      const rel = currentRelParts.slice(0, index + 1).join('/');
      setCurrentPath(rootPath ? `${rootPath}/${rel}` : rel);
    }
  };

  const enterFolder = (name: string) => {
    setCurrentPath(currentPath ? `${currentPath}/${name}` : name);
  };

  const handleFileDownload = async (file: SharedFile) => {
    try {
      const response = await fetch(
        `https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/public-file-download?share_id=${shareId}&file_id=${file.id}`
      );
      if (!response.ok) throw new Error('Failed to get download URL');
      const data = await response.json();
      const link = document.createElement('a');
      link.href = data.download_url;
      const leaf = file.original_filename.includes('/')
        ? file.original_filename.split('/').pop() as string
        : file.original_filename;
      link.download = leaf;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error downloading file:', e);
      toast({ title: "Download Error", description: "Failed to download file", variant: "destructive" });
    }
  };

  const handleDownloadAll = async () => {
    if (shareType !== 'files' || files.length === 0) return;
    setIsDownloading(true);
    toast({ title: "Preparing Download", description: `Zipping ${rootName}...` });
    const zip = new JSZip();
    try {
      for (const { file, parentParts, leaf } of filesWithRel) {
        try {
          const resp = await fetch(
            `https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/public-file-download?share_id=${shareId}&file_id=${file.id}`
          );
          if (!resp.ok) continue;
          const { download_url } = await resp.json();
          const blob = await (await fetch(download_url)).blob();
          const path = [...parentParts, leaf].join('/');
          zip.file(path, blob);
        } catch (err) {
          console.error('zip file failed', err);
        }
      }
      for (const parts of folderParts) {
        zip.folder(parts.join('/'));
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rootName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Download Complete", description: `${rootName}.zip downloaded` });
    } catch (e) {
      console.error(e);
      toast({ title: "Download Error", description: "Failed to create zip file", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePhotoDownload = async (photo: SharedPhoto) => {
    try {
      const response = await fetch(
        `https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/public-file-download?share_id=${shareId}&photo_id=${photo.id}`
      );
      if (!response.ok) throw new Error('Failed to get download URL');
      const data = await response.json();
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = photo.url.split('/').pop() || 'photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      toast({ title: "Download Error", description: "Failed to download photo", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-500 text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold mb-2">Link Expired</h1>
          <p className="text-muted-foreground mb-4">This share link has expired and is no longer accessible.</p>
          <p className="text-sm text-muted-foreground">Share links are valid for 7 days from creation.</p>
        </div>
      </div>
    );
  }

  if (shareType === 'photos') {
    if (photos.length === 0) {
      return (
        <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">No Photos Found</h1>
            <p className="text-muted-foreground">The shared folder is empty.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-2xl px-4 py-8">
          <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">{rootName}</h1>
            <p className="text-muted-foreground mb-3">{photos.length} photo{photos.length !== 1 ? 's' : ''} shared with you</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="bg-card rounded-lg shadow-sm p-4 flex items-center justify-between">
                <div className="flex-1 truncate">{p.description || `photo-${p.id}`}</div>
                <Button variant="outline" size="sm" onClick={() => handlePhotoDownload(p)}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const atRoot = currentRelParts.length === 0;

  return (
    <div className="flex-1 w-full min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-2xl px-4 py-8">
        <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
          {/* Breadcrumbs */}
          <div className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground mb-2">
            <button
              className="hover:text-foreground font-medium"
              onClick={() => goToCrumb(-1)}
            >
              {rootName}
            </button>
            {currentRelParts.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <button
                  className="hover:text-foreground"
                  onClick={() => goToCrumb(i)}
                >
                  {seg}
                </button>
              </span>
            ))}
          </div>

          <h1 className="text-2xl font-bold mb-2">
            {atRoot ? rootName : currentRelParts[currentRelParts.length - 1]}
          </h1>
          <p className="text-muted-foreground mb-3">
            {currentFolders.length > 0 && `${currentFolders.length} folder${currentFolders.length !== 1 ? 's' : ''}`}
            {currentFolders.length > 0 && currentFiles.length > 0 && ' · '}
            {currentFiles.length > 0 && `${currentFiles.length} file${currentFiles.length !== 1 ? 's' : ''}`}
            {currentFolders.length === 0 && currentFiles.length === 0 && 'Empty folder'}
          </p>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between gap-3">
            <p className="text-yellow-800 text-sm font-medium">
              ⚠️ This share link expires in 7 days. Please download the files you need.
            </p>
            {atRoot && files.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleDownloadAll} disabled={isDownloading}>
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? 'Zipping...' : 'Download All'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {currentFolders.map((f) => (
            <button
              key={`folder-${f.name}`}
              onClick={() => enterFolder(f.name)}
              className="bg-card rounded-lg shadow-sm p-4 flex items-center justify-between hover:bg-accent text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Folder className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{f.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {f.count > 0 ? `${f.count} file${f.count !== 1 ? 's' : ''}` : 'Folder'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}

          {currentFiles.map(({ file, leaf }) => (
            <div key={file.id} className="bg-card rounded-lg shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{leaf}</h3>
                  <p className="text-xs text-muted-foreground">
                    Uploaded: {new Date(file.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleFileDownload(file)}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
