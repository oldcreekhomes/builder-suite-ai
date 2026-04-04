import { useState } from "react";
import { ApartmentInputs } from "@/lib/apartmentCalculations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import ApartmentInputsTab from "./ApartmentInputsTab";
import ApartmentDashboardTab from "./ApartmentDashboardTab";
import ApartmentIncomeTab from "./ApartmentIncomeTab";
import ApartmentAmortizationTab from "./ApartmentAmortizationTab";

interface Props {
  name: string;
  inputs: ApartmentInputs;
  onSave: (inputs: ApartmentInputs) => void;
  onBack: () => void;
  saving: boolean;
}

export default function ApartmentDetail({ name, inputs: initialInputs, onSave, onBack, saving }: Props) {
  const [inputs, setInputs] = useState<ApartmentInputs>(initialInputs);
  const [dirty, setDirty] = useState(false);

  const handleChange = (newInputs: ApartmentInputs) => {
    setInputs(newInputs);
    setDirty(true);
  };

  const handleSave = () => {
    onSave(inputs);
    setDirty(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-semibold">{name}</h2>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} size="sm">
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Tabs defaultValue="inputs">
        <TabsList>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="income">Income Statement</TabsTrigger>
          <TabsTrigger value="amortization">Amortization Schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="inputs" className="mt-4">
          <ApartmentInputsTab inputs={inputs} onChange={handleChange} />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
          <ApartmentDashboardTab inputs={inputs} />
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          <ApartmentIncomeTab inputs={inputs} />
        </TabsContent>
        <TabsContent value="amortization" className="mt-4">
          <ApartmentAmortizationTab inputs={inputs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
