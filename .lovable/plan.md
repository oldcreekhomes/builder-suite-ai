

## Add Path Selection Modal to Feature Row Buttons

### Overview
When users click "Sign Up" on any feature row (Accounting, AI Bill Management, etc.), instead of navigating directly to the builder signup, a modal will appear asking them to choose their path: Home Builder or Subcontractor/Vendor.

### Implementation Approach

**Modify `src/components/FeatureRow.tsx`**

1. **Add new state** for the path selection modal:
   - `isPathModalOpen` - controls the modal visibility

2. **Replace the direct Link with a Button** that opens the modal:
   - Currently: `<Link to={buttonLink}>` wraps the button
   - New: A standalone `<Button>` with an `onClick` handler

3. **Add the Path Selection Modal** with two options:
   - **Home Builder card** - Links to `/auth?tab=signup`
   - **Subcontractor/Vendor card** - Links to `/auth/marketplace`

4. **Add new optional prop** to control this behavior:
   - `showPathModal?: boolean` - when true, shows the modal instead of direct navigation
   - Default: `false` (maintains backward compatibility)

### File Changes

**`src/components/FeatureRow.tsx`**

Add imports:
- `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` from ui/card
- `HardHat`, `Handshake` icons from lucide-react
- `useNavigate` from react-router-dom

Add new prop to interface:
```typescript
showPathModal?: boolean;
```

Add state:
```typescript
const [isPathModalOpen, setIsPathModalOpen] = useState(false);
```

Replace button/link logic (lines 63-68):
```typescript
{showPathModal ? (
  <Button 
    variant="outline" 
    size="lg" 
    className="group"
    onClick={() => setIsPathModalOpen(true)}
  >
    {buttonText}
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
  </Button>
) : (
  <Button variant="outline" size="lg" asChild className="group">
    <Link to={buttonLink}>
      {buttonText}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  </Button>
)}
```

Add the Path Selection Modal (after the image modal):
```typescript
{/* Path Selection Modal */}
<Dialog open={isPathModalOpen} onOpenChange={setIsPathModalOpen}>
  <DialogContent className="max-w-2xl">
    <DialogTitle className="text-center text-2xl font-bold">
      Which best describes you?
    </DialogTitle>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {/* Home Builder Option */}
      <Card className="cursor-pointer hover:border-primary transition-colors" 
            onClick={() => navigate('/auth?tab=signup')}>
        <CardHeader className="text-center pb-2">
          <HardHat className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-lg">I'm a Home Builder</CardTitle>
          <CardDescription>General Contractor or Remodel Contractor</CardDescription>
        </CardHeader>
      </Card>
      
      {/* Subcontractor Option */}
      <Card className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate('/auth/marketplace')}>
        <CardHeader className="text-center pb-2">
          <Handshake className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-lg">I'm a Subcontractor</CardTitle>
          <CardDescription>Vendor, Supplier, or Service Provider</CardDescription>
        </CardHeader>
      </Card>
    </div>
  </DialogContent>
</Dialog>
```

---

**`src/pages/Landing.tsx`**

Add `showPathModal={true}` prop to all 6 FeatureRow components:

- Line 289-300: Accounting FeatureRow
- Line 302-312: AI Bill Management FeatureRow
- Line 314-325: Bid Management FeatureRow  
- Line 327-337: Document Management FeatureRow
- Line 339-350: Gantt Scheduling FeatureRow
- Line 352-362: Team Communication FeatureRow

Example:
```typescript
<FeatureRow
  label="ACCOUNTING"
  title="Streamlined Financial Management"
  description="..."
  buttonText="Sign Up"
  buttonLink="/auth?tab=signup"
  showPathModal={true}  // ADD THIS
  ...
/>
```

### User Experience Flow

```text
User clicks "Sign Up" on any feature row
           ↓
   Modal appears asking:
  "Which best describes you?"
           ↓
  ┌─────────────┬─────────────┐
  │  🏠 Home    │  🤝 Sub-    │
  │  Builder    │  contractor │
  └─────────────┴─────────────┘
           ↓
  User clicks their choice
           ↓
  Navigates to appropriate signup path
```

