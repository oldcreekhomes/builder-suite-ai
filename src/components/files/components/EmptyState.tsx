
import React from "react";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

export function EmptyState() {
  return (
    <Card className="p-8 text-center">
      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No files found</h3>
      <p className="text-gray-600">Upload files to get started</p>
    </Card>
  );
}
