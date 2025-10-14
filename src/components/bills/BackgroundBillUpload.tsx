import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface BackgroundBillUploadProps {
  onBatchStart?: (total: number) => void;
  onBatchProgress?: (done: number, total: number) => void;
  onBatchComplete?: () => void;
}

export default function BackgroundBillUpload({
  onBatchStart,
  onBatchProgress,
  onBatchComplete,
}: BackgroundBillUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [started, setStarted] = useState(false);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const startPolling = (ids: string[]) => {
    if (!ids.length) return;

    const inProgress = new Set(["pending", "processing", "extracting"]);
    const total = ids.length;
    onBatchStart?.(total);

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    const startedAt = Date.now();
    const MAX_MS = 10 * 60 * 1000;
    let lastDone = -1; // Track last progress to prevent unnecessary updates

    pollingRef.current = window.setInterval(async () => {
      try {
        const { data, error } = await supabase.from("pending_bill_uploads").select("id,status").in("id", ids);
        if (error) {
          console.error("Polling error", error);
          return;
        }
        const rows = data || [];
        const done = rows.filter((r) => !inProgress.has((r as any).status)).length;

        // Only trigger progress update if the count actually changed
        if (done !== lastDone) {
          onBatchProgress?.(done, total);
          lastDone = done;
        }

        if (done >= total || Date.now() - startedAt > MAX_MS) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          onBatchComplete?.();
        }
      } catch (err) {
        console.error("Polling exception", err);
      }
    }, 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadedIds: string[] = [];

      for (const file of Array.from(files)) {
        const filePath = `pending/${user.id}/${crypto.randomUUID()}-${file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("bill-attachments")
          .upload(filePath, file, { upsert: true, contentType: file.type || "application/pdf" });
        if (uploadError) {
          console.error("Storage upload failed", uploadError);
          continue;
        }

        // Insert DB row
        const { data: uploadRow, error: insertError } = await supabase
          .from("pending_bill_uploads")
          .insert({
            owner_id: user.id,
            uploaded_by: user.id,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type || "application/pdf",
            status: "pending",
          })
          .select()
          .single();
        if (insertError || !uploadRow) {
          console.error("DB insert failed", insertError);
          continue;
        }

        uploadedIds.push(uploadRow.id);

        // Kick off server-side extraction (background only)
        const { error: textractError } = await supabase.functions.invoke("extract-bill-with-textract", {
          body: { pendingUploadId: uploadRow.id },
        });

        if (textractError) {
          // Fallback to AI extraction fully on server
          const { error: aiError } = await supabase.functions.invoke("extract-bill-data", {
            body: { pendingUploadId: uploadRow.id },
          });
          if (aiError) {
            console.error("Extraction start failed", aiError);
          }
        }
      }

      if (uploadedIds.length > 0) {
        startPolling(uploadedIds);
        setStarted(true);
      }
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setUploading(false);
      // allow same file selection again
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        id="bg-pdf-upload"
        className="hidden"
        accept="application/pdf,.pdf"
        multiple
        onChange={handleFileUpload}
        disabled={uploading}
      />
      <label htmlFor="bg-pdf-upload">
        <Button disabled={uploading} asChild>
          <span>
            {uploading ? <Upload className="h-4 w-4 mr-2 animate-pulse" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload PDFs
          </span>
        </Button>
      </label>
      {started && (
        <p className="text-sm text-muted-foreground">
          Processing started in background. Results will appear automatically when ready.
        </p>
      )}
    </div>
  );
}
