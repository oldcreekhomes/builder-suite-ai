
import { registerLicense } from '@syncfusion/ej2-base';

export const initializeSyncfusion = () => {
  // Register Syncfusion license
  const licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
  if (licenseKey) {
    registerLicense(licenseKey);
  } else {
    console.warn('Syncfusion license key not found. Some features may be limited.');
  }
};
