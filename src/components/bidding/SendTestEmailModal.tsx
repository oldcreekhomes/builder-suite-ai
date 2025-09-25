import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, FileText, Building2, Send, TestTube } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getFileIcon, getFileIconColor } from './utils/fileIconUtils';
import { useToast } from '@/hooks/use-toast';
import { useCompanyUsers } from '@/hooks/useCompanyUsers';
import { openFileViaRedirect, getProjectFileStoragePath } from '@/utils/fileOpenUtils';

interface SendTestEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidPackage: any;
  companyId?: string;
}

export function SendTestEmailModal({ 
  open, 
  onOpenChange, 
  bidPackage,
  companyId 
}: SendTestEmailModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const { toast } = useToast();
  const { users } = useCompanyUsers();

  // Get current user's email as default
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-email'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return userData;
    },
    enabled: open,
  });

  // Set default email when modal opens
  React.useEffect(() => {
    if (currentUser?.email && !testEmail) {
      setTestEmail(currentUser.email);
    }
  }, [currentUser, testEmail]);

  // Fetch company data (either specific company or first company)
  const { data: companyData, isLoading: isLoadingCompanyData, error: companyDataError } = useQuery({
    queryKey: ['test-email-company', bidPackage?.id, companyId],
    queryFn: async () => {
      if (!bidPackage?.id) return null;

      const { data, error } = await supabase
        .from('project_bids')
        .select(`
          *,
          companies (
            id,
            company_name,
            address,
            phone_number,
            company_representatives (
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
        return null;
      }

      // If specific company requested, find it
      if (companyId) {
        return data?.find(company => company.company_id === companyId) || data?.[0] || null;
      }
      
      // Otherwise return first company
      return data?.[0] || null;
    },
    enabled: !!bidPackage?.id && open,
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

  const handleSendTestEmail = async () => {
    // Specific validation with detailed error messages
    if (!bidPackage) {
      toast({
        title: "Missing Information",
        description: "Bid package data is not available.",
        variant: "destructive",
      });
      return;
    }

    if (!testEmail?.trim()) {
      toast({
        title: "Missing Information", 
        description: "Please enter a test email address.",
        variant: "destructive",
      });
      return;
    }

    if (!companyData) {
      toast({
        title: "Loading Data",
        description: "Company data is still loading. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!companyData.companies) {
      toast({
        title: "Missing Information",
        description: "Company information is not available for this bid package.",
        variant: "destructive",
      });
      return;
    }

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

      // Create test representative data using the test email
      const testRepresentative = {
        id: 'test-rep',
        first_name: 'Test',
        last_name: 'Recipient',
        email: testEmail,
        phone_number: null,
        title: 'Test Email',
        receive_bid_notifications: true
      };

      // Prepare email data with test recipient
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
        companies: [{
          id: companyData.companies.id,
          company_name: `${companyData.companies.company_name} (TEST EMAIL)`,
          address: companyData.companies.address,
          phone_number: companyData.companies.phone_number,
          representatives: [testRepresentative]
        }]
      };

      const { data: emailResult, error } = await supabase.functions.invoke('send-bid-package-email', {
        body: emailData
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to send test email: ${error.message}`);
      }

      if (!emailResult?.success) {
        throw new Error('Test email was not sent successfully');
      }

      toast({
        title: "Test Email Sent",
        description: `Test bid package email sent successfully to ${testEmail}.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: "Failed to send test email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!bidPackage) return null;

  const costCode = bidPackage.cost_codes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Send Test Email - {costCode?.code} {costCode?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {/* Test Email Input */}
          <div className="space-y-2">
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email address to receive test"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              This email will receive the bid package instead of the actual recipients.
            </p>
          </div>

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
                                console.log('📁 SendTestEmailModal: Opening file', fileName);
                                const displayName = fileName.split('/').pop() || fileName;
                                const storagePath = getProjectFileStoragePath(fileName);
                                openFileViaRedirect('project-files', storagePath, displayName);
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

          {/* Company Information */}
          {companyData && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3" />
                <h4 className="font-medium text-sm">Sample Company (for test email)</h4>
              </div>
              
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <h5 className="font-medium text-sm">{companyData.companies?.company_name}</h5>
                </div>
                
                {companyData.companies?.address && (
                  <p className="text-xs text-muted-foreground pl-5">{companyData.companies.address}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendTestEmail}
            disabled={isSending || !testEmail?.trim() || isLoadingCompanyData || !companyData}
            className="flex items-center gap-2"
          >
            {isSending ? (
              <>Sending Test...</>
            ) : isLoadingCompanyData ? (
              <>Loading...</>
            ) : (
              <>
                <TestTube className="h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
