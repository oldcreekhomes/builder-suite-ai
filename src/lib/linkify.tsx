import React from 'react';

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
            window.open(href, '_blank', 'noopener,noreferrer');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
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
