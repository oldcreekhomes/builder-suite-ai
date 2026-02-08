// Mapping of our company types to Google Places API search parameters
// Uses either 'type' (Google Place Type) or 'keyword' (text search)

export interface GooglePlacesMapping {
  type?: string;
  keyword?: string;
}

export const GOOGLE_PLACES_MAPPING: Record<string, GooglePlacesMapping> = {
  // Financial & Legal Services
  "Accountant/CPA": { keyword: "accountant CPA" },
  "Appraiser": { keyword: "real estate appraiser" },
  "Attorney/Legal Services": { type: "lawyer" },
  "Construction Lender": { keyword: "construction loan lender" },
  "Mortgage Lender": { keyword: "mortgage lender" },
  "Insurance Agent": { type: "insurance_agency" },
  "Surety Bond Provider": { keyword: "surety bond" },
  "Title Company": { keyword: "title company" },
  
  // Design & Engineering
  "Architect": { keyword: "architect" },
  "Civil Engineer": { keyword: "civil engineering firm" },
  "Geotechnical Engineer": { keyword: "geotechnical engineering" },
  "Interior Designer": { keyword: "interior designer" },
  "Landscape Architect": { keyword: "landscape architect" },
  "Land Surveyor": { keyword: "land surveyor" },
  "MEP Engineer": { keyword: "mechanical electrical plumbing engineer" },
  "Structural Engineer": { keyword: "structural engineer" },
  
  // Site Work & Foundation
  "Concrete Contractor": { keyword: "concrete contractor" },
  "Demolition Contractor": { keyword: "demolition contractor" },
  "Excavation Contractor": { keyword: "excavation contractor" },
  "Foundation Contractor": { keyword: "foundation contractor" },
  "Grading Contractor": { keyword: "grading contractor" },
  "Paving Contractor": { keyword: "paving contractor" },
  "Septic System Installer": { keyword: "septic system installer" },
  "Utility Contractor": { keyword: "utility contractor" },
  
  // Structural Trades
  "Framing Contractor": { keyword: "framing contractor" },
  "Masonry Contractor": { keyword: "masonry contractor" },
  "Roofing Contractor": { type: "roofing_contractor" },
  "Siding Contractor": { keyword: "siding contractor" },
  "Steel Fabricator": { keyword: "steel fabricator" },
  "Truss Manufacturer": { keyword: "truss manufacturer" },
  
  // Mechanical Systems
  "Electrical Contractor": { type: "electrician" },
  "Fire Protection/Sprinkler": { keyword: "fire sprinkler contractor" },
  "HVAC Contractor": { keyword: "HVAC contractor" },
  "Plumbing Contractor": { type: "plumber" },
  "Solar/Renewable Energy": { keyword: "solar installer" },
  "Low Voltage/Security": { keyword: "security system installer" },
  
  // Interior Trades
  "Cabinet Maker": { keyword: "cabinet maker" },
  "Countertop Fabricator": { keyword: "countertop fabricator" },
  "Drywall Contractor": { keyword: "drywall contractor" },
  "Flooring Contractor": { type: "flooring_contractor" },
  "Insulation Contractor": { keyword: "insulation contractor" },
  "Painter": { type: "painter" },
  "Tile Contractor": { keyword: "tile contractor" },
  "Window/Door Installer": { keyword: "window door installer" },
  
  // Exterior & Landscaping
  "Deck/Fence Contractor": { keyword: "deck fence contractor" },
  "Garage Door Installer": { keyword: "garage door installer" },
  "Gutter Contractor": { keyword: "gutter contractor" },
  "Landscaping Contractor": { keyword: "landscaper" },
  "Pool/Spa Contractor": { keyword: "pool contractor" },
  "Irrigation Contractor": { keyword: "irrigation contractor" },
  
  // Materials & Equipment
  "Building Materials Supplier": { type: "hardware_store" },
  "Equipment Rental": { keyword: "equipment rental" },
  "Fixture Supplier": { keyword: "plumbing fixtures supplier" },
  "Lumber Yard": { keyword: "lumber yard" },
  "Ready-Mix Concrete": { keyword: "ready mix concrete" },
  
  // Government & Other
  "Municipality/Permitting": { type: "local_government_office" },
  "Utility Company": { keyword: "utility company" },
  "Home Warranty Provider": { keyword: "home warranty" },
  "Real Estate Agent": { type: "real_estate_agency" },
  "Other": { keyword: "contractor" },
};

// Washington D.C. coordinates (center point for searches)
export const DC_CENTER = {
  lat: 38.9072,
  lng: -77.0369,
};

// 50 miles in meters (max radius for Google Places is 50,000m, so we'll do overlapping searches)
export const FIFTY_MILES_METERS = 80467;
export const MAX_GOOGLE_RADIUS = 50000;

// Categories with their company types for filtering UI (alphabetized)
export const COMPANY_TYPE_CATEGORIES = [
  {
    name: "Design & Engineering",
    types: ["Architect", "Civil Engineer", "Geotechnical Engineer", "Interior Designer", "Land Surveyor", "Landscape Architect", "MEP Engineer", "Structural Engineer"],
  },
  {
    name: "Exterior & Landscaping",
    types: ["Deck/Fence Contractor", "Garage Door Installer", "Gutter Contractor", "Irrigation Contractor", "Landscaping Contractor", "Pool/Spa Contractor"],
  },
  {
    name: "Financial Services",
    types: ["Accountant/CPA", "Appraiser", "Construction Lender", "Insurance Agent", "Mortgage Lender", "Surety Bond Provider", "Title Company"],
  },
  {
    name: "Government & Other",
    types: ["Home Warranty Provider", "Municipality/Permitting", "Other", "Real Estate Agent", "Utility Company"],
  },
  {
    name: "Interior Trades",
    types: ["Cabinet Maker", "Countertop Fabricator", "Drywall Contractor", "Flooring Contractor", "Insulation Contractor", "Painter", "Tile Contractor", "Window/Door Installer"],
  },
  {
    name: "Legal Services",
    types: ["Attorney/Legal Services"],
  },
  {
    name: "Materials & Equipment",
    types: ["Building Materials Supplier", "Equipment Rental", "Fixture Supplier", "Lumber Yard", "Ready-Mix Concrete"],
  },
  {
    name: "Mechanical Systems",
    types: ["Electrical Contractor", "Fire Protection/Sprinkler", "HVAC Contractor", "Low Voltage/Security", "Plumbing Contractor", "Solar/Renewable Energy"],
  },
  {
    name: "Site Work & Foundation",
    types: ["Concrete Contractor", "Demolition Contractor", "Excavation Contractor", "Foundation Contractor", "Grading Contractor", "Paving Contractor", "Septic System Installer", "Utility Contractor"],
  },
  {
    name: "Structural Trades",
    types: ["Framing Contractor", "Masonry Contractor", "Roofing Contractor", "Siding Contractor", "Steel Fabricator", "Truss Manufacturer"],
  },
];
