import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTemplateContent } from "@/hooks/useTemplateContent";

interface ContractFields {
  contractorName: string;
  subcontractorName: string;
  projectName: string;
  contractAmount: string;
  alternateName: string;
  alternateAmount: string;
  startDate: string;
  contractorPM: string;
  subcontractorContact: string;
  contractorSignerName: string;
  contractorSignerTitle: string;
  subcontractorSignerName: string;
  subcontractorSignerTitle: string;
  scopeOfWork: string;
  projectDrawings: string;
  generalRequirements: string;
}

const SubcontractorContractForm = () => {
  const { articles, exhibits, isLoading } = useTemplateContent("subcontractor-contract");

  const [fields, setFields] = useState<ContractFields>({
    contractorName: "",
    subcontractorName: "",
    projectName: "",
    contractAmount: "",
    alternateName: "",
    alternateAmount: "",
    startDate: "",
    contractorPM: "",
    subcontractorContact: "",
    contractorSignerName: "",
    contractorSignerTitle: "",
    subcontractorSignerName: "",
    subcontractorSignerTitle: "",
    scopeOfWork: "",
    projectDrawings: exhibits.projectDrawings,
    generalRequirements: exhibits.generalRequirements,
  });

  const update = (key: keyof ContractFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const Field = ({
    label,
    fieldKey,
    className = "",
  }: {
    label: string;
    fieldKey: keyof ContractFields;
    className?: string;
  }) => (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="text-sm font-medium whitespace-nowrap">{label}:</span>
      <Input
        value={fields[fieldKey]}
        onChange={(e) => update(fieldKey, e.target.value)}
        className="h-8 text-sm flex-1 border-b border-t-0 border-x-0 rounded-none bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Enter value"
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="print-container bg-background text-foreground max-w-[8.5in] mx-auto border rounded-lg shadow-sm p-12">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3 mx-auto" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="print-container bg-background text-foreground max-w-[8.5in] mx-auto border rounded-lg shadow-sm">
      <div className="p-8 md:p-12 space-y-6 text-sm leading-relaxed">
        {/* Header */}
        <div className="text-center space-y-1 border-b pb-6">
          <h1 className="text-xl font-bold tracking-wide text-foreground">SUBCONTRACT AGREEMENT</h1>
        </div>

        {/* Summary */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">SUBCONTRACT SUMMARY</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            <Field label="Contractor" fieldKey="contractorName" />
            <Field label="Subcontractor" fieldKey="subcontractorName" />
            <Field label="Project" fieldKey="projectName" />
            <Field label="Contract Amount" fieldKey="contractAmount" />
            <Field label="Alternate" fieldKey="alternateName" />
            <Field label="Alternate Amount" fieldKey="alternateAmount" />
            <Field label="Start Date" fieldKey="startDate" />
          </div>
        </section>

        {/* Key Contacts */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground">KEY CONTACTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            <Field label="Contractor PM" fieldKey="contractorPM" />
            <Field label="Subcontractor Contact" fieldKey="subcontractorContact" />
          </div>
        </section>

        {/* Articles — loaded from Supabase or defaults */}
        <section className="space-y-4">
          {articles.map((article) => (
            <div key={article.num} className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                ARTICLE {article.num} – {article.title}
              </h3>
              <div className="text-sm text-muted-foreground whitespace-pre-line">
                {article.body}
              </div>
            </div>
          ))}
        </section>

        {/* Signatures */}
        <section className="space-y-6 print-page-break pt-4">
          <h2 className="text-base font-bold text-foreground">SIGNATURES</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="font-semibold text-foreground">CONTRACTOR</p>
              <div className="border-b border-muted-foreground/40 pt-8" />
              <p className="text-xs text-muted-foreground">Signature</p>
              <Field label="Name" fieldKey="contractorSignerName" />
              <Field label="Title" fieldKey="contractorSignerTitle" />
            </div>

            <div className="space-y-4">
              <p className="font-semibold text-foreground">SUBCONTRACTOR</p>
              <div className="border-b border-muted-foreground/40 pt-8" />
              <p className="text-xs text-muted-foreground">Signature</p>
              <Field label="Name" fieldKey="subcontractorSignerName" />
              <Field label="Title" fieldKey="subcontractorSignerTitle" />
            </div>
          </div>
        </section>

        {/* Exhibits */}
        <section className="space-y-6 print-page-break pt-4">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground">EXHIBIT A – SCOPE OF WORK</h2>
            <Textarea
              value={fields.scopeOfWork}
              onChange={(e) => update("scopeOfWork", e.target.value)}
              placeholder="Describe the scope of work..."
              className="min-h-[120px] text-sm"
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground">EXHIBIT B – PROJECT DRAWINGS</h2>
            <Textarea
              value={fields.projectDrawings}
              onChange={(e) => update("projectDrawings", e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground">EXHIBIT C – GENERAL REQUIREMENTS</h2>
            <Textarea
              value={fields.generalRequirements}
              onChange={(e) => update("generalRequirements", e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default SubcontractorContractForm;
