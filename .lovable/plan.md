
# Plan: Make URLs in Chat Messages Clickable

## Problem
When you send a URL in chat (like a YouTube link), it displays as plain text. Users have to copy and paste it instead of being able to click directly on it.

## Solution
Create a utility function that detects URLs in message text and renders them as clickable links that open in a new tab.

## Technical Changes

### 1. Create a Link Parsing Utility
**File: `src/lib/linkify.tsx` (new file)**

Create a function that:
- Detects URLs in text using a regex pattern (http://, https://, www.)
- Returns React elements with URLs wrapped in `<a>` tags
- Preserves the rest of the text as-is

```tsx
export function linkifyText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <a 
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
```

### 2. Update SimpleMessagesList (Floating Chat)
**File: `src/components/messages/SimpleMessagesList.tsx`**

Change line 193-196 from:
```tsx
{message.message_text && (
  <p className="text-sm whitespace-pre-wrap break-words">
    {message.message_text}
  </p>
)}
```

To:
```tsx
{message.message_text && (
  <p className="text-sm whitespace-pre-wrap break-words">
    {linkifyText(message.message_text)}
  </p>
)}
```

### 3. Update MessageBubble (Full Messages Page)
**File: `src/components/messages/MessageBubble.tsx`**

Change line 145 from:
```tsx
<p className="text-sm">{message.message_text}</p>
```

To:
```tsx
<p className="text-sm whitespace-pre-wrap break-words">
  {linkifyText(message.message_text)}
</p>
```

## Visual Result
- URLs in messages will appear underlined
- Clicking a URL opens it in a new browser tab
- The link color inherits from the message bubble (white text on blue for your messages, dark text on gray for others)
- Works in both the floating chat window and the full Messages page

## Files to Create/Modify
1. **Create:** `src/lib/linkify.tsx` - URL parsing utility
2. **Modify:** `src/components/messages/SimpleMessagesList.tsx` - Use linkify for floating chat
3. **Modify:** `src/components/messages/MessageBubble.tsx` - Use linkify for messages page
