

## Add Subcontractors: Excel Import with Cost Code Associations

### Overview
When a builder with zero companies navigates to the Companies tab, they see a "Get Started" template dialog (matching the Cost Codes and Chart of Accounts pattern). Since subcontractor data is unique to each builder, there is no "Use Our Template" option -- just **Import from Excel** and **Add Manually**.

### Excel Template Design (2 Sheets)

**Sheet 1: "Companies"**

| Company Name | Type | Address | City | State | Zip Code | Phone | Website | Cost Codes |
|---|---|---|---|---|---|---|---|---|
| ABC Plumbing | Subcontractor | 123 Main St | Austin | TX | 78701 | 512-555-0100 | www.abcplumbing.com | 5000, 5010 |
| XYZ Electric | Subcontractor | 456 Oak Ave | Dallas | TX | 75201 | 214-555-0200 | | 6000 |
| Acme Lumber | Vendor | 789 Pine Rd | Houston | TX | 77001 | 713-555-0300 | | 4000, 4010, 4020 |

The **Cost Codes** column accepts a comma-separated list of cost code numbers (e.g., "5000, 5010"). During import, these are matched against the builder's existing cost codes by code number. Any unrecognized codes are skipped with a warning.

Valid types: Subcontractor, Vendor, Consultant, Lender, Municipality, Utility (defaults to "Subcontractor" if blank or invalid).

**Sheet 2: "Representatives"**

| Company Name | First Name | Last Name | Email | Phone | Title |
|---|---|---|---|---|---|
| ABC Plumbing | John | Smith | john@abcplumbing.com | 512-555-0101 | Owner |
| ABC Plumbing | Jane | Doe | jane@abcplumbing.com | | Estimator |
| XYZ Electric | Mike | Jones | mike@xyzelectric.com | 214-555-0201 | Project Manager |

Representatives are linked by matching **Company Name** exactly. Multiple reps per company are supported. Valid titles: Estimator, Project Manager, Foreman, Superintendent, Sales Rep, Owner, Office Manager, Accountant.

**Notifications**: Left out of the Excel import intentionally. They default to `false` (safe default), and are a per-person decision that builders make when they're ready to start sending bids/POs. Adding 3 boolean columns per rep would clutter the template without much benefit for initial setup.

### Import Logic
1. Fetch the builder's existing cost codes from the database
2. Parse Sheet 1 (Companies): extract company data and parse the comma-separated cost code column
3. Parse Sheet 2 (Representatives): match each rep to a company by name
4. For each company: insert company row, then insert cost code associations (matching code numbers to IDs), then insert its representatives
5. Report summary: "Imported X companies, Y representatives, Z cost code associations"
6. Warnings for: unrecognized cost codes, orphaned reps (company name not found), duplicate company names (skipped)

### Template Dialog Design
Matches the existing pattern exactly (same 520px width, same heading style, same button styles). Two options only:

- **Import from Excel** (outline button, border-foreground)
- **I'll add them manually** (outline button, border-foreground, text-muted-foreground)

Description text: "Your subcontractors, vendors, and suppliers are the backbone of your projects. Choose how you'd like to get started:"

Benefit list with green checkmarks:
- Company details and addresses
- Representative contacts
- Cost code associations
- Ready to bid and schedule

### Files to Create

1. **`src/components/companies/CompaniesTemplateDialog.tsx`**
   - "Get Started" dialog with 2 options (no "Use Our Template" since sub data is unique)
   - Follows exact same visual structure as `CostCodeTemplateDialog`

2. **`src/components/companies/CompaniesExcelImportDialog.tsx`**
   - Upload dialog with download template button
   - Two-sheet Excel parsing with cost code matching
   - Summary toast on success, warnings for issues
   - Same layout as `ExcelImportDialog` but with company-specific logic

### Files to Modify

3. **`src/components/settings/CompaniesTab.tsx`**
   - Add `templateDismissed` state (same pattern as CostCodesTab)
   - Query company count to determine if template dialog should show
   - Wire up template dialog and Excel import dialog
   - Template dialog auto-shows when zero companies exist

4. **`src/hooks/useOnboardingProgress.ts`**
   - Change "Add Subcontractors" link from `/companies` to `/settings?tab=companies`
   - Change "Invite Employees" link from `/employees` to `/settings?tab=employees`
   - Both now correctly route to the consolidated Settings page

