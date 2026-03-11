

## Plan: Fix Print Footer, Article 4, and Add Scope of Work Content

### Issues to Fix

**1. Footer: Make text black and add page numbers**
- Current: `color: #999` (light gray), no page numbers
- Fix: Change footer text color to `#000` (black), add "Page X of Y" on the right
- Since `counter(page)` with CSS is unreliable across browsers in window.open, we'll manually inject page numbers by giving each page div a known page number and total (5 pages)

**2. Article 4: Remove "(PAY-IF-PAID)" and rewrite body**
- In `useTemplateContent.ts`, change Article 4:
  - Title: `"PAYMENTS"` (remove parentheses and PAY-IF-PAID)
  - Body: `"Invoices must be sent to our accounting department at ap@oldbridgeports.com, and payments will be made within thirty days of receipt."`

**3. Pre-populate Exhibit A – Scope of Work**
- Set default `scopeOfWork` field to a detailed breakdown matching line items A-K, with sub-items for each phase:

```
A. General Conditions/Mobilization
   1. Project mobilization and site setup
   2. Temporary facilities and utilities
   3. Construction entrance and access roads
   4. Project management and supervision
   5. Demobilization upon completion

B. Erosion Control
   1. Installation of silt fence perimeter controls
   2. Construction entrance stabilization
   3. Sediment basin installation and maintenance
   4. Inlet protection devices
   5. Ongoing erosion control maintenance and inspections

C. Site Demolition
   1. Removal of existing pavement and curbing
   2. Demolition of existing site utilities
   3. Removal of existing fencing and signage
   4. Hauling and disposal of demolition debris

D. Building Demolition
   1. Demolition of existing structures
   2. Foundation removal and disposal
   3. Utility disconnection and capping
   4. Debris hauling and landfill disposal

E. Clearing
   1. Tree removal and stump grinding
   2. Brush clearing and disposal
   3. Topsoil stripping and stockpiling
   4. Root removal from grading areas

F. Excavation and Grading
   1. Mass earthwork cut and fill operations
   2. Building pad preparation and compaction
   3. Fine grading for roadways and parking
   4. Subgrade preparation and proof rolling
   5. Import/export of fill material as required
   6. Compaction testing coordination

G. Sanitary
   1. Sanitary sewer main installation
   2. Sanitary sewer lateral connections
   3. Manhole installation
   4. Testing and inspection coordination
   5. Trench backfill and compaction

H. Storm Drain
   1. Storm drain pipe installation
   2. Storm drain structure and inlet installation
   3. Stormwater management facility construction
   4. Outfall construction and stabilization
   5. Testing and video inspection

I. Water
   1. Water main installation
   2. Water service lateral connections
   3. Fire hydrant installation
   4. Valve and fitting installation
   5. Pressure testing and bacteriological testing

J. Site Concrete
   1. Concrete curb and gutter installation
   2. Sidewalk construction
   3. Concrete pad and apron installation
   4. ADA ramp construction
   5. Concrete dumpster pads

K. Asphalt and Paving
   1. Aggregate base course installation
   2. Asphalt base course paving
   3. Asphalt surface course paving
   4. Pavement markings and striping
   5. Speed bumps and signage
```

### Files Modified
- `src/hooks/useTemplateContent.ts` — Article 4 title/body update
- `src/components/templates/SubcontractorContractForm.tsx` — Footer color to black, add page numbers, default scopeOfWork content

