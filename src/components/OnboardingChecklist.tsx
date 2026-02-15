import { useState } from "react";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NewProjectDialog } from "@/components/NewProjectDialog";

function StepItem({ step, navigate, onAction }: { step: any; navigate: (path: string) => void; onAction?: (action: string) => void }) {
  return (
    <li
      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
        step.completed
          ? "bg-primary/10 text-foreground"
          : "bg-muted/50 text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {step.completed ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary shrink-0">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
        )}
        <span className={step.completed ? "line-through opacity-70" : "font-medium"}>
          {step.label}
        </span>
      </div>
      {!step.completed && (step.link || step.action) && (
        <Button
          size="sm"
          onClick={() => {
            if (step.action && onAction) {
              onAction(step.action);
            } else if (step.link) {
              navigate(step.link);
            }
          }}
          className="ml-2 h-7 px-3 text-xs shrink-0 bg-foreground text-background hover:bg-foreground/80"
        >
          Go <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </li>
  );
}

export function OnboardingChecklist() {
  const { steps, completedCount, totalCount, allComplete, isLoading } = useOnboardingProgress();
  const { isOwner } = useUserRole();
  const navigate = useNavigate();
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  if (isLoading || !isOwner || allComplete) return null;

  const percentage = Math.round((completedCount / totalCount) * 100);
  const leftSteps = steps.slice(0, 4);
  const rightSteps = steps.slice(4);

  const handleAction = (action: string) => {
    if (action === "new-project") {
      setNewProjectOpen(true);
    }
  };

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Get Started with BuilderSuite</CardTitle>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {completedCount} of {totalCount}
            </span>
          </div>
          <Progress value={percentage} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <ul className="space-y-2">
              {leftSteps.map((step) => (
                <StepItem key={step.key} step={step} navigate={navigate} onAction={handleAction} />
              ))}
            </ul>
            <ul className="space-y-2">
              {rightSteps.map((step) => (
                <StepItem key={step.key} step={step} navigate={navigate} onAction={handleAction} />
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
    </>
  );
}
