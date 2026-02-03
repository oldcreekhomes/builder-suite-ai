

# Remove Filename Text from File Attachments

## Summary

Remove the filename text from file attachments in chat, keeping only the color-coded icon with the white card background.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/messages/SimpleMessagesList.tsx` | Remove the filename span element |

---

## Technical Change

**Location:** Lines 124-126 in `renderFileAttachment`

**Remove this span:**
```typescript
<span className="text-sm text-gray-700 truncate max-w-[150px]">
  {getCleanFileName(fileName)}
</span>
```

**Result:** The file attachment card will show only the color-coded icon (red for PDF, green for Excel, etc.) on a white background, without any filename text. The filename will still appear as a tooltip on hover via the `title` attribute.

