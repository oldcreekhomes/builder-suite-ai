import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function BackgroundBillUpload() {
  const [uploading, setUploading] = useState(false);
  const [started, setStarted] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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

      setStarted(true);
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
            {uploading ? (
              <Upload className="h-4 w-4 mr-2 animate-pulse" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload PDFs
          </span>
        </Button>
      </label>
      {started && (
        <p className="text-sm text-muted-foreground">
          Processing started in background. Use "Refresh results" to see completed bills.
        </p>
      )}
    </div>
  );
}
