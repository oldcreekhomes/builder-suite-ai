

## Insurance Tab Button Layout Reorganization

### Current State
The Insurance tab has:
- A "Upload New Certificate" button on the left side (inside `InsuranceContent`)
- A "View Certificate" button on the right side (inside `InsuranceContent`) 
- At the bottom, a separate footer row with "Cancel" and "Update Company" buttons

Since users can now view certificates via the clickable PDF icons in the Policy column, the "View Certificate" button is redundant.

### Changes to Make

**1. Remove the "View Certificate" button from InsuranceContent**

File: `src/components/companies/CompanyInsuranceSection.tsx`

Delete the entire grid containing both buttons (lines 421-447) and replace with nothing - the "Upload New Certificate" button will move to the dialog footer.

**2. Expose an "Upload Certificate" action from InsuranceContent**

Add a callback prop to `InsuranceContent` that the parent `EditCompanyDialog` can use to trigger the upload UI:
- Add `onUploadClick?: () => void` prop
- Add a way for the parent to trigger showing the upload UI

**3. Update EditCompanyDialog footer to include "Upload Certificate" when on Insurance tab**

File: `src/components/companies/EditCompanyDialog.tsx`

Change the footer from:
```
[Cancel] [Update Company]
```

To (when on Insurance tab):
```
[Upload Certificate]                    [Cancel] [Update Company]
```

The footer will use `justify-between` to push the Upload button to the left and Cancel/Update to the right.

### Implementation Details

**CompanyInsuranceSection.tsx changes:**

1. Add new props to `InsuranceContentProps`:
   - `showUploadUI?: boolean` - controlled by parent
   - `onShowUploadChange?: (show: boolean) => void` - callback to parent

2. Remove the button grid (lines 421-447)

3. Export the upload state control so parent can manage it

**EditCompanyDialog.tsx changes:**

1. Add state: `const [showInsuranceUpload, setShowInsuranceUpload] = useState(false)`

2. Pass props to InsuranceContent:
   ```tsx
   <InsuranceContent 
     companyId={company.id}
     homeBuilder=""
     showUploadUI={showInsuranceUpload}
     onShowUploadChange={setShowInsuranceUpload}
   />
   ```

3. Update footer to conditionally show Upload button:
   ```tsx
   <div className="flex justify-between pt-4 border-t">
     <div>
       {activeTab === 'insurance' && !showInsuranceUpload && (
         <Button
           type="button"
           variant="outline"
           onClick={() => setShowInsuranceUpload(true)}
         >
           <Upload className="h-4 w-4 mr-2" />
           Upload Certificate
         </Button>
       )}
     </div>
     <div className="flex space-x-4">
       <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
         Cancel
       </Button>
       <Button type="submit" disabled={updateCompanyMutation.isPending}>
         {updateCompanyMutation.isPending ? "Updating..." : "Update Company"}
       </Button>
     </div>
   </div>
   ```

### Files to Modify

1. **`src/components/companies/CompanyInsuranceSection.tsx`**
   - Add `showUploadUI` and `onShowUploadChange` props to `InsuranceContentProps`
   - Use these props to control the upload UI visibility instead of internal state
   - Remove the button grid with "Upload New Certificate" and "View Certificate"

2. **`src/components/companies/EditCompanyDialog.tsx`**
   - Add `showInsuranceUpload` state
   - Import `Upload` icon from lucide-react
   - Pass new props to `InsuranceContent`
   - Update footer layout to be `justify-between` with Upload button on left

### Visual Result

When on the Insurance tab, the footer will look like:

```
[Upload Certificate]                                    [Cancel] [Update Company]
```

When on other tabs (Company Information, Representatives), the footer will look like:

```
                                                        [Cancel] [Update Company]
```

