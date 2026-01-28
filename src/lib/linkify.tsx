import React from 'react';

/**
 * Opens an external URL in a new tab with full opener detachment.
 * This technique bypasses COOP restrictions that block tabs opened from sandboxed iframes.
 */
function safeOpenExternal(href: string): void {
  // Step 1: Open about:blank synchronously (satisfies popup blockers as user gesture)
  const newWindow = window.open('about:blank', '_blank');
  
  if (!newWindow) {
    // Popup was blocked, fall back to same-tab navigation
    window.location.assign(href);
    return;
  }
  
  try {
    // Step 2: Hard-detach the opener relationship
    newWindow.opener = null;
    
    // Step 3: Navigate to the target URL
    newWindow.location.href = href;
    
    // Step 4: Focus the new window
    newWindow.focus();
  } catch (error) {
    // Fallback if any step fails
    try {
      window.open(href, '_blank');
    } catch {
      window.location.assign(href);
    }
  }
}

/**
 * Converts URLs in text to clickable links.
 * Supports http://, https://, and www. prefixed URLs.
 */
export function linkifyText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <span
          key={index}
          role="link"
          tabIndex={0}
          className="underline hover:opacity-80 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            safeOpenExternal(href);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              safeOpenExternal(href);
            }
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}
