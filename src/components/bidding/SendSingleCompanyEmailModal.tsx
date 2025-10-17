import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Building2, Users, Send } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getFileIcon, getFileIconColor } from './utils/fileIconUtils';
import { useToast } from '@/hooks/use-toast';
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';

// Helper to get storage path for specification files
const getProjectFileStoragePath = (fileRef: string): string => {
  if (fileRef.includes('/')) return fileRef;
  return `specifications/${fileRef}`;
};

interface SendSingleCompanyEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidPackage: any;
  companyId: string;
}

export function SendSingleCompanyEmailModal({ 
  open, 
  onOpenChange, 
  bidPackage, 
  companyId 
}: SendSingleCompanyEmailModalProps) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openSpecificationFile } = useUniversalFilePreviewContext();

  // Fetch specific company data
  const { data: companyData, isLoading } = useQuery({
    queryKey: ['single-company-bid-package', bidPackage?.id, companyId],
    queryFn: async () => {
      if (!bidPackage?.id || !companyId) return null;

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
        .eq('bid_package_id', bidPackage.id)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('Error fetching company:', error);
        return null;
      }

      return data;
    },
    enabled: !!bidPackage?.id && !!companyId && open,
  });

  // Fetch project information
  const { data: projectData } = useQuery({
    queryKey: ['project-details', bidPackage?.project_id],
    queryFn: async () => {
      if (!bidPackage?.project_id) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', bidPackage.project_id)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        return null;
      }

      return data;
    },
    enabled: !!bidPackage?.project_id && open,
  });

  // Fetch sender company information
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

  const handleSendEmail = async () => {
    if (!bidPackage || !companyData) {
      return;
    }

    setIsSending(true);
    try {
      const notificationReps = companyData.companies?.company_representatives?.filter(
        (rep: any) => rep.receive_bid_notifications && rep.email
      ) || [];

      if (notificationReps.length === 0) {
        toast({
          title: "No Recipients",
          description: "This company has no representatives with bid notifications enabled.",
          variant: "destructive",
        });
        return;
      }

      // Prepare email data for single company
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
          manager: projectData.construction_manager,
          managerEmail: undefined, // Will need to be fetched if needed
          managerPhone: undefined // Will need to be fetched if needed
        } : undefined,
        senderCompany: senderCompanyData ? {
          company_name: senderCompanyData.company_name,
          address: 'address' in senderCompanyData ? senderCompanyData.address : undefined
        } : undefined,
        companies: [{
          id: companyData.companies.id,
          company_name: companyData.companies.company_name,
          address: companyData.companies.address,
          phone_number: companyData.companies.phone_number,
          representatives: notificationReps
        }]
      };

      const { data: emailResult, error } = await supabase.functions.invoke('send-bid-package-email', {
        body: emailData
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      if (!emailResult?.success) {
        throw new Error('Email was not sent successfully');
      }

      toast({
        title: "Email Sent",
        description: `Bid package sent successfully to ${companyData.companies.company_name}.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!bidPackage || !companyData) return null;

  const costCode = bidPackage.cost_codes;
  const notificationReps = companyData.companies?.company_representatives?.filter(
    (rep: any) => rep.receive_bid_notifications && rep.email
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Bid Package to {companyData.companies?.company_name}
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
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                console.log('📁 SendSingleCompanyEmailModal: Opening file', fileName);
                                const displayName = fileName.split('/').pop() || fileName;
                                const storagePath = getProjectFileStoragePath(fileName);
                                openSpecificationFile(storagePath, displayName);
                              }}
                              className={`flex items-center justify-center p-1 ${iconColorClass} hover:bg-accent rounded transition-colors`}
                              title={`Click to open ${fileName}`}
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

          {/* Company and Representatives */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              <h4 className="font-medium text-sm">Recipients ({notificationReps.length} total)</h4>
            </div>

            {isLoading ? (
              <div className="text-center py-2 text-muted-foreground text-sm">Loading recipients...</div>
            ) : (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <h5 className="font-medium text-sm">{companyData.companies?.company_name}</h5>
                </div>
                
                {companyData.companies?.address && (
                  <p className="text-xs text-muted-foreground pl-5">{companyData.companies.address}</p>
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
            )}

            {notificationReps.length === 0 && !isLoading && (
              <div className="text-center py-2 text-muted-foreground text-sm">
                No recipients found with bid notifications enabled for this company.
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
            disabled={isSending || notificationReps.length === 0}
            className="flex items-center gap-2"
          >
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to {notificationReps.length} Recipients
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
