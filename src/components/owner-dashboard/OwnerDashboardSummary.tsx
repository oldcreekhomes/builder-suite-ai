import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, CreditCard, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  onClick?: () => void;
}

function SummaryCard({ title, value, icon, onClick }: SummaryCardProps) {
  return (
    <Card 
      className={`${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OwnerDashboardSummary() {
  // AI Extraction Queue count
  const { data: extractionCount = 0 } = useQuery({
    queryKey: ['extraction-queue-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pending_bill_uploads')
        .select('id', { count: 'exact', head: true })
        .in('status', ['extracted', 'completed', 'reviewing']);
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Pending Review (draft bills)
  const { data: pendingReviewCount = 0 } = useQuery({
    queryKey: ['pending-review-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft');
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Ready to Pay (posted bills)
  const { data: readyToPayCount = 0 } = useQuery({
    queryKey: ['ready-to-pay-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'posted');
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Paid This Month
  const { data: paidThisMonth = 0 } = useQuery({
    queryKey: ['paid-this-month'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('bills')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('updated_at', startOfMonth.toISOString());
      
      if (error) throw error;
      return data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <SummaryCard
        title="AI Extraction Queue"
        value={extractionCount}
        icon={<FileText className="h-6 w-6" />}
      />
      <SummaryCard
        title="Pending Review"
        value={pendingReviewCount}
        icon={<Clock className="h-6 w-6" />}
      />
      <SummaryCard
        title="Ready to Pay"
        value={readyToPayCount}
        icon={<CreditCard className="h-6 w-6" />}
      />
      <SummaryCard
        title="Paid This Month"
        value={formatCurrency(paidThisMonth)}
        icon={<CheckCircle className="h-6 w-6" />}
      />
    </div>
  );
}
