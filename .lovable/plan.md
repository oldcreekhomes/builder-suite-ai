

## Add Logo with Home Link to Auth Pages

Add the BuilderSuite ML logo in the top-left corner of both the Sign In/Sign Up page (`/auth`) and the Marketplace Signup page (`/auth/marketplace`), linking back to the homepage (`/`). This gives users a clear, familiar way to navigate back.

### Changes

**1. Auth page (`src/pages/Auth.tsx`)**
- Import the logo from `src/assets/buildersuiteai-logo.png`
- Add a fixed/absolute-positioned logo in the top-left corner wrapped in a `<Link to="/">`
- Apply to both the main auth view and the "Check Your Email" success view
- Remove or keep the "Welcome to BuilderSuite ML" text heading (the logo replaces its branding role, but the welcome text can stay for context)

**2. Marketplace Signup page (`src/pages/MarketplaceSignup.tsx`)**
- Same treatment: import the logo and add a top-left `<Link to="/">` with the logo image

### Visual Approach
- Logo positioned top-left with padding (`p-6`), using `absolute` positioning so it doesn't interfere with the centered card layout
- Logo sized at roughly 40-48px height, consistent with sidebar branding
- Hover opacity transition for interactivity feedback
- On mobile, the logo stays top-left but at a slightly smaller size

### Technical Details
- Import: `import logo from "@/assets/buildersuiteai-logo.png"`
- Component: `<Link to="/"><img src={logo} alt="BuilderSuite ML" className="h-10 hover:opacity-80 transition-opacity" /></Link>`
- Wrapper div: `<div className="absolute top-6 left-6">...</div>` inside the outer `min-h-screen` container (which needs `relative` added)

