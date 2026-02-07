

## Create SEO-Optimized About Us Page

### Overview
Create a comprehensive About Us page that tells the BuilderSuite story, emphasizing that it was built by builders who couldn't find existing software that solved their real problems. The page will be designed to provide rich content for Google to crawl and index.

### Key Messaging Themes

1. **Origin Story** - BuilderSuite was born out of necessity, not opportunity. The founders tried every construction management software on the market and none of them understood the real problems builders face.

2. **Old Creek Homes Connection** - This software is actively used daily by Old Creek Homes, LLC. Every bug, every improvement, every feature comes from real-world use on actual construction projects.

3. **Continuous Improvement** - Unlike competitors who have a "set it and forget it" mentality, BuilderSuite is updated constantly based on daily discoveries and user feedback.

4. **Builder-First Philosophy** - Every feature is designed by people who actually swing hammers and manage budgets, not Silicon Valley engineers who have never set foot on a job site.

### Page Structure

**1. Hero Section**
- Headline: "Built by Builders. For Builders."
- Subheadline: A brief statement about why BuilderSuite exists

**2. The Problem Section**
- Why existing solutions failed
- The frustration of using software built by people who don't understand construction
- Specific pain points: accounting integration, lack of updates, unresponsive support

**3. Our Story Section**
- How Old Creek Homes tried every platform (CoConstruct, JobTread, BuilderTrend, BuildTools)
- The decision to build their own solution
- Matt Gray's role as founder

**4. Our Philosophy Section**
- Daily active use on real projects
- Continuous updates and improvements
- Issues are fixed in days, not years
- Direct feedback loop from job site to software

**5. The Old Creek Homes Difference**
- Photo/branding for Old Creek Homes
- How many projects managed
- Real-world validation
- The company actively eats their own dog food

**6. Meet the Team Section**
- Founder profile: Matt Gray
- Room for future team members

**7. Our Values Section**
- Builder-first design
- Rapid iteration
- Real-world testing
- Honest pricing

**8. CTA Section**
- Invitation to join and be part of the journey
- Get Started button (with path selection modal)

---

### File Changes

**1. Create `src/pages/AboutUs.tsx`**

New page with all sections described above. Will follow the same design patterns as Landing.tsx:
- Sticky header with navigation
- Alternating section backgrounds
- Consistent typography and spacing
- Rich semantic HTML for SEO (proper heading hierarchy, meta content)
- Path selection modal for CTA buttons

Key content blocks:
- Problem statement with specific competitor mentions
- Old Creek Homes story and daily usage
- Emphasis on continuous updates
- Team/founder section
- Values and philosophy

**2. Update `src/App.tsx`**

Add route for the About Us page:
```typescript
import AboutUs from "./pages/AboutUs";
// ...
<Route path="/about" element={<AboutUs />} />
```

**3. Update `src/pages/Landing.tsx`**

Add "About Us" link to the header navigation (between Sign In and Get Started):
```typescript
<Link to="/about">
  <Button variant="ghost">About Us</Button>
</Link>
```

Also add About Us link to the footer for additional SEO value.

---

### SEO Considerations

- **Semantic HTML**: Use proper h1, h2, h3 hierarchy
- **Rich Content**: Long-form text that Google can index
- **Internal Linking**: Links back to home and signup
- **Keywords**: Construction management, home builder software, project management, QuickBooks alternative
- **Meta Content**: Page-specific title and description (handled by React Helmet or similar if needed)
- **Crawlable Structure**: All content server-rendered and accessible

### Content Draft (Key Sections)

**Hero:**
> "We didn't set out to build software. We had no choice."

**The Problem:**
> We tried every construction management platform on the market. CoConstruct. JobTread. BuilderTrend. BuildTools. And everyone in between.
>
> The problem? They were all built by tech companies that had never managed a construction project. They didn't understand why accounting needs to be at the core, not bolted on. They didn't understand why a schedule that doesn't communicate with subcontractors is useless. They didn't understand that when there's a bug, waiting 2 years for a fix isn't acceptable.
>
> So we stopped waiting for someone else to build what we needed. We built it ourselves.

**Old Creek Homes:**
> BuilderSuite isn't theoretical software built in a vacuum. It's used every single day by Old Creek Homes, LLC, on real construction projects with real budgets and real deadlines.
>
> When we find an issue on the job site, it gets fixed in the software. When we discover a better workflow, it gets added. This is the fundamental difference between BuilderSuite and every other platform: we actually use what we build.

**Values:**
> - **Builder-First**: Every feature starts with "how would this work on the job site?"
> - **Continuous Improvement**: We update BuilderSuite constantly, not annually
> - **Real-World Testing**: If it doesn't work for Old Creek Homes, it doesn't ship
> - **Honest Communication**: When something breaks, we tell you. When it's fixed, you know.

---

### Technical Implementation Notes

- Reuse existing UI components (Card, Button, etc.)
- Match Landing.tsx styling patterns
- Include Path Selection Modal for "Get Started" CTAs
- Responsive design for all screen sizes
- Consistent branding (Building2 icon, color scheme)

