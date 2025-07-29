import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Upload, DollarSign } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

export default function SubmitBid() {
  const [searchParams] = useSearchParams();
  const bidPackageId = searchParams.get('bid_package_id');
  const companyId = searchParams.get('company_id');
  
  const [price, setPrice] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bid package details
  const { data: bidPackage } = useQuery({
    queryKey: ['bid-package-details', bidPackageId],
    queryFn: async () => {
      if (!bidPackageId) return null;
      
      const { data, error } = await supabase
        .from('project_bid_packages')
        .select(`
          *,
          cost_codes (name, code),
          projects (name, address)
        `)
        .eq('id', bidPackageId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!bidPackageId
  });

  // Fetch company details
  const { data: company } = useQuery({
    queryKey: ['company-details', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bidPackageId || !companyId) {
      toast({
        title: "Error",
        description: "Missing bid package or company information.",
        variant: "destructive"
      });
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price.",
        variant: "destructive"
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "Error", 
        description: "Please upload at least one proposal document.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('bidPackageId', bidPackageId);
      formData.append('companyId', companyId);
      formData.append('price', price);
      
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Call the submit bid edge function
      const response = await fetch(`https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/submit-bid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbW53bHZtbWtuZ3JnYXRuemtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU3OTgsImV4cCI6MjA2NjE4MTc5OH0.gleBmte9X1uQWYaTxX-dLWVqk6Hpvb_qjseN_aG6xM0`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit bid');
      }

      const result = await response.json();
      
      // Redirect to confirmation page
      window.location.href = '/bid-submission-confirmation?status=success';
      
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit bid. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!bidPackageId || !companyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">Invalid bid submission link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center bg-black text-white">
            <CardTitle className="text-2xl font-bold">Submit Your Bid</CardTitle>
            {bidPackage?.projects && (
              <p className="text-gray-300">{bidPackage.projects.address}</p>
            )}
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Project Information */}
            {bidPackage && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 bg-black text-white p-3">
                  Project Summary
                </h3>
                <div className="border border-gray-200 p-4 space-y-2">
                  <div className="flex">
                    <span className="text-gray-600 font-medium w-40">Project Address:</span>
                    <span className="font-semibold">{bidPackage.projects?.address}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 font-medium w-40">Project Type:</span>
                    <span className="font-semibold">{bidPackage.cost_codes?.name}</span>
                  </div>
                  {bidPackage.due_date && (
                    <div className="flex">
                      <span className="text-gray-600 font-medium w-40">Bid Due Date:</span>
                      <span className="font-semibold">
                        {new Date(bidPackage.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {company && (
                    <div className="flex">
                      <span className="text-gray-600 font-medium w-40">Your Company:</span>
                      <span className="font-semibold">{company.company_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bid Submission Form */}
            <div>
              <h3 className="text-lg font-semibold mb-4 bg-black text-white p-3">
                Submit Your Bid
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Price Input */}
                <div>
                  <Label htmlFor="price" className="text-sm font-medium">
                    Bid Price *
                  </Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Enter your bid amount"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <Label className="text-sm font-medium">
                    Proposal Documents *
                  </Label>
                  <div
                    {...getRootProps()}
                    className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {isDragActive
                        ? 'Drop files here...'
                        : 'Drag & drop files here, or click to select'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Supports PDF, DOC, DOCX, PNG, JPG
                    </p>
                  </div>

                  {/* Selected Files */}
                  {files.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Selected Files:</p>
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm truncate">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Your Bid'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}