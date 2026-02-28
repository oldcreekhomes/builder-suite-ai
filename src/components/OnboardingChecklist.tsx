import { useState, useEffect } from "react";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Rocket, PartyPopper, CheckCircle2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function StepItem({ step, stepNumber, navigate, onAction }: { step: any; stepNumber: number; navigate: (path: string) => void; onAction?: (action: string) => void }) {
  return (
    <li
      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors h-10 border ${
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
          Step {stepNumber}: {step.label}
        </span>
      </div>
      {step.completed ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 ml-2" />
      ) : (step.link || step.action) ? (
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
      ) : null}
    </li>
  );
}

export function OnboardingChecklist() {
  const { steps, completedCount, totalCount, allComplete, isLoading, dismissed, dismiss, confirmWelcome, confirmNoEmployees } = useOnboardingProgress();
  const { isOwner } = useUserRole();
  const navigate = useNavigate();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const [employeesDialogOpen, setEmployeesDialogOpen] = useState(false);

  // Auto-open welcome dialog when email is verified but welcome not confirmed
  const emailStep = steps.find(s => s.key === "email_verified");
  const welcomeStep = steps.find(s => s.key === "welcome_confirmed");

  useEffect(() => {
    if (
      emailStep?.completed &&
      welcomeStep && !welcomeStep.completed &&
      !allComplete && !dismissed && !isLoading
    ) {
      setWelcomeDialogOpen(true);
    }
  }, [emailStep?.completed, welcomeStep?.completed, allComplete, dismissed, isLoading]);

  if (isLoading) return null;
  if (allComplete && dismissed) return null;

  if (allComplete && !dismissed) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) dismiss(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <PartyPopper className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Congratulations!</DialogTitle>
            <DialogDescription className="text-center">
              You've completed all the setup steps for BuilderSuiteML. You're all set to start managing your projects. If you ever need help, don't hesitate to reach out to our support team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={dismiss}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const percentage = Math.round((completedCount / totalCount) * 100);
  const leftSteps = steps.slice(0, 4);
  const rightSteps = steps.slice(4);

  const handleAction = (action: string) => {
    if (action === "new-project") {
      setNewProjectOpen(true);
    } else if (action === "welcome-dialog") {
      setWelcomeDialogOpen(true);
    } else if (action === "employees-dialog") {
      setEmployeesDialogOpen(true);
    }
  };

  const handleWelcomeConfirm = () => {
    confirmWelcome();
    setWelcomeDialogOpen(false);
  };

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Get Started with BuilderSuiteML Onboarding Process</CardTitle>
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
              {leftSteps.map((step, index) => (
                <StepItem key={step.key} step={step} stepNumber={index + 1} navigate={navigate} onAction={handleAction} />
              ))}
            </ul>
            <ul className="space-y-2">
              {rightSteps.map((step, index) => (
                <StepItem key={step.key} step={step} stepNumber={index + 5} navigate={navigate} onAction={handleAction} />
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />

      <Dialog open={welcomeDialogOpen} onOpenChange={(open) => { if (!open) handleWelcomeConfirm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Welcome to BuilderSuiteML!</DialogTitle>
            <DialogDescription className="text-center text-base leading-relaxed">
              It's imperative that you follow the <strong>8 steps</strong> in our startup workflow. Each step ensures your account is properly configured so you can get the most out of BuilderSuiteML — from cost codes and subcontractors to your first project and team members. Let's get you set up right!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleWelcomeConfirm} className="px-8">
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={employeesDialogOpen} onOpenChange={setEmployeesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Do You Have Employees?</DialogTitle>
            <DialogDescription className="text-center text-base leading-relaxed">
              If you have employees to add, we'll take you to the employee management page. If not, you can skip this step and complete it later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                confirmNoEmployees();
                setEmployeesDialogOpen(false);
              }}
            >
              No, Skip This Step
            </Button>
            <Button
              onClick={() => {
                setEmployeesDialogOpen(false);
                navigate("/settings?tab=employees");
              }}
            >
              Yes, Add Employees
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
