import { Download, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileAttachmentProps {
  fileUrl: string;
  index: number;
}

export function FileAttachment({ fileUrl, index }: FileAttachmentProps) {
  const fileName = fileUrl.split('/').pop() || 'file';
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  
  return (
    <div key={index} className="border rounded-lg p-2 bg-white">
      {isImage ? (
        <div className="space-y-2">
          <img 
            src={fileUrl} 
            alt={fileName}
            className="max-w-full h-auto rounded cursor-pointer"
            onClick={() => window.open(fileUrl, '_blank')}
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <ImageIcon className="h-3 w-3" />
              <span>{fileName}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => window.open(fileUrl, '_blank')}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium truncate">{fileName}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => window.open(fileUrl, '_blank')}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}