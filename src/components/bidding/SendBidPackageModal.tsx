import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, Building2, Users, Send } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getFileIcon, getFileIconColor } from './utils/fileIconUtils';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Helper to get storage path for specification files
const getProjectFileStoragePath = (fileRef: string): string => {
  if (fileRef.includes('/')) return fileRef;
  return `specifications/${fileRef}`;
};

interface SendBidPackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidPackage: any;
  filteredCompanyIds?: string[];
}

export function SendBidPackageModal({ open, onOpenChange, bidPackage, filteredCompanyIds }: SendBidPackageModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { openSpecificationFile } = useUniversalFilePreviewContext();

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
              receive_bid_notifications,
              service_areas
            )
          )
        `)
        .eq('bid_package_id', bidPackage.id);

      if (error) {
        console.error('Error fetching companies:', error);
        return [];
      }

      const results = data || [];
      // If filteredCompanyIds is provided, only include those companies
      if (filteredCompanyIds && filteredCompanyIds.length > 0) {
        return results.filter(bid => filteredCompanyIds.includes(bid.company_id));
      }
      return results;
    },
    enabled: !!bidPackage?.id && open,
  });

  // Initialize selectedCompanyIds when data loads
  useEffect(() => {
    if (!companiesData) return;
    const newSelected = new Set<string>();
    companiesData.forEach((company: any) => {
      if (!company.email_sent_at) {
        newSelected.add(company.company_id);
      }
    });
    setSelectedCompanyIds(newSelected);
  }, [companiesData]);

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
        return { company_name: userData.company_name };
      }

      return companyData;
    },
    enabled: open,
  });

  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const projectRegion = projectData?.region;

  // Compute recipient counts based on selected companies only
  const { selectedRecipients, newCount, resendCount } = useMemo(() => {
    if (!companiesData) return { selectedRecipients: 0, newCount: 0, resendCount: 0 };
    let total = 0;
    let newC = 0;
    let resendC = 0;
    companiesData.forEach((company: any) => {
      if (!selectedCompanyIds.has(company.company_id)) return;
      const reps = company.companies?.company_representatives?.filter(
        (rep: any) => rep.receive_bid_notifications && rep.email &&
          (!projectRegion || (rep.service_areas || []).includes(projectRegion))
      ) || [];
      if (reps.length > 0) {
        total += reps.length;
        if (company.email_sent_at) {
          resendC++;
        } else {
          newC++;
        }
      }
    });
    return { selectedRecipients: total, newCount: newC, resendCount: resendC };
  }, [companiesData, selectedCompanyIds, projectRegion]);

  const handleSendEmail = async () => {
    if (!bidPackage || !companiesData) return;

    setIsSending(true);
    try {
      // Get project manager's details
      let managerEmail = undefined;
      let managerPhone = undefined;
      let managerFullName = 'Not assigned';
      
      if (projectData?.construction_manager) {
        const { data: managerData } = await supabase
          .from('users')
          .select('first_name, last_name, email, phone_number')
          .eq('id', projectData.construction_manager)
          .maybeSingle();
        
        if (managerData) {
          managerFullName = `${managerData.first_name || ''} ${managerData.last_name || ''}`.trim() || 'Not assigned';
          managerEmail = managerData.email;
          managerPhone = managerData.phone_number;
        }
      }

      // Only include selected companies
      const sentCompanyIds: string[] = [];

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
        companies: companiesData
          .filter(company => selectedCompanyIds.has(company.company_id))
          .map(company => {
            const reps = company.companies.company_representatives?.filter(
              (rep: any) => rep.receive_bid_notifications && rep.email &&
                (!projectRegion || (rep.service_areas || []).includes(projectRegion))
            ) || [];
            if (reps.length > 0) {
              sentCompanyIds.push(company.companies.id);
            }
            return {
              id: company.companies.id,
              company_name: company.companies.company_name,
              address: company.companies.address,
              phone_number: company.companies.phone_number,
              representatives: reps
            };
          }).filter(company => company.representatives.length > 0)
      };

      const { data: emailResult, error } = await supabase.functions.invoke('send-bid-package-email', {
        body: emailData
      });

      if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
      }

      if (emailResult?.success) {
        // Update bid package status
        const updateData: { status: string; sent_on?: string } = { status: 'sent' };
        if (!bidPackage.sent_on) {
          updateData.sent_on = new Date().toISOString();
        }
        
        await supabase
          .from('project_bid_packages')
          .update(updateData)
          .eq('id', bidPackage.id);

        // Update email_sent_at for each sent company
        if (sentCompanyIds.length > 0) {
          await supabase
            .from('project_bids')
            .update({ email_sent_at: new Date().toISOString() } as any)
            .eq('bid_package_id', bidPackage.id)
            .in('company_id', sentCompanyIds);
        }
      } else {
        throw new Error('Email was not sent successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['project-bidding'] });
      queryClient.invalidateQueries({ queryKey: ['bidding-counts', bidPackage.project_id] });
      queryClient.invalidateQueries({ queryKey: ['bid-package-companies', bidPackage.id] });

      toast({
        title: "Bid Package Sent",
        description: `Sent to ${sentCompanyIds.length} companies successfully.`,
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

  // Total recipients across ALL companies (for display)
  const totalRecipients = companiesData?.reduce((acc, company) => {
    const reps = company.companies?.company_representatives?.filter(
      (rep: any) => rep.receive_bid_notifications && rep.email &&
        (!projectRegion || (rep.service_areas || []).includes(projectRegion))
    ) || [];
    return acc + reps.length;
  }, 0) || 0;

  // Build send button label
  let sendButtonLabel = `Send to ${selectedRecipients} Recipients`;
  if (resendCount > 0 && newCount > 0) {
    sendButtonLabel = `Send to ${newCount} New, ${resendCount} Resend`;
  } else if (resendCount > 0) {
    sendButtonLabel = `Resend to ${resendCount} Companies`;
  }

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
                    <div 
                      className="bg-muted p-3 rounded-lg max-h-32 overflow-y-auto text-xs prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: bidPackage.specifications }}
                    />
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
                            <Tooltip key={index}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    const storagePath = getProjectFileStoragePath(fileName);
                                    openSpecificationFile(storagePath, displayName);
                                  }}
                                  className={`flex items-center justify-center p-1 hover:bg-muted-foreground/10 rounded transition-colors ${iconColorClass}`}
                                  type="button"
                                >
                                  <IconComponent className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to open {displayName}</p>
                              </TooltipContent>
                            </Tooltip>
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

          {/* Companies and Recipients */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              <h4 className="font-medium text-sm">Recipients ({totalRecipients} total across {companiesData?.length || 0} companies)</h4>
            </div>

            {isLoading ? (
              <div className="text-center py-2 text-muted-foreground text-sm">Loading recipients...</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {companiesData?.map((company) => {
                  const notificationReps = company.companies?.company_representatives?.filter(
                    (rep: any) => rep.receive_bid_notifications && rep.email &&
                      (!projectRegion || (rep.service_areas || []).includes(projectRegion))
                  ) || [];

                  if (notificationReps.length === 0) return null;

                  const isSelected = selectedCompanyIds.has(company.company_id);
                  const alreadySent = !!company.email_sent_at || !!bidPackage?.sent_on;
                  const sentDate = company.email_sent_at || bidPackage?.sent_on;

                  return (
                    <div
                      key={company.id}
                      className={`border rounded-lg p-2 space-y-1 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : alreadySent
                            ? 'border-muted bg-muted/30 opacity-70'
                            : 'border-border'
                      }`}
                      onClick={() => toggleCompany(company.company_id)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCompany(company.company_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5"
                        />
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <h5 className="font-medium text-sm flex-1">{company.companies?.company_name}</h5>
                      </div>

                      {alreadySent && sentDate && (
                        <p className="text-[10px] text-muted-foreground ml-6">
                          Already sent on {format(new Date(sentDate), 'MMM dd, yyyy')}
                        </p>
                      )}

                      <div className="space-y-1 ml-6">
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

            {totalRecipients === 0 && !isLoading && (
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
            disabled={isSending || selectedRecipients === 0}
            className="flex items-center gap-2"
          >
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {sendButtonLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
