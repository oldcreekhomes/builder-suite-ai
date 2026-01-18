/**
 * Utility functions for bill note formatting and parsing
 */

export interface ParsedNote {
  userName: string;
  date: string;
  content: string;
  isLegacy: boolean;
}

/**
 * Format a new bill note with user attribution and timestamp
 * Format: "UserName | MM/DD/YYYY: Note content"
 */
export function formatBillNote(userName: string, noteContent: string): string {
  const timestamp = new Date().toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric' 
  });
  return `${userName} | ${timestamp}: ${noteContent.trim()}`;
}

/**
 * Parse notes string into individual structured notes
 * Handles both new format (with | separator) and legacy format
 */
export function parseBillNotes(notesString: string | null): ParsedNote[] {
  if (!notesString || !notesString.trim()) {
    return [];
  }

  // Split by double newlines to separate individual notes
  const noteBlocks = notesString.split(/\n\n+/).filter(block => block.trim());
  
  return noteBlocks.map(block => {
    const trimmedBlock = block.trim();
    
    // Try to match new format: "UserName | MM/DD/YYYY: Note content"
    const newFormatMatch = trimmedBlock.match(/^(.+?)\s*\|\s*(\d{2}\/\d{2}\/\d{4}):\s*(.+)$/s);
    
    if (newFormatMatch) {
      return {
        userName: newFormatMatch[1].trim(),
        date: newFormatMatch[2],
        content: newFormatMatch[3].trim(),
        isLegacy: false,
      };
    }
    
    // Try to match old format: "UserName: Note content" (without date)
    const oldFormatMatch = trimmedBlock.match(/^(.+?):\s*(.+)$/s);
    
    if (oldFormatMatch) {
      return {
        userName: oldFormatMatch[1].trim(),
        date: '',
        content: oldFormatMatch[2].trim(),
        isLegacy: true,
      };
    }
    
    // Completely legacy note with no attribution
    return {
      userName: '',
      date: '',
      content: trimmedBlock,
      isLegacy: true,
    };
  });
}

/**
 * Append a new note to existing notes string
 */
export function appendBillNote(existingNotes: string | null, newNote: string): string {
  if (!existingNotes || !existingNotes.trim()) {
    return newNote;
  }
  return `${newNote}\n\n${existingNotes}`;
}
