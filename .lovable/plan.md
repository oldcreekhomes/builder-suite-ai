

## Fix Signup Success Screen: Center + Simplify

### Changes to `src/pages/Auth.tsx`

**1. Fix centering / background issue**
- Remove `bg-muted/30` from the success screen's wrapper div (this has caused the left-shift issue repeatedly)
- Keep `min-h-screen flex items-center justify-center p-4` for proper centering

**2. Remove the "What happens next?" box**
- Delete the entire `<div className="bg-muted/50 ...">` block containing the bullet list (lines 42-50)

The success screen will show only:
- Checkmark icon
- "Check Your Email!" heading
- "We've sent a verification link to **email**"
- "Click the link in your email..." helper text
- "Go to Sign In" button

