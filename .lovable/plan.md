

## Plan: Update default Scope of Work sections I, J, K and add L

### Problem
The default scope of work text for sections I, J, K doesn't match what the user needs, and section L is missing entirely.

### Changes — `src/components/templates/SubcontractorContractForm.tsx`

Update lines 138–157 to replace sections I, J, K with the content from the screenshot, and add section L:

**I. Water** — Update items to match screenshot:
- Water main installation
- Water service lateral connections by VA American Water
- Fire hydrant installation
- Valve and fitting installation
- Pressure, Fire Marshal and chlorination testing
- Removal, transportation and disposal of spoils

**J. Site Concrete** — Update items:
- Concrete curb and gutter installation
- Sidewalk installations
- Apron installions
- Curb & gutter installations
- Inspection coordination
- Maintenance of Traffic including flaggers
- Removal, transportation and disposal of spoils

**K. Asphalt and Paving** — Update items:
- Aggregate base course installation
- Asphalt base course paving. Assumes demobilization at this point.
- Asphalt surface course paving. 2nd mobilization included
- Removal, transportation and disposal of spoils if needed
- Inspection coordination as required
- Maintenance of Traffic including flaggers

**L. Retaining Walls** (new section):
- Excluded from contract
- Subcontractor must meet with Contractor, prior to starting, to coordinate installation of retaining walls

One file edited: `SubcontractorContractForm.tsx`, lines ~138–157.

