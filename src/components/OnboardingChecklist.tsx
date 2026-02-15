import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function OnboardingChecklist() {
  const { steps, completedCount, totalCount, allComplete, isLoading } = useOnboardingProgress();
  const { isOwner } = useUserRole();
  const navigate = useNavigate();

  // Only show for owners with incomplete onboarding
  if (isLoading || !isOwner || allComplete) return null;

  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
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
        <ul className="space-y-2">
          {steps.map((step) => (
            <li
              key={step.key}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                step.completed
                  ? "bg-primary/10 text-foreground"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {step.completed ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}
                <span className={step.completed ? "line-through opacity-70" : "font-medium"}>
                  {step.label}
                </span>
              </div>
              {!step.completed && step.link && (
                <button
                  onClick={() => navigate(step.link!)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Go <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
