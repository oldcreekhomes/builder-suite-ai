import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardToggleProps {
  value: "project-manager" | "owner";
  onChange: (value: "project-manager" | "owner") => void;
}

export function DashboardToggle({ value, onChange }: DashboardToggleProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as "project-manager" | "owner")}>
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="project-manager">Project Manager</TabsTrigger>
        <TabsTrigger value="owner">Owner</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
