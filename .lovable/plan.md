

# Standardize Button Text on Join Marketplace Page

## Overview
Update all four FeatureRow buttons on the Join Marketplace page to consistently say "Join the Marketplace" instead of the current varied text.

## Current Button Text
1. **FREE LISTING row**: "Join Free"
2. **VERIFIED PROFILE row**: "Create Profile"
3. **DIRECT CONNECTIONS row**: "Get Started"
4. **ZERO FRICTION row**: "Learn More"

## New Button Text
All four buttons will display: **"Join the Marketplace"**

## File to Change

### `src/pages/features/JoinMarketplace.tsx`

Update the `buttonText` prop on each of the four `FeatureRow` components:

| Row | Current | New |
|-----|---------|-----|
| FREE LISTING | `buttonText="Join Free"` | `buttonText="Join the Marketplace"` |
| VERIFIED PROFILE | `buttonText="Create Profile"` | `buttonText="Join the Marketplace"` |
| DIRECT CONNECTIONS | `buttonText="Get Started"` | `buttonText="Join the Marketplace"` |
| ZERO FRICTION | `buttonText="Learn More"` | `buttonText="Join the Marketplace"` |

## Technical Details

Four simple text changes in the same file. Each FeatureRow already links to `/auth/marketplace`, so only the button labels need updating.

