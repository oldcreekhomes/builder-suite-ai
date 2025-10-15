import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { CostCode, SpecificationWithCostCode } from "@/types/settings";

export const useSpecifications = (costCodes: CostCode[]) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [specifications, setSpecifications] = useState<SpecificationWithCostCode[]>([]);
  const [specificationsLoading, setSpecificationsLoading] = useState(true);
  const [selectedSpecifications, setSelectedSpecifications] = useState<Set<string>>(new Set());
  const [collapsedSpecGroups, setCollapsedSpecGroups] = useState<Set<string>>(new Set());

  // Fetch specifications
  const fetchSpecifications = async () => {
    if (!user) return;
    
    try {
      // First, get cost codes that have specifications enabled
      const { data: costCodesWithSpecs, error: costCodesError } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('has_specifications', true);

      if (costCodesError) throw costCodesError;

      if (!costCodesWithSpecs || costCodesWithSpecs.length === 0) {
        setSpecifications([]);
        setSpecificationsLoading(false);
        return;
      }

      // Get existing specification records
      const { data: existingSpecs, error: specsError } = await supabase
        .from('cost_code_specifications')
        .select('*')
        .in('cost_code_id', costCodesWithSpecs.map(cc => cc.id));

      if (specsError) throw specsError;

      // Create missing specification records
      const existingSpecCostCodeIds = new Set(existingSpecs?.map(spec => spec.cost_code_id) || []);
      const missingSpecs = costCodesWithSpecs
        .filter(cc => !existingSpecCostCodeIds.has(cc.id))
        .map(cc => ({
          cost_code_id: cc.id,
          description: null,
          files: []
        }));

      if (missingSpecs.length > 0) {
        const { error: insertError } = await supabase
          .from('cost_code_specifications')
          .insert(missingSpecs);

        if (insertError) throw insertError;
      }

      // Now fetch all specifications with cost code data
      const { data: allSpecs, error: finalError } = await supabase
        .from('cost_code_specifications')
        .select(`
          *,
          cost_code:cost_codes(*)
        `)
        .in('cost_code_id', costCodesWithSpecs.map(cc => cc.id));

      if (finalError) throw finalError;

      setSpecifications(allSpecs || []);
    } catch (error) {
      console.error('Error fetching specifications:', error);
      toast({
        title: "Error",
        description: "Failed to load specifications",
        variant: "destructive",
      });
    } finally {
      setSpecificationsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecifications();
  }, [user, costCodes]);

  useEffect(() => {
    setCollapsedSpecGroups(new Set());
  }, [costCodes]);

  const handleUpdateSpecificationDescription = async (specId: string, description: string) => {
    try {
      const { error } = await supabase
        .from('cost_code_specifications')
        .update({ description })
        .eq('id', specId);

      if (error) throw error;
      
      fetchSpecifications();
      toast({
        title: "Success",
        description: "Description updated successfully",
      });
    } catch (error) {
      console.error('Error updating description:', error);
      toast({
        title: "Error",
        description: "Failed to update description",
        variant: "destructive",
      });
    }
  };

  const handleSpecificationFileUpload = (specId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      console.log('Files selected for upload:', files);
      if (files.length > 0) {
        try {
          const uploadedFileNames = [];
          
          // Find the specification to get the cost code details
          const spec = specifications.find(s => s.id === specId);
          if (!spec) {
            throw new Error('Specification not found');
          }

          // Get user's company info to create the correct path
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('company_name')
            .eq('id', user.id)
            .single();

          if (userError || !userData?.company_name) {
            throw new Error('Could not determine user company');
          }
          
          // Upload each file to storage with company-based path
          for (const file of files) {
            const fileName = `${Date.now()}-${file.name}`;
            // New path structure: specifications/{companyId}/{costCodeId}/{fileName}
            const filePath = `specifications/${userData.company_name}/${spec.cost_code_id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('project-files')
              .upload(filePath, file);

            if (uploadError) throw uploadError;
            uploadedFileNames.push(filePath);
          }
          
          // Update database with uploaded file paths (append to existing files)
          const existingFiles = spec.files || [];
          const updatedFiles = [...existingFiles, ...uploadedFileNames];
          
          const { error } = await supabase
            .from('cost_code_specifications')
            .update({ files: updatedFiles })
            .eq('id', specId);

          if (error) throw error;
          
          fetchSpecifications();
          toast({
            title: "Success",
            description: `Uploaded ${files.length} file(s)`,
          });
        } catch (error) {
          console.error('Error uploading files:', error);
          console.error('Upload error details:', error);
          toast({
            title: "Error",
            description: `Failed to upload files: ${error.message || 'Unknown error'}`,
            variant: "destructive",
          });
        }
      }
    };
    input.click();
  };

  const handleDeleteAllSpecificationFiles = async (specId: string) => {
    try {
      const { error } = await supabase
        .from('cost_code_specifications')
        .update({ files: [] })
        .eq('id', specId);

      if (error) throw error;
      
      fetchSpecifications();
      toast({
        title: "Success",
        description: "All files deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting files:', error);
      toast({
        title: "Error",
        description: "Failed to delete files",
        variant: "destructive",
      });
    }
  };

  const handleDeleteIndividualSpecificationFile = async (specificationId: string, fileName: string) => {
    try {
      const specification = specifications.find(s => s.id === specificationId);
      if (!specification) {
        throw new Error('Specification not found');
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([fileName]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        toast({
          title: "Error",
          description: "Failed to delete file from storage",
          variant: "destructive",
        });
        return;
      }

      // Update database - remove file from array
      const updatedFiles = (specification.files || []).filter(f => f !== fileName);
      
      const { error } = await supabase
        .from('cost_code_specifications')
        .update({ files: updatedFiles })
        .eq('id', specificationId);

      if (error) throw error;

      fetchSpecifications();
      
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting specification file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleSpecificationSelect = (specId: string, checked: boolean) => {
    const newSelected = new Set(selectedSpecifications);
    if (checked) {
      newSelected.add(specId);
    } else {
      newSelected.delete(specId);
    }
    setSelectedSpecifications(newSelected);
  };

  const handleSelectAllSpecifications = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(specifications.map(spec => spec.id));
      setSelectedSpecifications(allIds);
    } else {
      setSelectedSpecifications(new Set());
    }
  };

  const handleBulkDeleteSpecifications = async () => {
    try {
      for (const id of selectedSpecifications) {
        // Find the specification to get the cost code ID
        const spec = specifications.find(s => s.id === id);
        if (!spec) continue;
        
        // First, set has_specifications to false on the cost code
        const { error: costCodeError } = await supabase
          .from('cost_codes')
          .update({ has_specifications: false })
          .eq('id', spec.cost_code.id);

        if (costCodeError) {
          console.error('Error updating cost code:', costCodeError);
          throw costCodeError;
        }
        
        // Then delete the specification record
        const { error: specError } = await supabase
          .from('cost_code_specifications')
          .delete()
          .eq('id', id);
        
        if (specError) {
          console.error('Error deleting specification:', specError);
          throw specError;
        }
      }
      
      setSelectedSpecifications(new Set());
      fetchSpecifications();
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedSpecifications.size} specification${selectedSpecifications.size !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('Error deleting specifications:', error);
      toast({
        title: "Error",
        description: "Failed to delete specifications",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDeleteSpecification = async (specToDelete: SpecificationWithCostCode) => {
    try {
      console.log('Deleting specification for cost code:', specToDelete.cost_code.id, specToDelete.cost_code.code);
      
      // First, set has_specifications to false on the cost code
      const { error: costCodeError } = await supabase
        .from('cost_codes')
        .update({ has_specifications: false })
        .eq('id', specToDelete.cost_code.id);

      if (costCodeError) {
        console.error('Error updating cost code:', costCodeError);
        throw costCodeError;
      }
      
      console.log('Cost code updated successfully, now deleting specification record');

      // Then delete the specification record
      const { error: specError } = await supabase
        .from('cost_code_specifications')
        .delete()
        .eq('id', specToDelete.id);

      if (specError) {
        console.error('Error deleting specification:', specError);
        throw specError;
      }

      console.log('Specification deleted successfully');
      fetchSpecifications();
      toast({
        title: "Success",
        description: "Specification removed and cost code updated successfully",
      });
    } catch (error) {
      console.error('Error deleting specification:', error);
      toast({
        title: "Error",
        description: "Failed to delete specification",
        variant: "destructive",
      });
    }
  };

  const toggleSpecificationGroupCollapse = (groupKey: string) => {
    const newCollapsed = new Set(collapsedSpecGroups);
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    setCollapsedSpecGroups(newCollapsed);
  };

  return {
    specifications,
    specificationsLoading,
    selectedSpecifications,
    collapsedSpecGroups,
    fetchSpecifications,
    handleUpdateSpecificationDescription,
    handleSpecificationFileUpload,
    handleDeleteAllSpecificationFiles,
    handleDeleteIndividualSpecificationFile,
    handleSpecificationSelect,
    handleSelectAllSpecifications,
    handleBulkDeleteSpecifications,
    handleConfirmDeleteSpecification,
    toggleSpecificationGroupCollapse,
  };
};