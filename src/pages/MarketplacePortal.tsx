import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut, Phone, Globe, Mail, MapPin, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyTypeCombobox } from "@/components/marketplace/CompanyTypeCombobox";

interface MarketplaceCompany {
  id: string;
  company_name: string;
  company_type: string;
  address: string | null;
  phone_number: string | null;
  website: string | null;
  service_areas: string[] | null;
  license_numbers: string[] | null;
}

const MarketplacePortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [company, setCompany] = useState<MarketplaceCompany | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    company_name: "",
    company_type: "",
    address: "",
    phone_number: "",
    website: "",
    service_areas: ""
  });

  useEffect(() => {
    if (user) {
      fetchCompanyProfile();
    }
  }, [user]);

  const fetchCompanyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_companies')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No company found - this shouldn't happen but handle gracefully
          console.log("No marketplace company found for user");
        } else {
          throw error;
        }
      }

      if (data) {
        setCompany(data as MarketplaceCompany);
        setEditForm({
          company_name: data.company_name || "",
          company_type: data.company_type || "",
          address: data.address || "",
          phone_number: data.phone_number || "",
          website: data.website || "",
          service_areas: (data.service_areas || []).join(", ")
        });
      }
    } catch (error: any) {
      console.error("Error fetching company profile:", error);
      toast({
        title: "Error",
        description: "Failed to load your company profile.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('marketplace_companies')
        .update({
          company_name: editForm.company_name,
          company_type: editForm.company_type,
          address: editForm.address || null,
          phone_number: editForm.phone_number || null,
          website: editForm.website || null,
          service_areas: editForm.service_areas ? editForm.service_areas.split(",").map(s => s.trim()).filter(Boolean) : null
        })
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your company profile has been saved."
      });

      setIsEditing(false);
      fetchCompanyProfile();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-primary" />
                <span className="ml-2 text-xl font-bold text-foreground tracking-tight">BuilderSuite</span>
                <span className="ml-2 text-sm text-muted-foreground">Marketplace</span>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-foreground tracking-tight">BuilderSuite</span>
              <span className="ml-2 text-sm text-muted-foreground">Marketplace</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Marketplace Profile</h1>
            <p className="text-muted-foreground">Manage how home builders see your company.</p>
          </div>
          {!isEditing && company && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {!company ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No company profile found.</p>
              <p className="text-sm text-muted-foreground">
                Please contact support if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        ) : isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Company Profile</CardTitle>
              <CardDescription>Update your company information visible to home builders.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={editForm.company_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_type">Company Type *</Label>
                    <CompanyTypeCombobox
                      value={editForm.company_type}
                      onSelect={(value) => setEditForm(prev => ({ ...prev, company_type: value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={editForm.address}
                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      value={editForm.phone_number}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={editForm.website}
                      onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                </div>


                <div className="space-y-2">
                  <Label htmlFor="service_areas">Service Areas</Label>
                  <Textarea
                    id="service_areas"
                    value={editForm.service_areas}
                    onChange={(e) => setEditForm(prev => ({ ...prev, service_areas: e.target.value }))}
                    placeholder="e.g., Austin, Dallas, Houston (comma-separated)"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">Separate multiple areas with commas</p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Company Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{company.company_name}</CardTitle>
                    <CardDescription>{company.company_type}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {company.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Address</p>
                        <p className="text-sm text-muted-foreground">{company.address}</p>
                      </div>
                    </div>
                  )}
                  {company.phone_number && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{company.phone_number}</p>
                      </div>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Website</p>
                        <a 
                          href={company.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {company.website}
                        </a>
                      </div>
                    </div>
                  )}
                  {user?.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Service Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Areas</CardTitle>
              </CardHeader>
              <CardContent>
                {company.service_areas && company.service_areas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {company.service_areas.map((area, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 bg-muted text-foreground text-sm rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No service areas added yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <p className="text-sm font-medium text-foreground">
                    Your profile is live in the BuilderSuite Marketplace
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-5">
                  Home builders can find and contact you through the directory.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default MarketplacePortal;
