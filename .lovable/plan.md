

## Add Advantage Landscape + Crystal Partin (Skip Bulk Cleanup)

### Step 1: Delete the 2 existing bad "Advantage Landscape" duplicates

Remove the two incorrect entries (Maryland address, wrong contact info) from a previous builder import:
- ID: `7c172b20-2361-4448-8df4-d2d14d5cd7d8`
- ID: `1f2ad73e-b674-46c0-b512-0b302affd37d`

### Step 2: Insert the correct Advantage Landscape company

**marketplace_companies:**
- Company Name: Advantage Landscape
- Company Type: Landscaping Contractor
- Phone: 703-398-4715
- Website: https://advantagelandscape.com/
- Source: manual

**marketplace_company_representatives:**
- First Name: Crystal
- Last Name: Partin
- Title: Director of Business Development
- Email: cpartin@advantagelandscape.com
- Phone: 703-398-4715
- Linked to the new Advantage Landscape company record

### Technical Details

All operations use direct SQL data statements (DELETE + INSERT) via the database insert tool -- no schema changes or code changes needed.

