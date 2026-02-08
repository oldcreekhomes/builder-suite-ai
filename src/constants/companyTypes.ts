// Comprehensive list of company types for the BuilderSuite Marketplace
// Organized by category with parent-child relationships (alphabetized)

export const COMPANY_TYPE_CATEGORIES: Record<string, string[]> = {
  "Design & Engineering": [
    "Architect",
    "Civil Engineer",
    "Geotechnical Engineer",
    "Interior Designer",
    "Land Surveyor",
    "Landscape Architect",
    "MEP Engineer",
    "Structural Engineer",
  ],
  "Exterior & Landscaping": [
    "Deck/Fence Contractor",
    "Garage Door Installer",
    "Gutter Contractor",
    "Irrigation Contractor",
    "Landscaping Contractor",
    "Pool/Spa Contractor",
  ],
  "Financial Services": [
    "Accountant/CPA",
    "Appraiser",
    "Construction Lender",
    "Insurance Agent",
    "Mortgage Lender",
    "Surety Bond Provider",
    "Title Company",
  ],
  "Government & Other": [
    "Home Warranty Provider",
    "Municipality/Permitting",
    "Other",
    "Real Estate Agent",
    "Utility Company",
  ],
  "Interior Trades": [
    "Cabinet Maker",
    "Countertop Fabricator",
    "Drywall Contractor",
    "Flooring Contractor",
    "Insulation Contractor",
    "Painter",
    "Tile Contractor",
    "Window/Door Installer",
  ],
  "Legal Services": [
    "Attorney/Legal Services",
  ],
  "Materials & Equipment": [
    "Building Materials Supplier",
    "Equipment Rental",
    "Fixture Supplier",
    "Lumber Yard",
    "Ready-Mix Concrete",
  ],
  "Mechanical Systems": [
    "Electrical Contractor",
    "Fire Protection/Sprinkler",
    "HVAC Contractor",
    "Low Voltage/Security",
    "Plumbing Contractor",
    "Solar/Renewable Energy",
  ],
  "Site Work & Foundation": [
    "Concrete Contractor",
    "Demolition Contractor",
    "Excavation Contractor",
    "Foundation Contractor",
    "Grading Contractor",
    "Paving Contractor",
    "Septic System Installer",
    "Utility Contractor",
  ],
  "Structural Trades": [
    "Framing Contractor",
    "Masonry Contractor",
    "Roofing Contractor",
    "Siding Contractor",
    "Steel Fabricator",
    "Truss Manufacturer",
  ],
};

// Flat list for validation and database purposes
export const COMPANY_TYPES = Object.values(COMPANY_TYPE_CATEGORIES).flat();

export type CompanyType = typeof COMPANY_TYPES[number];
