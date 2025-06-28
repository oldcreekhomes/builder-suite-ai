
import { registerLicense } from '@syncfusion/ej2-base';
import { supabase } from '@/integrations/supabase/client';

export const initializeSyncfusion = async () => {
  console.log('Initializing Syncfusion license...');
  
  try {
    // Try to get the license key from Supabase secrets via edge function
    const { data, error } = await supabase.functions.invoke('get-syncfusion-key');
    
    let licenseKey = null;
    
    if (!error && data?.licenseKey) {
      licenseKey = data.licenseKey;
      console.log('License key retrieved from Supabase secrets');
    } else {
      // Fallback to environment variable
      licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
      console.log('Using environment variable fallback');
    }
    
    console.log('License key exists:', !!licenseKey);
    console.log('License key length:', licenseKey ? licenseKey.length : 0);
    
    if (licenseKey && licenseKey.trim()) {
      registerLicense(licenseKey.trim());
      console.log('Syncfusion license registered successfully');
    } else {
      console.warn('Syncfusion license key not found or empty. Some features may be limited.');
      console.warn('Expected secret: VITE_SYNCFUSION_LICENSE_KEY in Supabase');
    }
  } catch (error) {
    console.error('Error initializing Syncfusion license:', error);
    // Fallback to environment variable
    const licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
    if (licenseKey && licenseKey.trim()) {
      registerLicense(licenseKey.trim());
      console.log('Syncfusion license registered via fallback');
    }
  }
};
