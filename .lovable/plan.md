
# Fix: File Attachments Visibility in Chat Messages

## Problem

File attachments in chat are hard to see, especially when received from other users:
- **Your messages (blue bubble)**: White file icon on blue = visible
- **Other's messages (gray bubble)**: White file icon on gray = barely visible

Current file icons use `text-white` for ALL file types, and are placed inside the colored bubble.

---

## Solution

Use **color-coded file icons** (like the bidding section already does) with a **neutral white background** for all files, making them clearly visible for both senders:
- **PDF files**: Red icon
- **Excel files**: Green icon
- **Word files**: Blue icon
- **Other files**: Gray icon

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/messages/SimpleMessagesList.tsx` | Update file icon colors and add white background card |

---

## Technical Changes

### 1. Update `getFileIcon` function (lines 55-98)

**Before:** All icons are white
```typescript
return <File className="w-4 h-4 text-white" />;
```

**After:** Color-coded by file type
```typescript
case 'pdf':
  return <File className="w-5 h-5 text-red-600" />;
case 'doc':
case 'docx':
  return <FileText className="w-5 h-5 text-blue-600" />;
case 'xls':
case 'xlsx':
case 'csv':
  return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
// ... etc with appropriate colors
```

### 2. Update `renderFileAttachment` function (lines 115-127)

**Before:** No background, just floating icon
```typescript
<div
  className="inline-flex items-center p-2 rounded-lg cursor-pointer hover:opacity-80"
  onClick={() => openExternal(url)}
>
  {getFileIcon(fileName)}
</div>
```

**After:** White card with filename and download hint
```typescript
<div
  className="inline-flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 shadow-sm"
  onClick={() => openExternal(url)}
>
  {getFileIcon(fileName)}
  <span className="text-sm text-gray-700 truncate max-w-[150px]">
    {getCleanFileName(fileName)}
  </span>
</div>
```

---

## Visual Result

| Before | After |
|--------|-------|
| White icon on gray bubble (invisible) | White card with red PDF icon + filename |
| White icon on blue bubble (ok but basic) | White card with red PDF icon + filename |

The file attachment will now appear as a clear, clickable card regardless of message bubble color, with:
- Color-coded file icon (red for PDF, green for Excel, etc.)
- Truncated filename visible
- Consistent white background
- Clean hover effect
