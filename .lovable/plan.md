

## Update Matt Gray Quote on Landing Page

### Current Quote (Lines 218-226)
The Founder's Message section currently has three paragraphs with the old quote text.

### New Quote
The quote will be updated to:

**Paragraph 1:**
> "We didn't want to build software — we had no choice.

**Paragraph 2:**
> We needed an application that had accounting, historical cost tracking, chat, budgets, invoice automation and much more.

**Paragraph 3:**
> Instead of asking someone else to build us a Home Builder application, we built our own."

### File to Update

**`src/pages/Landing.tsx`** (Lines 218-226)

Replace the three existing `<p>` tags with the new quote content, maintaining the same styling (`text-lg md:text-xl text-muted-foreground leading-relaxed italic`).

### Technical Details

The change involves updating the text content within the Right Column quote section while keeping the exact same HTML structure and CSS classes. The quote marks will be placed at the beginning of the first paragraph and at the end of the last paragraph to maintain the visual quote styling.

