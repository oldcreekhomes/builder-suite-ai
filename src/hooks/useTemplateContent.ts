import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface TemplateArticle {
  num: number;
  title: string;
  body: string;
}

export const DEFAULT_ARTICLES: TemplateArticle[] = [
  { num: 1, title: "THE WORK", body: "Subcontractor shall furnish all labor, materials, equipment, supervision, transportation and services necessary to complete the Work described in Exhibit A – Scope of Work and the Contract Documents. Work shall comply with project drawings, applicable codes and regulations, and accepted industry standards. Subcontractor shall coordinate its work with Contractor and other trades." },
  { num: 2, title: "CONTRACT DOCUMENTS", body: "The Subcontract Documents consist of the following:\n• Articles\n• Exhibit A – Scope of Work\n• Exhibit B – Project Drawings" },
  { num: 3, title: "CONTRACT SUM", body: "The Contractor agrees to pay the Subcontractor the amounts stated in the Subcontract Summary for full performance of the Work. Payments will be made based on approved progress of the Work in accordance with the Contractor's payment procedures." },
  { num: 4, title: "PAYMENTS", body: "Invoices must be sent to our accounting department at ap@oldcreekhomes.com, and payments will be made within thirty (30) days of receipt. No advance payments or deposits will be made under this Agreement. Subcontractor shall not submit invoices for materials stored on-site or work not yet performed. All work must be one hundred percent (100%) complete and ready for inspection by the bank inspector prior to billing. Subcontractor shall not submit a payment request until the applicable phase or scope of work has passed the bank inspector's inspection and has been approved. Failure to comply with these payment procedures may result in delayed or withheld payment until all conditions are satisfied." },
  { num: 5, title: "PROJECT SCHEDULE", body: "Time is of the essence. Subcontractor shall begin work within seven (7) days of written notice to proceed and maintain sufficient manpower and equipment to meet the project schedule. If Subcontractor falls behind schedule, Subcontractor shall provide additional labor, equipment or overtime at its own cost to recover lost time." },
  { num: 6, title: "CHANGE ORDERS", body: "No changes to the Work shall be performed without prior written authorization from the Contractor's Project Manager. A change order is defined as a material change to the scope, design, or specifications as shown on the approved project drawings and Contract Documents. Work that is required by the drawings, specifications, or industry standard practice does not constitute a change order, regardless of whether Subcontractor included such work in its original estimate. Subcontractor shall not be entitled to additional compensation for work that could have been reasonably anticipated from the Contract Documents. All change order requests must include a detailed description of the proposed change, the reason for the change, and a complete cost breakdown including labor, materials, and any schedule impact. No change order work shall commence until a written change order has been fully executed by both parties. Unauthorized work performed without an approved change order shall be at Subcontractor's sole cost and expense." },
  { num: 7, title: "INSPECTIONS AND COORDINATION", body: "Subcontractor shall coordinate inspections for its work, notify Contractor prior to scheduling inspections, attend inspections, and correct deficiencies identified by inspectors. Costs resulting from failed inspections caused by Subcontractor shall be borne by Subcontractor." },
  { num: 8, title: "PERMITS AND COMPLIANCE", body: "Subcontractor shall obtain required trade permits and comply with all applicable local, state and federal laws including OSHA regulations." },
  { num: 9, title: "INSURANCE", body: "Subcontractor shall maintain, at its own expense, the following minimum insurance coverages for the duration of the Work and shall provide certificates of insurance to Contractor prior to commencing any work:\n\n• Commercial General Liability: $1,000,000 per occurrence / $2,000,000 aggregate\n• Automobile Liability: $1,000,000 combined single limit\n• Workers' Compensation & Employers' Liability: Statutory limits as required by law; $1,000,000 per accident\n\nAll policies shall name the following as Certificate Holder and Additional Insured:\n\nOld Creek Homes, LLC\n228 S Washington Street\nSuite B30 North\nAlexandria, VA 22314\n\nSubcontractor shall provide Contractor with at least thirty (30) days' written notice prior to cancellation or material change of any required policy. Failure to maintain the required insurance coverages shall constitute a material breach of this Agreement and grounds for immediate termination." },
  { num: 10, title: "SAFETY", body: "Subcontractor shall maintain safe working conditions and comply with OSHA and project safety requirements. Required safety equipment including hard hats shall be worn at all times." },
  { num: 11, title: "CLEANUP", body: "Subcontractor shall keep work areas clean and remove debris generated by its work. Contractor may perform cleanup and deduct costs from payments owed if Subcontractor fails to maintain jobsite cleanliness." },
  { num: 12, title: "WARRANTY", body: "Subcontractor warrants that all work shall be free from defects in materials and workmanship for one (1) year following project completion. Subcontractor shall repair defective work at no cost to Contractor." },
  { num: 13, title: "DEFAULT", body: "If Subcontractor fails to perform according to this Agreement, Contractor may provide written notice, supplement the workforce, or terminate the subcontract. Costs resulting from Subcontractor default may be deducted from payments owed." },
  { num: 14, title: "INDEMNIFICATION", body: "Subcontractor shall defend, indemnify and hold harmless Contractor and Owner from claims, damages, losses or expenses arising from Subcontractor's work." },
  { num: 15, title: "TERMINATION", body: "Contractor may terminate this Agreement with ten (10) days written notice. Subcontractor shall be paid for properly completed work to the date of termination." },
];

export const DEFAULT_EXHIBITS = {
  projectDrawings: "CIVIL / SITE SHEETS\nSheet 1: Cover Sheet\nSheet 2-4A: Conditions\nSheet 5: Overall Site Plan\nSheet 6: Overall Grading Plan\nSheet 7: Detailed Site Plan (1 of 4)\nSheet 8: Detailed Site Plan (2 of 4)\nSheet 9: Detailed Site Plan (3 of 4)\nSheet 10: Detailed Site Plan (4 of 4)\nSheet 11: Detailed Grading Plan (1 of 4)\nSheet 12: Detailed Grading Plan (2 of 4)\nSheet 13: Detailed Grading Plan (3 of 4)\nSheet 14: Detailed Grading Plan (4 of 4)\nSheet 15: Detailed Utility Plan (1 of 4)\nSheet 16: Detailed Utility Plan (2 of 4)\nSheet 17: Detailed Utility Plan (3 of 4)\nSheet 18: Detailed Utility Plan (4 of 4)\nSheet 19: Overall Erosion & Sediment Control Plan\nSheet 20: Detailed E&S Plan (1 of 4)\nSheet 21: Detailed E&S Plan (2 of 4)\nSheet 22: Detailed E&S Plan (3 of 4)\nSheet 23: Detailed E&S Plan (4 of 4)\nSheet 24: E&S Details\nSheet 25: E&S Details\nSheet 26: BMP Details\nSheet 27: Construction Details\nSheet 28: Construction Details\nSheet 29: Stormwater Management Computations\nSheet 30: Outfall Analysis (1 of 2)\nSheet 31: Outfall Analysis (2 of 2)\nSheet 32: Storm Drain Profiles\nSheet 33-34: Site Details\nSheet 35-38: Site Details\n\nTREE PRESERVATION SHEETS\nSheet TP-1: Canopy Credit Calculations\nSheet TP-2: Tree Preservation Plan (1 of 2)\nSheet TP-3: Tree Preservation Plan (2 of 2)\nSheet TP-4: Tree Protection Detail & Key Notes\nSheet TP-5: Tree Preservation Table\n\nLANDSCAPE SHEETS\nSheet L0.01: General Notes\nSheet L1.01: Landscape Plan (1 of 4)\nSheet L1.02: Landscape Plan (2 of 4)\nSheet L1.03: Landscape Plan (3 of 4)\nSheet L1.04: Landscape Plan (4 of 4)\nSheet L2.01: Landscape & Furnishings Schedule\nSheet L3.01: Lighting Plan\n\nARCHITECTURAL SHEETS\nSheet 2.00: Color Schemes\nSheet 2.01: Strip Elevations – Units #1–#7 (Front)\nSheet 2.02: Strip Elevations – Units #1–#7 (Rear)\nSheet 2.03: Strip Elevations – Units #1–#7 (Side)\nSheet 2.04: Strip Elevations – Units #8–#12 (Front)\nSheet 2.05: Strip Elevations – Units #8–#12 (Rear)\nSheet 2.06: Strip Elevations – Units #8–#12 (Side)\nSheet 2.07: Strip Elevations – Units #13–#19 (Front)\nSheet 2.08: Strip Elevations – Units #13–#19 (Rear)\nSheet 2.09: Strip Elevations – Units #13–#19 (Side)\nSheet 3.00: FAR Plans – Units #1–#7\nSheet 3.01: Floor Plans – Units #1–#7\nSheet 3.02: FAR Plans – Units #8–#12\nSheet 3.03: Floor Plans – Units #8–#12\nSheet 3.04: FAR Plans – Units #13–#19\nSheet 3.05: Floor Plans – Units #13–#19\nSheet 3.06: Floor Plans – Units #1–#7\nSheet 3.07: Floor Plans – Units #8–#12\nSheet 3.08: Floor Plans – Units #13–#19\nSheet 4.00: Building Sections – Units #1–#7\nSheet 4.01: Building Sections – Units #8–#12\nSheet 4.02: Building Sections – Units #13–#19\nSheet 5.00: Roof Plans\n\nHIGHLIGHTED SCOPE OF WORK\nSheet 9: Final Site Plan\nSheet 12: Utility Plan",
  generalRequirements: "Work Hours: Monday–Friday, 7:00 AM–5:00 PM. Subcontractor shall coordinate daily with Contractor, maintain a clean and safe jobsite, and follow project safety and delivery requirements.",
};

export const useTemplateContent = (templateKey: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["template-content", templateKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_content" as any)
        .select("*")
        .eq("template_key", templateKey)
        .maybeSingle();

      if (error) {
        console.error("Error fetching template content:", error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (content: { articles: TemplateArticle[]; exhibits: typeof DEFAULT_EXHIBITS }) => {
      if (!user) throw new Error("Not authenticated");

      // Get owner_id (either user's own id or their home_builder_id)
      const { data: userData } = await supabase
        .from("users")
        .select("role, home_builder_id")
        .eq("id", user.id)
        .single();

      const ownerId = userData?.role === "owner" ? user.id : userData?.home_builder_id;
      if (!ownerId) throw new Error("Could not determine owner");

      const { error } = await supabase
        .from("template_content" as any)
        .upsert(
          {
            owner_id: ownerId,
            template_key: templateKey,
            content: content,
            updated_by: user.id,
          },
          { onConflict: "owner_id,template_key" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-content", templateKey] });
      toast({ title: "Template Saved" });
    },
    onError: (error) => {
      console.error("Error saving template:", error);
      toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
    },
  });

  const content = (data as any)?.content as { articles: TemplateArticle[]; exhibits: typeof DEFAULT_EXHIBITS } | undefined;

  return {
    articles: content?.articles ?? DEFAULT_ARTICLES,
    exhibits: content?.exhibits ?? DEFAULT_EXHIBITS,
    isLoading,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
};
