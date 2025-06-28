
import { registerLicense } from '@syncfusion/ej2-base';
import { supabase } from '@/integrations/supabase/client';

export const initializeSyncfusion = async () => {
  console.log('Initializing Syncfusion license...');
  
  try {
    // Try to get the license key from Supabase edge function
    console.log('Calling Supabase edge function for license key...');
    const { data, error } = await supabase.functions.invoke('get-syncfusion-key');
    
    if (error) {
      console.error('Error calling edge function:', error);
      throw new Error(`Edge function error: ${error.message}`);
    }
    
    console.log('Edge function response:', data);
    
    if (data?.licenseKey) {
      console.log('License key retrieved successfully, length:', data.licenseKey.length);
      registerLicense(data.licenseKey.trim());
      console.log('Syncfusion license registered successfully');
      return true;
    } else {
      console.warn('No license key found in edge function response');
      console.warn('Please ensure SYNCFUSION_LICENSE_KEY is set in Supabase Edge Functions secrets');
      return false;
    }
  } catch (error) {
    console.error('Error initializing Syncfusion license:', error);
    console.warn('Syncfusion will run in trial mode with license validation messages');
    return false;
  }
};
