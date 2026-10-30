import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, FileText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_STATUS_GROUPS } from "@/constants/projectStatusGroups";
import { batchedIn } from "@/lib/supabasePaginate";
import { daysLate, isCountableBill, isLateBill, isRejectedBill, todayLocalStr } from "@/lib/billIssues";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IssueBill {
  id: string;
  project_id: string;
  status: string;
  due_date: string | null;
  bill_date: string | null;
  reference_number: string | null;
  total_amount: number | null;
  notes: string | null;
  vendor: { company_name: string } | null;
  attachments: { file_path: string; file_name: string }[];
  late: boolean;
  rejected: boolean;
  days: number;
}

const getStreetAddress = (address?: string) => {
  if (!address) return "No address";
  const beforeComma = address.split(",")[0].trim();
  const m = beforeComma.match(
    /^(.+?\b(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Circle|Cir|Terrace|Ter|Highway|Hwy)\b(?:\s+(?:Unit|Apt|Suite|#)\s*[\w-]+)?)(?:\s+.*)?$/i
  );
  return m?.[1] || beforeComma;
};

const initials = (m?: { first_name: string; last_name: string } | null) =>
  m ? `${m.first_name.trim().charAt(0)}${m.last_name.trim().charAt(0)}`.toUpperCase() : null;

const fmtDate = (d: string | null) => (d ? format(parseISO(String(d).slice(0, 10)), "MMM d, yyyy") : "-");
const fmtMoney = (n: number | null) =>
  (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function useBillIssues(projectIds: string[]) {
  return useQuery({
    queryKey: ["bill-issues-by-project", projectIds],
    enabled: projectIds.length > 0,
    queryFn: async (): Promise<IssueBill[]> => {
      const today = todayLocalStr();
      const rows: any[] = await batchedIn((ids) => supabase
          .from("bills")
          .select("id, project_id, status, terms, due_date, bill_date, reference_number, total_amount, notes, is_reversal, archived_at, vendor:companies!bills_vendor_id_fkey(company_name)")
          .in("project_id", ids)
          .in("status", ["draft", "posted", "void"]), projectIds);
      const issues = rows
        .filter((b) => isCountableBill(b))
        .map((b) => ({ ...b, late: isLateBill(b, today), rejected: isRejectedBill(b), days: daysLate(b.due_date, today), attachments: [] }))
        .filter((b) => b.late || b.rejected) as IssueBill[];

      if (issues.length) {
        const atts: any[] = await batchedIn((ids) => supabase.from("bill_attachments").select("bill_id, file_path, file_name").in("bill_id", ids), issues.map((b) => b.id));
        const byBill = new Map<string, IssueBill["attachments"]>();
        atts.forEach((a) => {
          if (!byBill.has(a.bill_id)) byBill.set(a.bill_id, []);
          byBill.get(a.bill_id)!.push({ file_path: a.file_path, file_name: a.file_name });
        });
        issues.forEach((b) => (b.attachments = byBill.get(b.id) || []));
      }
      return issues;
    },
  });
}

export function AccountantBillIssuesTable() {
  const navigate = useNavigate();
  const { openBillAttachment } = useUniversalFilePreviewContext();
  const { data: projects = [] } = useProjects();
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const candidates = projects.filter((p) => p.status !== "Template" && p.status !== "Permanently Closed");
  const { data: bills = [], isLoading } = useBillIssues(candidates.map((p) => p.id));

  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const byProject = new Map<string, IssueBill[]>();
    bills.forEach((b) => {
      if (!byProject.has(b.project_id)) byProject.set(b.project_id, []);
      byProject.get(b.project_id)!.push(b);
    });
    const rows = candidates
      .filter((p) => byProject.has(p.id))
      .map((p) => {
        let list = byProject.get(p.id)!;
        let matchedBills = false;
        const mgr = p.accounting_manager_user ? `${p.accounting_manager_user.first_name} ${p.accounting_manager_user.last_name}` : "";
        if (q && !(p.address || "").toLowerCase().includes(q) && !mgr.toLowerCase().includes(q)) {
          list = list.filter((b) => `${b.vendor?.company_name || ""} ${b.reference_number || ""} ${b.notes || ""}`.toLowerCase().includes(q));
          matchedBills = true;
        }
        list = [...list].sort((a, b) => Number(b.rejected) - Number(a.rejected) || b.days - a.days);
        return { project: p, bills: list, autoOpen: matchedBills };
      })
      .filter((r) => r.bills.length > 0);
    return PROJECT_STATUS_GROUPS.map((g) => ({
      ...g,
      rows: rows.filter((r) => (r.project.status || "In Design") === g.status),
    })).filter((g) => g.rows.length > 0);
  }, [bills, candidates, searchQuery]);

  const all = groups.flatMap((g) => g.rows.flatMap((r) => r.bills));
  const totalLate = all.filter((b) => b.late).length;
  const totalRejected = all.filter((b) => b.rejected).length;

  const goToBill = (projectId: string, b: IssueBill) =>
    navigate(`/project/${projectId}/accounting/bills/approve?tab=${b.rejected ? "rejected" : b.status === "posted" ? "approve" : "review"}`);

  const COLS = 10;

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Bill Issues</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>
        </div>
      </div>
      <Table className="table-fixed table-compact [&_th]:px-2 [&_td]:px-2">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[20%]">Address / Vendor</TableHead>
            <TableHead className="w-[7%] text-center">Manager</TableHead>
            <TableHead className="w-[11%]">Invoice #</TableHead>
            <TableHead className="w-[9%]">Bill Date</TableHead>
            <TableHead className="w-[9%]">Due Date</TableHead>
            <TableHead className="w-[8%] text-center">Late</TableHead>
            <TableHead className="w-[8%] text-center">Rejected</TableHead>
            <TableHead className="w-[14%]">Why</TableHead>
            <TableHead className="w-[9%]">Amount</TableHead>
            <TableHead className="w-[5%] text-center">File</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLS} className="text-center text-muted-foreground !py-8">
                {isLoading ? "Loading..." : "No late or rejected bills"}
              </TableCell>
            </TableRow>
          ) : (
            groups.flatMap((group) => [
              <TableRow key={`g-${group.status}`} className="bg-muted/30 hover:bg-muted/30">
                <TableCell colSpan={COLS} className="py-1">
                  <Badge variant="outline" className={`${group.color} border-0`}>{group.status}</Badge>
                </TableCell>
              </TableRow>,
              ...group.rows.flatMap(({ project, bills: list, autoOpen }) => {
                const isOpen = autoOpen || expanded.has(project.id);
                const late = list.filter((b) => b.late).length;
                const rej = list.filter((b) => b.rejected).length;
                const mi = initials(project.accounting_manager_user);
                return [
                  <TableRow key={project.id} className="cursor-pointer" onClick={() => toggle(project.id)}>
                    <TableCell className="font-medium truncate">
                      <span className="inline-flex items-center gap-1">
                        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        {getStreetAddress(project.address)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {mi ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">{mi}</span> : "-"}
                    </TableCell>
                    <TableCell colSpan={3} />
                    <TableCell className="text-center">{late ? <Badge variant="destructive">{late}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="text-center">{rej ? <Badge variant="destructive">{rej}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>,
                  ...(isOpen ? list : []).map((b) => (
                    <TableRow key={b.id} className="cursor-pointer text-muted-foreground" onClick={() => goToBill(project.id, b)}>
                      <TableCell className="pl-8 truncate">{b.vendor?.company_name || "No vendor"}</TableCell>
                      <TableCell />
                      <TableCell className="truncate">{b.reference_number || "-"}</TableCell>
                      <TableCell>{fmtDate(b.bill_date)}</TableCell>
                      <TableCell>{fmtDate(b.due_date)}</TableCell>
                      <TableCell className="text-center">
                        {b.late ? <span className="text-destructive font-medium">{b.days} {b.days === 1 ? "day" : "days"}</span> : "-"}
                      </TableCell>
                      <TableCell className="text-center">{b.rejected ? <span className="text-destructive font-medium">Rejected</span> : "-"}</TableCell>
                      <TableCell className="truncate">
                        {b.notes ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild><span className="truncate block">{b.notes}</span></TooltipTrigger>
                              <TooltipContent className="max-w-sm whitespace-pre-wrap">{b.notes}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : b.late ? "Past due" : "-"}
                      </TableCell>
                      <TableCell>{fmtMoney(b.total_amount)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          {b.attachments.map((a) => (
                            <button
                              key={a.file_path}
                              title={a.file_name}
                              className="hover:opacity-80"
                              onClick={(e) => { e.stopPropagation(); openBillAttachment(a.file_path, a.file_name); }}
                            >
                              <FileText className="h-4 w-4 text-destructive" />
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )),
                ];
              }),
            ])
          )}
        </TableBody>
        {groups.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="text-right font-semibold">Totals</TableCell>
              <TableCell className="text-center">{totalLate ? <Badge variant="destructive">{totalLate}</Badge> : "-"}</TableCell>
              <TableCell className="text-center">{totalRejected ? <Badge variant="destructive">{totalRejected}</Badge> : "-"}</TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
