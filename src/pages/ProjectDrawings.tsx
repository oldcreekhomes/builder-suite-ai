import { useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { ensurePdfWorker } from "@/lib/pdfConfig";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Loader2, Trash2, ExternalLink, FileText, FolderOpen } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { sheetKey, disciplineFor, nextVersionFor } from "@/lib/drawingSheets";

const db = supabase as any;
const BUCKET = "project-files";
const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

type Sheet = { id: string; sheet_number: string; sheet_key: string; title: string | null; discipline: string | null; current_version: number };
type Version = { id: string; sheet_id: string; version_number: number; file_path: string; image_path: string | null; set_name: string | null; uploaded_at: string; uploaded_by: string | null };
type Pending = { pageIndex: number; pdfBytes: Uint8Array; imagePath: string; sheetNumber: string; title: string; reading: boolean };

const MAX_PREVIEW_PX = 1600;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`Timed out: ${label}`)), ms);
    p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
  });
}

async function renderPage(pdf: any, n: number): Promise<Blob> {
  const page = await pdf.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, MAX_PREVIEW_PX / Math.max(base.width, base.height));
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
  try {
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp, canvas } as any).promise;
    return await new Promise((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("Could not make preview"))), "image/jpeg", 0.8));
  } finally {
    canvas.width = 0; canvas.height = 0;
    page.cleanup();
  }
}

export default function ProjectDrawings() {
  const { projectId = "" } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [setName, setSetName] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);
  const [viewVersion, setViewVersion] = useState<Version | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["drawings", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const [s, v] = await Promise.all([
        db.from("drawing_sheets").select("*").eq("project_id", projectId),
        db.from("drawing_sheet_versions").select("*").eq("project_id", projectId).order("version_number", { ascending: false }),
      ]);
      if (s.error) throw s.error; if (v.error) throw v.error;
      return { sheets: s.data as Sheet[], versions: v.data as Version[] };
    },
  });
  const sheets = data?.sheets ?? [];
  const versions = data?.versions ?? [];
  const currentByKey = useMemo(() => new Map(sheets.map((s) => [s.sheet_key, s.current_version])), [sheets]);
  const versionsOf = (id: string) => versions.filter((v) => v.sheet_id === id);
  const currentOf = (s: Sheet) => versionsOf(s.id)[0];

  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const list = sheets
      .filter((s) => !q || s.sheet_number.toLowerCase().includes(q) || (s.title || "").toLowerCase().includes(q))
      .sort((a, b) => a.sheet_number.localeCompare(b.sheet_number, undefined, { numeric: true }));
    const g = new Map<string, Sheet[]>();
    list.forEach((s) => { const d = s.discipline || disciplineFor(s.sheet_number); g.set(d, [...(g.get(d) || []), s]); });
    return [...g.entries()];
  }, [sheets, search]);

  const [progress, setProgress] = useState("");

  const readTitleBlocks = async (items: Pending[]) => {
    const queue = [...items];
    const worker = async () => {
      while (queue.length) {
        const it = queue.shift()!;
        try {
          const { data } = await supabase.functions.invoke("detect-sheet-info", { body: { file_path: it.imagePath } });
          setPending((p) => p.map((x) => x.imagePath === it.imagePath
            ? { ...x, reading: false, sheetNumber: x.sheetNumber || data?.sheet_number || "", title: x.title || data?.sheet_title || "" } : x));
        } catch {
          setPending((p) => p.map((x) => x.imagePath === it.imagePath ? { ...x, reading: false } : x));
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  };

  const cancelRef = useRef(false);

  const handleFiles = async (input: File[]) => {
    const files = input
      .filter((f) => /\.(pdf|png|jpe?g)$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!files.length) { toast({ title: "No drawings found", description: "Drop PDF, PNG or JPG files.", variant: "destructive" }); return; }
    setPreparing(true);
    cancelRef.current = false;
    ensurePdfWorker();
    const batch = crypto.randomUUID();
    const failed: string[] = [];
    setSetName(`${files.length === 1 ? files[0].name.replace(/\.\w+$/, "") : "Drawing set"} ${format(new Date(), "MM/dd/yyyy")}`);
    setPending([]);
    setReviewOpen(true);

    // Count pages first
    const pageCounts: number[] = [];
    for (const f of files) {
      if (/\.pdf$/i.test(f.name)) {
        try { pageCounts.push((await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })).getPageCount()); }
        catch { pageCounts.push(0); }
      } else pageCounts.push(1);
    }
    const total = pageCounts.reduce((a, b) => a + b, 0);
    toast({ title: `Found ${files.length} file${files.length === 1 ? "" : "s"}, ${total} page${total === 1 ? "" : "s"}` });

    let n = 0;
    const add = (it: Pending) => { setPending((p) => [...p, it]); readTitleBlocks([it]); };
    for (const file of files) {
      if (cancelRef.current) break;
      let pdf: any = null;
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (/\.pdf$/i.test(file.name)) {
          const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
          pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
          for (let i = 0; i < src.getPageCount(); i++) {
            if (cancelRef.current) break;
            n++; setProgress(`Preparing ${n} of ${total}...`);
            const idx = n;
            try {
              await withTimeout((async () => {
                const one = await PDFDocument.create();
                const [pg] = await one.copyPages(src, [i]);
                one.addPage(pg);
                const pdfBytes = await one.save();
                const img = await renderPage(pdf, i + 1);
                const imagePath = `drawings/${projectId}/${batch}/${idx}.jpg`;
                const up = await supabase.storage.from(BUCKET).upload(imagePath, img, { contentType: "image/jpeg" });
                if (up.error) throw up.error;
                add({ pageIndex: idx - 1, pdfBytes, imagePath, sheetNumber: "", title: "", reading: true });
              })(), 60000, `${file.name} page ${i + 1}`);
            } catch (e) {
              console.error("Drawing page failed", file.name, "page", i + 1, e);
              failed.push(`${file.name}, page ${i + 1}`);
            }
          }
        } else {
          n++; setProgress(`Preparing ${n} of ${total}...`);
          const idx = n;
          await withTimeout((async () => {
            const isPng = /\.png$/i.test(file.name);
            const one = await PDFDocument.create();
            const im = isPng ? await one.embedPng(bytes) : await one.embedJpg(bytes);
            one.addPage([im.width, im.height]).drawImage(im, { x: 0, y: 0, width: im.width, height: im.height });
            const pdfBytes = await one.save();
            const imagePath = `drawings/${projectId}/${batch}/${idx}.${isPng ? "png" : "jpg"}`;
            const up = await supabase.storage.from(BUCKET).upload(imagePath, file, { contentType: file.type || (isPng ? "image/png" : "image/jpeg") });
            if (up.error) throw up.error;
            add({ pageIndex: idx - 1, pdfBytes, imagePath, sheetNumber: "", title: "", reading: true });
          })(), 60000, file.name);
        }
      } catch (e) {
        console.error("Drawing file failed", file.name, e);
        failed.push(file.name);
      } finally {
        try { await pdf?.destroy(); } catch { /* ignore */ }
      }
    }
    setPreparing(false); setProgress("");
    if (failed.length) toast({ title: `Couldn't read ${failed.length} page${failed.length === 1 ? "" : "s"}`, description: failed.join("; "), variant: "destructive" });
  };

  useEffect(() => {
    if (!preparing) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [preparing]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: true,
    disabled: preparing,
    accept: { "application/pdf": [".pdf"], "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
    onDrop: (files) => { if (files.length) handleFiles(files); },
  });
  const folderRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    const missing = pending.filter((p) => !sheetKey(p.sheetNumber));
    if (missing.length) { toast({ title: "Every page needs a sheet number", description: `Page ${missing.map((m) => m.pageIndex + 1).join(", ")}`, variant: "destructive" }); return; }
    setSaving(true);
    try {
      for (const p of pending) {
        const filePath = p.imagePath.replace(/\.(png|jpg)$/, ".pdf");
        const up = await supabase.storage.from(BUCKET).upload(filePath, new Blob([p.pdfBytes as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf" });
        if (up.error) throw up.error;
        const { error } = await db.rpc("add_drawing_version", {
          _project_id: projectId, _sheet_number: p.sheetNumber, _title: p.title,
          _discipline: disciplineFor(p.sheetNumber), _file_path: filePath, _image_path: p.imagePath,
          _set_name: setName, _page_index: p.pageIndex,
        });
        if (error) throw error;
      }
      toast({ title: `Saved ${pending.length} sheet${pending.length === 1 ? "" : "s"}` });
      setPending([]); setReviewOpen(false);
      qc.invalidateQueries({ queryKey: ["drawings", projectId] });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const cancelReview = async () => {
    cancelRef.current = true;
    const paths = pending.map((p) => p.imagePath);
    setPending([]); setReviewOpen(false);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  };

  const deleteVersion = async (v: Version) => {
    if (!confirm(`Delete version ${v.version_number}?`)) return;
    const rest = versionsOf(v.sheet_id).filter((x) => x.id !== v.id);
    const { error } = await db.from("drawing_sheet_versions").delete().eq("id", v.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    if (rest.length === 0) { await db.from("drawing_sheets").delete().eq("id", v.sheet_id); setOpenSheet(null); }
    else await db.from("drawing_sheets").update({ current_version: Math.max(...rest.map((r) => r.version_number)) }).eq("id", v.sheet_id);
    await supabase.storage.from(BUCKET).remove([v.file_path, v.image_path].filter(Boolean) as string[]);
    setViewVersion(null);
    qc.invalidateQueries({ queryKey: ["drawings", projectId] });
  };

  const batchTags = pending.map((p, i) => {
    if (!sheetKey(p.sheetNumber)) return null;
    return nextVersionFor(p.sheetNumber, currentByKey, pending.slice(0, i).map((x) => x.sheetNumber));
  });

  const shown = viewVersion ?? (openSheet ? currentOf(openSheet) : undefined);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader
            title="Drawings"
            subtitle="One place for every sheet, always on the latest version."
            projectId={projectId}
            headerAction={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={preparing}>
                  <FileText className="h-4 w-4 mr-2" />Choose Drawings
                </Button>
                <Button variant="outline" size="sm" onClick={() => folderRef.current?.click()} disabled={preparing}>
                  <FolderOpen className="h-4 w-4 mr-2" />Choose Folder
                </Button>
              </div>
            }
          />
          <input ref={fileRef} type="file" multiple accept="application/pdf,image/png,image/jpeg" className="hidden"
            onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) handleFiles(f); e.target.value = ""; }} />
          <input ref={folderRef} type="file" multiple className="hidden" {...({ webkitdirectory: "", directory: "" } as any)}
            onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) handleFiles(f); e.target.value = ""; }} />
          <div className="p-6 space-y-4">
            <Card>
              <div {...getRootProps()} className={`p-8 text-center cursor-pointer ${isDragActive ? "bg-muted" : ""}`}>
                <input {...getInputProps()} />
                {preparing ? <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                  : <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
                <h3 className="text-lg font-semibold mb-2">
                  {preparing ? progress || "Preparing..." : isDragActive ? "Drop drawings here" : "Upload drawings by dragging and dropping here"}
                </h3>
                <p className="text-muted-foreground mb-4">Drag and drop drawings or folders here, or use the buttons in the header to select files.</p>
                <p className="text-sm text-muted-foreground">Supports: PDF, PNG, JPG</p>
              </div>
            </Card>
            <Input placeholder="Search sheet number or title" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> :
              grouped.length === 0 ? <p className="text-sm text-muted-foreground">No drawings yet. Upload a PDF drawing set to get started.</p> :
              grouped.map(([disc, list]) => (
                <div key={disc} className="space-y-2">
                  <h3 className="text-sm font-semibold">{disc}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {list.map((s) => { const c = currentOf(s); return (
                      <button key={s.id} onClick={() => { setOpenSheet(s); setViewVersion(null); }}
                        className="text-left border rounded-md overflow-hidden hover:border-foreground transition-colors bg-card">
                        <div className="aspect-[4/3] bg-muted">{c?.image_path && <img src={publicUrl(c.image_path)} alt={s.sheet_number} className="w-full h-full object-contain" loading="lazy" />}</div>
                        <div className="p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{s.sheet_number}</span>
                            <Badge variant="secondary">V{s.current_version}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate" title={s.title || ""}>{s.title || "-"}</p>
                        </div>
                      </button>); })}
                  </div>
                </div>
              ))}
          </div>
        </SidebarInset>
      </div>

      <Dialog open={reviewOpen} onOpenChange={(o) => { if (!o && !saving) cancelReview(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review sheets before saving</DialogTitle></DialogHeader>
          {preparing && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{progress || "Preparing..."}</p>}
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Set name</span>
            <Input value={setName} onChange={(e) => setSetName(e.target.value)} />
          </div>
          <Table className="table-fixed">
            <TableHeader><TableRow>
              <TableHead className="w-24">Page</TableHead><TableHead className="w-36">Sheet #</TableHead>
              <TableHead>Title</TableHead><TableHead className="w-40">Will save as</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pending.map((p, i) => (
                <TableRow key={p.pageIndex}>
                  <TableCell><img src={publicUrl(p.imagePath)} alt="" className="h-12 w-16 object-contain bg-muted rounded" /></TableCell>
                  <TableCell><Input value={p.sheetNumber} placeholder={p.reading ? "Reading..." : "e.g. A-101"}
                    onChange={(e) => setPending((x) => x.map((y) => y.pageIndex === p.pageIndex ? { ...y, sheetNumber: e.target.value } : y))} /></TableCell>
                  <TableCell><Input value={p.title} placeholder={p.reading ? "Reading..." : "Sheet title"}
                    onChange={(e) => setPending((x) => x.map((y) => y.pageIndex === p.pageIndex ? { ...y, title: e.target.value } : y))} /></TableCell>
                  <TableCell>{batchTags[i] == null ? <span className="text-xs text-destructive">Needs sheet #</span>
                    : batchTags[i] === 1 ? <Badge>New</Badge> : <Badge variant="secondary">Version {batchTags[i]}</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={cancelReview} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving || preparing || pending.length === 0 || pending.some((p) => p.reading)}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save {pending.length} sheets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openSheet} onOpenChange={(o) => { if (!o) { setOpenSheet(null); setViewVersion(null); } }}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
          {openSheet && (<>
            <DialogHeader><DialogTitle>{openSheet.sheet_number} {openSheet.title ? `- ${openSheet.title}` : ""}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-[1fr_260px] gap-4">
              <div className="bg-muted rounded min-h-[400px] flex items-center justify-center">
                {shown?.image_path && <img src={publicUrl(shown.image_path)} alt="" className="max-h-[75vh] object-contain" />}
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Version history</h4>
                {versionsOf(openSheet.id).map((v) => (
                  <div key={v.id} className={`border rounded p-2 text-xs cursor-pointer ${shown?.id === v.id ? "border-foreground" : ""}`} onClick={() => setViewVersion(v)}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Version {v.version_number}{v.version_number === openSheet.current_version ? " (current)" : ""}</span>
                      <div className="flex gap-1">
                        <a href={publicUrl(v.file_path)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Open PDF"><ExternalLink className="h-3.5 w-3.5" /></a>
                        <button onClick={(e) => { e.stopPropagation(); deleteVersion(v); }} title="Delete version"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </div>
                    <div className="text-muted-foreground">{format(new Date(v.uploaded_at), "MM/dd/yyyy")}</div>
                    {v.set_name && <div className="text-muted-foreground truncate" title={v.set_name}>{v.set_name}</div>}
                  </div>
                ))}
              </div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
