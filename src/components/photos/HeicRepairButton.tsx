import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Wrench, CheckCircle2 } from "lucide-react";
import { useHeicRepair } from "@/hooks/useHeicRepair";

interface HeicRepairButtonProps {
  projectId?: string;
  onRepairComplete?: () => void;
}

export function HeicRepairButton({ projectId, onRepairComplete }: HeicRepairButtonProps) {
  const { isRepairing, repairProgress, repairedCount, repairAllHeicFiles } = useHeicRepair();

  const handleRepair = async () => {
    await repairAllHeicFiles(projectId);
    onRepairComplete?.();
  };

  if (isRepairing) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Wrench className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-sm font-medium">Repairing HEIC files...</span>
          </div>
          <Progress value={repairProgress} className="h-2" />
          <div className="text-xs text-gray-600">
            Converted {repairedCount} files ({Math.round(repairProgress)}% complete)
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Button 
      onClick={handleRepair}
      variant="outline" 
      size="sm"
      className="gap-2"
    >
      <Wrench className="h-4 w-4" />
      Repair HEIC Files
    </Button>
  );
}