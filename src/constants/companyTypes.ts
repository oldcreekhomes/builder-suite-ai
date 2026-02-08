// Comprehensive list of company types for the BuilderSuite Marketplace
// Organized by category for reference, but exported as a flat list for the autocomplete

export const COMPANY_TYPES = [
  // Financial & Legal Services
  "Accountant/CPA",
  "Appraiser",
  "Attorney/Legal Services",
  "Construction Lender",
  "Mortgage Lender",
  "Insurance Agent",
  "Surety Bond Provider",
  "Title Company",
  
  // Design & Engineering
  "Architect",
  "Civil Engineer",
  "Geotechnical Engineer",
  "Interior Designer",
  "Landscape Architect",
  "Land Surveyor",
  "MEP Engineer",
  "Structural Engineer",
  
  // Site Work & Foundation
  "Concrete Contractor",
  "Demolition Contractor",
  "Excavation Contractor",
  "Foundation Contractor",
  "Grading Contractor",
  "Paving Contractor",
  "Septic System Installer",
  "Utility Contractor",
  
  // Structural Trades
  "Framing Contractor",
  "Masonry Contractor",
  "Roofing Contractor",
  "Siding Contractor",
  "Steel Fabricator",
  "Truss Manufacturer",
  
  // Mechanical Systems
  "Electrical Contractor",
  "Fire Protection/Sprinkler",
  "HVAC Contractor",
  "Plumbing Contractor",
  "Solar/Renewable Energy",
  "Low Voltage/Security",
  
  // Interior Trades
  "Cabinet Maker",
  "Countertop Fabricator",
  "Drywall Contractor",
  "Flooring Contractor",
  "Insulation Contractor",
  "Painter",
  "Tile Contractor",
  "Window/Door Installer",
  
  // Exterior & Landscaping
  "Deck/Fence Contractor",
  "Garage Door Installer",
  "Gutter Contractor",
  "Landscaping Contractor",
  "Pool/Spa Contractor",
  "Irrigation Contractor",
  
  // Materials & Equipment
  "Building Materials Supplier",
  "Equipment Rental",
  "Fixture Supplier",
  "Lumber Yard",
  "Ready-Mix Concrete",
  
  // Government & Other
  "Municipality/Permitting",
  "Utility Company",
  "Home Warranty Provider",
  "Real Estate Agent",
  "Other"
] as const;

export type CompanyType = typeof COMPANY_TYPES[number];
