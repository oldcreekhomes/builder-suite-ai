import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, Building2, Users, Send } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getFileIcon, getFileIconColor } from './utils/fileIconUtils';
import { openSpecificationFile } from '@/utils/fileOpenUtils';
import { useToast } from '@/hooks/use-toast';
import { useCompanyUsers } from '@/hooks/useCompanyUsers';

interface SendBidPackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidPackage: any;
}

export function SendBidPackageModal({ open, onOpenChange, bidPackage }: SendBidPackageModalProps) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { users } = useCompanyUsers();

  // Fetch companies and representatives for this bid package
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['bid-package-companies', bidPackage?.id],
    queryFn: async () => {
      if (!bidPackage?.id) return [];

      const { data, error } = await supabase
        .from('project_bids')
        .select(`
          *,
          companies (
            id,
            company_name,
            address,
            phone_number,
            company_representatives!company_representatives_company_id_fkey (
              id,
              first_name,
              last_name,
              email,
              phone_number,
              title,
              receive_bid_notifications
            )
          )
        `)
        .eq('bid_package_id', bidPackage.id);

      if (error) {
        console.error('Error fetching companies:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!bidPackage?.id && open,
  });

  // Fetch project information
  const { data: projectData } = useQuery({
    queryKey: ['project-details', bidPackage?.project_id],
    queryFn: async () => {
      if (!bidPackage?.project_id) return null;

      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', bidPackage.project_id)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        return null;
      }

      return project;
    },
    enabled: !!bidPackage?.project_id && open,
  });

  // Fetch sender company information (current user's company)
  const { data: senderCompanyData } = useQuery({
    queryKey: ['sender-company'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_name) {
        console.error('Error fetching user company:', userError);
        return null;
      }

      // Find the company details based on the company name
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .ilike('company_name', userData.company_name)
        .limit(1)
        .single();

      if (companyError) {
        console.error('Error fetching company details:', companyError);
        // Return basic info even if company details aren't found
        return { company_name: userData.company_name };
      }

      return companyData;
    },
    enabled: open,
  });

  const handleSendEmail = async () => {
    console.log('🚀 handleSendEmail called', { bidPackage, companiesData });
    
    if (!bidPackage || !companiesData) {
      console.log('❌ Missing data:', { bidPackage: !!bidPackage, companiesData: !!companiesData });
      return;
    }

    console.log('📧 Starting email send process...');
    setIsSending(true);
    try {
      // Get project manager's details from company users
      let managerEmail = undefined;
      let managerPhone = undefined;
      let managerFullName = 'Project Manager'; // Default fallback
      
      if (projectData?.construction_manager) {
        const manager = users.find(user => user.id === projectData.construction_manager);
        if (manager) {
          managerFullName = `${manager.first_name || ''} ${manager.last_name || ''}`.trim() || 'Project Manager';
          managerEmail = manager.email;
          managerPhone = manager.phone_number;
        }
      }

      // Prepare email data
      const emailData = {
        bidPackage: {
          id: bidPackage.id,
          name: bidPackage.name,
          costCode: bidPackage.cost_codes,
          due_date: bidPackage.due_date,
          reminder_date: bidPackage.reminder_date,
          specifications: bidPackage.specifications,
          files: bidPackage.files || []
        },
        project: projectData ? {
          address: projectData.address,
          manager: managerFullName,
          managerEmail: managerEmail,
          managerPhone: managerPhone
        } : undefined,
        senderCompany: senderCompanyData ? {
          company_name: senderCompanyData.company_name,
          address: 'address' in senderCompanyData ? senderCompanyData.address : undefined
        } : undefined,
        companies: companiesData.map(company => ({
          id: company.companies.id,
          company_name: company.companies.company_name,
          address: company.companies.address,
          phone_number: company.companies.phone_number,
          representatives: company.companies.company_representatives?.filter(
            (rep: any) => rep.receive_bid_notifications && rep.email
          ) || []
        })).filter(company => company.representatives.length > 0)
      };

      console.log('📋 Prepared email data:', JSON.stringify(emailData, null, 2));
      console.log('🎯 Companies with recipients:', emailData.companies.length);

      console.log('🔄 About to invoke edge function...');
      console.log('🔍 Supabase client check:', !!supabase);
      console.log('🔍 Functions available:', !!supabase.functions);
      
      const { data: emailResult, error } = await supabase.functions.invoke('send-bid-package-email', {
        body: emailData
      });

      console.log('📬 Edge function result:', { emailResult, error });
      console.log('📧 Email result details:', JSON.stringify(emailResult, null, 2));
      console.log('🔍 Error details:', JSON.stringify(error, null, 2));
      
      if (error) {
        console.error('❌ Edge function invocation error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
      }

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      // Only update status to 'sent' if email was successfully sent
      if (emailResult?.success) {
        const { error: updateError } = await supabase
          .from('project_bid_packages')
          .update({ status: 'sent' })
          .eq('id', bidPackage.id);

        if (updateError) {
          console.error('Error updating bid package status:', updateError);
          // Don't throw here as email was sent, just log the issue
        }
      } else {
        throw new Error('Email was not sent successfully');
      }

      // Invalidate bidding queries to refresh the table
      queryClient.invalidateQueries({ queryKey: ['project-bidding'] });

      toast({
        title: "Bid Package Sent",
        description: "The bid package has been sent successfully to all recipients.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error sending bid package:', error);
      toast({
        title: "Error",
        description: "Failed to send bid package. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!bidPackage) return null;

  const costCode = bidPackage.cost_codes;
  const recipients = companiesData?.reduce((acc, company) => {
    const reps = company.companies?.company_representatives?.filter(
      (rep: any) => rep.receive_bid_notifications && rep.email
    ) || [];
    return acc + reps.length;
  }, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Bid Package
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {/* Cost Code Information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">{costCode?.code} - {costCode?.name}</h3>
            
            <div className="grid grid-cols-1 gap-2 bg-muted p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span><strong>Due Date:</strong> {bidPackage.due_date ? format(new Date(bidPackage.due_date), 'MMM dd, yyyy') : 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span><strong>Reminder Date:</strong> {bidPackage.reminder_date ? format(new Date(bidPackage.reminder_date), 'MMM dd, yyyy') : 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Specifications and Files */}
          {(bidPackage.specifications || (bidPackage.files && bidPackage.files.length > 0)) && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-3">
                {/* Specifications - 2/3 width */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-3 w-3" />
                    <h4 className="font-medium text-sm">Specifications</h4>
                  </div>
                  {bidPackage.specifications ? (
                    <div className="bg-muted p-3 rounded-lg max-h-32 overflow-y-auto">
                      <div className="text-xs space-y-1">
                        {bidPackage.specifications.split('\n').map((line: string, index: number) => {
                          const trimmedLine = line.trim();
                          if (!trimmedLine) return <br key={index} />;
                          
                          // Handle bullet points (•, -, *, or numbered)
                          if (trimmedLine.match(/^[•\-\*]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
                            return (
                              <div key={index} className="flex items-start gap-1">
                                <span className="text-muted-foreground mt-0.5">•</span>
                                <span>{trimmedLine.replace(/^[•\-\*]\s+/, '').replace(/^\d+\.\s+/, '')}</span>
                              </div>
                            );
                          }
                          
                          return <div key={index}>{trimmedLine}</div>;
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted p-3 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">No specifications</p>
                    </div>
                  )}
                </div>
                
                {/* Files - 1/3 width */}
                <div className="col-span-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-3 w-3" />
                    <h4 className="font-medium text-sm">Files</h4>
                  </div>
                  {bidPackage.files && bidPackage.files.length > 0 ? (
                    <div className="bg-muted p-2 rounded-lg max-h-32 overflow-y-auto">
                      <div className="flex flex-wrap gap-1">
                        {bidPackage.files.map((fileName: string, index: number) => {
                          const IconComponent = getFileIcon(fileName);
                          const iconColorClass = getFileIconColor(fileName);
                          const displayName = fileName.split('/').pop() || fileName;
                          
                          return (
                            <button
                              key={index}
                              onClick={() => openSpecificationFile(fileName, displayName)}
                              className={`flex items-center justify-center p-1 hover:bg-muted-foreground/10 rounded transition-colors ${iconColorClass}`}
                              title={`Click to open ${displayName}`}
                              type="button"
                            >
                              <IconComponent className="h-4 w-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted p-2 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">No files</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Companies and Representatives */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              <h4 className="font-medium text-sm">Recipients ({recipients} total)</h4>
            </div>

            {isLoading ? (
              <div className="text-center py-2 text-muted-foreground text-sm">Loading recipients...</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {companiesData?.map((company) => {
                  const notificationReps = company.companies?.company_representatives?.filter(
                    (rep: any) => rep.receive_bid_notifications && rep.email
                  ) || [];

                  if (notificationReps.length === 0) return null;

                  return (
                    <div key={company.id} className="border rounded-lg p-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <h5 className="font-medium text-sm">{company.companies?.company_name}</h5>
                      </div>
                      
                      {company.companies?.address && (
                        <p className="text-xs text-muted-foreground pl-5">{company.companies.address}</p>
                      )}

                       <div className="space-y-1">
                         <div className="flex items-center gap-2">
                           <Users className="h-3 w-3 text-muted-foreground" />
                           <span className="text-xs font-medium">Recipients:</span>
                         </div>
                         <div className="flex flex-wrap gap-1">
                           {notificationReps.map((rep: any) => (
                             <div key={rep.id} className="inline-flex items-center text-xs bg-muted px-2 py-1 rounded">
                               <span className="font-medium">{rep.first_name} {rep.last_name}</span>
                             </div>
                           ))}
                         </div>
                       </div>
                    </div>
                  );
                })}
              </div>
            )}

            {recipients === 0 && !isLoading && (
              <div className="text-center py-2 text-muted-foreground text-sm">
                No recipients found with bid notifications enabled.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail}
            disabled={isSending || recipients === 0}
            className="flex items-center gap-2"
          >
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to {recipients} Recipients
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
