import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    projectDrawings: "Subcontractor shall perform work in accordance with approved civil, landscape and architectural drawings listed in the project drawing schedule.",
    generalRequirements: "Work Hours: Monday–Friday, 7:00 AM–5:00 PM. Subcontractor shall coordinate daily with Contractor, maintain a clean and safe jobsite, and follow project safety and delivery requirements.",
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

        {/* Articles */}
        <section className="space-y-4">
          <Article num={1} title="THE WORK">
            Subcontractor shall furnish all labor, materials, equipment, supervision, transportation and services necessary to complete the Work described in Exhibit A – Scope of Work and the Contract Documents. Work shall comply with project drawings, applicable codes and regulations, and accepted industry standards. Subcontractor shall coordinate its work with Contractor and other trades.
          </Article>

          <Article num={2} title="CONTRACT DOCUMENTS">
            <p className="mb-2">The Subcontract Documents consist of the following:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>This Agreement</li>
              <li>Exhibit A – Scope of Work</li>
              <li>Exhibit B – Project Drawings</li>
              <li>Exhibit C – General Requirements</li>
              <li>Written Change Orders issued by Contractor</li>
            </ul>
          </Article>

          <Article num={3} title="CONTRACT SUM">
            The Contractor agrees to pay the Subcontractor the amounts stated in the Subcontract Summary for full performance of the Work. Payments will be made based on approved progress of the Work in accordance with the Contractor's payment procedures.
          </Article>

          <Article num={4} title="PAYMENTS (PAY-IF-PAID)">
            Payment to Subcontractor is expressly conditioned upon Contractor receiving payment from the Owner for Subcontractor's Work. Payment by Owner to Contractor for Subcontractor work is a condition precedent to payment to Subcontractor.
          </Article>

          <Article num={5} title="PROJECT SCHEDULE">
            Time is of the essence. Subcontractor shall begin work within seven (7) days of written notice to proceed and maintain sufficient manpower and equipment to meet the project schedule. If Subcontractor falls behind schedule, Subcontractor shall provide additional labor, equipment or overtime at its own cost to recover lost time.
          </Article>

          <Article num={6} title="CHANGE ORDERS">
            Changes to the Work must be authorized in writing by the Contractor's Project Manager prior to performing the work.
          </Article>

          <Article num={7} title="INSPECTIONS AND COORDINATION">
            Subcontractor shall coordinate inspections for its work, notify Contractor prior to scheduling inspections, attend inspections, and correct deficiencies identified by inspectors. Costs resulting from failed inspections caused by Subcontractor shall be borne by Subcontractor.
          </Article>

          <Article num={8} title="PERMITS AND COMPLIANCE">
            Subcontractor shall obtain required trade permits and comply with all applicable local, state and federal laws including OSHA regulations.
          </Article>

          <Article num={9} title="SAFETY">
            Subcontractor shall maintain safe working conditions and comply with OSHA and project safety requirements. Required safety equipment including hard hats shall be worn at all times.
          </Article>

          <Article num={10} title="CLEANUP">
            Subcontractor shall keep work areas clean and remove debris generated by its work. Contractor may perform cleanup and deduct costs from payments owed if Subcontractor fails to maintain jobsite cleanliness.
          </Article>

          <Article num={11} title="WARRANTY">
            Subcontractor warrants that all work shall be free from defects in materials and workmanship for one (1) year following project completion. Subcontractor shall repair defective work at no cost to Contractor.
          </Article>

          <Article num={12} title="DEFAULT">
            If Subcontractor fails to perform according to this Agreement, Contractor may provide written notice, supplement the workforce, or terminate the subcontract. Costs resulting from Subcontractor default may be deducted from payments owed.
          </Article>

          <Article num={13} title="INDEMNIFICATION">
            Subcontractor shall defend, indemnify and hold harmless Contractor and Owner from claims, damages, losses or expenses arising from Subcontractor's work.
          </Article>

          <Article num={14} title="TERMINATION">
            Contractor may terminate this Agreement with ten (10) days written notice. Subcontractor shall be paid for properly completed work to the date of termination.
          </Article>
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

const Article = ({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <h3 className="text-sm font-bold text-foreground">
      ARTICLE {num} – {title}
    </h3>
    <div className="text-sm text-muted-foreground">{children}</div>
  </div>
);

export default SubcontractorContractForm;
