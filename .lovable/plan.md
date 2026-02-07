

## Redesign "Our Story" Page with Compelling Origin Narrative

### Overview
Transform the About Us page into a powerful "Our Story" page that tells the compelling origin of Old Creek Homes and BuilderSuite. The hero will be completely redesigned to showcase the journey from 2018 with Excel and QuickBooks to managing over $100M in the pipeline today.

### Key Narrative Changes

**Origin Story (from user):**
- 2018: Matt Gray started Old Creek Homes with Excel, QuickBooks, and a small pocket of change
- Growth trajectory: 1 home became 2, 2 became 4, 4 became 8
- Today: Over $100 million of homes in the pipeline in less than 8 years
- Needed software that could keep up with exponential growth
- Couldn't wait for other software companies to build features
- Vision: As Old Creek Homes grows, BuilderSuite grows with it

---

### File Changes

**1. Update `src/pages/AboutUs.tsx`**

**Hero Section Redesign (lines 80-90):**

Replace the current simple hero with a Procore-inspired layout featuring:
- Main headline: "Built by Builders. For Builders."
- Subheadline: "We didn't set out to build software. We had no choice."
- Compelling stats row (similar to Procore): 2018 (Founded), $100M+ (In Pipeline), 8 Years (of Growth)
- Rich paragraph telling the origin story

New hero content:
```text
In 2018, Matt Gray started Old Creek Homes, LLC with nothing but 
Excel spreadsheets, QuickBooks, and a small pocket of change.

One home became two. Two became four. Four became eight.

Today, we have over $100 million of homes in the pipeline—in less 
than eight years. We needed software that could keep up with us. 
We couldn't wait for a software company to build features while we 
continued to grow exponentially.

So we built it ourselves.
```

**Add Growth Timeline Section (new section after hero):**

A visual timeline showing key milestones:
- 2018: Founded with Excel & QuickBooks
- Growth: Exponential project growth
- Challenge: Existing software couldn't keep pace
- Solution: Built BuilderSuite from scratch
- Today: $100M+ pipeline, software that grows with us

**Update Vision Statement:**

Add a dedicated vision block:
```text
Our vision is simple: As Old Creek Homes grows, BuilderSuite grows 
with it. We continue to develop features that help us innovate, 
streamline operations, maximize output, and reduce human error.

Every improvement we make for ourselves, we share with you.
```

---

**2. Update `src/pages/Landing.tsx`**

**Change navigation text (line 169):**
- From: `About Us`
- To: `Our Story`

**Update footer link (line 638):**
- From: `About Us`
- To: `Our Story`

---

**3. Update `src/pages/AboutUs.tsx` - Header & Footer**

**Header navigation (line ~39-41):**
- Update to show "Our Story" as current page context

**Footer link (line ~448-449):**
- From: `About`
- To: `Our Story`

---

### Page Section Structure (Revised)

1. **Hero Section** (redesigned)
   - "Built by Builders. For Builders." headline
   - "We didn't set out to build software. We had no choice." subheadline
   - Stats row: 2018 | $100M+ | 8 Years
   - Origin narrative paragraph

2. **Growth Timeline Section** (new)
   - Visual journey from Excel/QuickBooks to $100M pipeline
   - Key milestones highlighted

3. **The Problem Section** (existing, minor refinements)
   - Competitor struggles
   - Why nothing worked

4. **Our Vision Section** (new/enhanced)
   - "As Old Creek Homes grows, BuilderSuite grows"
   - Continuous innovation message

5. **Our Story Section** (existing, refined)
   - Old Creek Homes connection
   - From frustration to innovation

6. **The Old Creek Homes Difference** (existing)
   - Daily usage
   - Same-day fixes

7. **Our Philosophy Section** (existing)
   - Builder-first design values

8. **Why We're Different** (existing)
   - Key differentiators

9. **Meet the Founder** (existing)
   - Matt Gray bio

10. **CTA Section** (existing)
    - Join the journey

---

### Technical Implementation

**New Hero Layout Structure:**
```tsx
{/* Hero Section */}
<section className="py-20 bg-gradient-to-b from-muted to-background">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Main headline */}
    <div className="text-center mb-12">
      <h1>Built by Builders. For Builders.</h1>
      <p>We didn't set out to build software. We had no choice.</p>
    </div>
    
    {/* Stats row */}
    <div className="grid grid-cols-3 gap-8 mb-12">
      <div className="text-center">
        <p className="text-4xl font-bold text-primary">2018</p>
        <p>Founded</p>
      </div>
      <div className="text-center">
        <p className="text-4xl font-bold text-primary">$100M+</p>
        <p>In Pipeline</p>
      </div>
      <div className="text-center">
        <p className="text-4xl font-bold text-primary">8 Years</p>
        <p>of Growth</p>
      </div>
    </div>
    
    {/* Origin Story */}
    <div className="max-w-3xl mx-auto text-center">
      <p>In 2018, Matt Gray started Old Creek Homes...</p>
      <p>One home became two. Two became four...</p>
      <p>So we built it ourselves.</p>
    </div>
  </div>
</section>
```

**Growth Timeline Visual:**
- Horizontal timeline on desktop
- Vertical cards on mobile
- Icons and visual indicators for each milestone

---

### SEO Considerations

- Richer content with specific numbers ($100M, 2018, 8 years)
- Long-form narrative for Google indexing
- Keywords: construction management software, home builder, exponential growth, QuickBooks alternative
- Proper heading hierarchy maintained

