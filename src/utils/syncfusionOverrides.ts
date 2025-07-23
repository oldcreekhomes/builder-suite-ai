// Global overrides to completely disable Syncfusion notifications
// This prevents any toast notifications from appearing at the JavaScript level

export const disableSyncfusionNotifications = () => {
  // Override common Syncfusion notification methods
  if (typeof window !== 'undefined') {
    // Store original console methods to avoid breaking other functionality
    const originalConsole = { ...console };
    
    // Override potential Syncfusion notification functions
    (window as any).ej = (window as any).ej || {};
    (window as any).ej.showMessage = () => {};
    (window as any).ej.showToast = () => {};
    (window as any).ej.notification = () => {};
    
    // Try to override any existing Toast component instances
    if ((window as any).SF && (window as any).SF.showToast) {
      (window as any).SF.showToast = () => {};
    }
    
    // Override Syncfusion's internal notification methods
    const syncfusionElements = ['e-toast', 'e-notification', 'e-toast-container'];
    syncfusionElements.forEach(className => {
      const style = document.createElement('style');
      style.textContent = `.${className} { display: none !important; }`;
      document.head.appendChild(style);
    });
    
    console.log('Syncfusion notifications disabled globally');
  }
};

// Auto-execute when imported
disableSyncfusionNotifications();