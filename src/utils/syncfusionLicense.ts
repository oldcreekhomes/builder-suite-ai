
import { registerLicense } from '@syncfusion/ej2-base';

export const initializeSyncfusion = () => {
  // Register Syncfusion license
  const licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
  
  console.log('Initializing Syncfusion license...');
  console.log('License key exists:', !!licenseKey);
  console.log('License key length:', licenseKey ? licenseKey.length : 0);
  
  if (licenseKey && licenseKey.trim()) {
    try {
      registerLicense(licenseKey.trim());
      console.log('Syncfusion license registered successfully');
    } catch (error) {
      console.error('Error registering Syncfusion license:', error);
    }
  } else {
    console.warn('Syncfusion license key not found or empty. Some features may be limited.');
    console.warn('Expected environment variable: VITE_SYNCFUSION_LICENSE_KEY');
  }
};
