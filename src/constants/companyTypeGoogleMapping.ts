// Mapping of our company types to Google Places API search parameters
// Uses either 'type' (Google Place Type) or 'keyword' (text search)

export interface GooglePlacesMapping {
  type?: string;
  keyword?: string;
}

export const GOOGLE_PLACES_MAPPING: Record<string, GooglePlacesMapping> = {
  // ============ DESIGNERS ============
  "Architect": { keyword: "architect" },
  "Bath Designer": { keyword: "bathroom designer" },
  "Closet Designer": { keyword: "custom closet designer" },
  "Home Theater Designer": { keyword: "home theater design installation" },
  "Interior Designer": { keyword: "interior designer" },
  "Kitchen Designer": { keyword: "kitchen designer" },
  "Landscape Architect": { keyword: "landscape architect" },
  "Lighting Designer": { keyword: "lighting designer" },

  // ============ ENGINEERS ============
  "Civil Engineer": { keyword: "civil engineering firm" },
  "Electrical Engineer": { keyword: "electrical engineering firm" },
  "Environmental Engineer": { keyword: "environmental engineering consultant" },
  "Fire Protection Engineer": { keyword: "fire protection engineer" },
  "Geotechnical Engineer": { keyword: "geotechnical engineering" },
  "Mechanical Engineer": { keyword: "mechanical engineering firm" },
  "MEP Engineer": { keyword: "MEP engineering firm" },
  "Plumbing Engineer": { keyword: "plumbing engineering" },
  "Stormwater Engineer": { keyword: "stormwater management engineering" },
  "Structural Engineer": { keyword: "structural engineer" },
  "Transportation Engineer": { keyword: "transportation engineering" },

  // ============ EQUIPMENT SUPPLIERS ============
  "Crane Rental": { keyword: "crane rental" },
  "Dumpster Rental": { keyword: "dumpster rental" },
  "Equipment Rental": { keyword: "construction equipment rental" },
  "Generator Rental": { keyword: "generator rental" },
  "Heavy Equipment Rental": { keyword: "heavy equipment rental" },
  "Portable Toilet Rental": { keyword: "portable toilet rental construction" },
  "Scaffolding Rental": { keyword: "scaffolding rental" },
  "Tool Rental": { keyword: "tool rental" },

  // ============ EXTERIOR & LANDSCAPING ============
  "Deck Contractor": { keyword: "deck builder contractor" },
  "Driveway Contractor": { keyword: "driveway contractor" },
  "Exterior Painting Contractor": { keyword: "exterior house painter" },
  "Fence Contractor": { keyword: "fence contractor" },
  "Garage Door Installer": { keyword: "garage door installer" },
  "Gutter Contractor": { keyword: "gutter contractor" },
  "Irrigation Contractor": { keyword: "irrigation contractor" },
  "Landscaping Contractor": { keyword: "landscaping contractor" },
  "Lawn Care Service": { keyword: "lawn care service" },
  "Outdoor Living Contractor": { keyword: "outdoor living contractor patio" },
  "Patio Contractor": { keyword: "patio contractor" },
  "Paving Contractor": { keyword: "paving contractor" },
  "Pool/Spa Contractor": { keyword: "pool contractor" },
  "Pressure Washing Service": { keyword: "pressure washing service" },
  "Tree Service": { keyword: "tree service arborist" },
  "Window Cleaning Service": { keyword: "window cleaning service" },

  // ============ FINANCIAL SERVICES ============
  "Accountant/CPA": { keyword: "accountant CPA" },
  "Appraiser": { keyword: "real estate appraiser" },
  "Commercial Lender": { keyword: "commercial real estate lender" },
  "Construction Lender": { keyword: "construction loan lender" },
  "Financial Advisor": { keyword: "financial advisor" },
  "Insurance Agent": { type: "insurance_agency" },
  "Mortgage Lender": { keyword: "mortgage lender" },
  "Private Money Lender": { keyword: "private money lender hard money" },
  "Surety Bond Provider": { keyword: "surety bond" },
  "Tax Consultant": { keyword: "tax consultant" },
  "Title Company": { keyword: "title company" },

  // ============ GOVERNMENT & SERVICES ============
  "Arborist": { keyword: "certified arborist" },
  "Energy Auditor": { keyword: "home energy auditor" },
  "Home Inspector": { keyword: "home inspector" },
  "Home Warranty Provider": { keyword: "home warranty" },
  "Mold Inspector": { keyword: "mold inspector testing" },
  "Municipality/Permitting": { type: "local_government_office" },
  "Real Estate Agent": { type: "real_estate_agency" },
  "Termite Inspector": { keyword: "termite inspector pest control" },
  "Utility Company": { keyword: "utility company" },

  // ============ INTERIOR TRADES ============
  "Accent Wall Contractor": { keyword: "accent wall installation contractor" },
  "Built-In Cabinet Installer": { keyword: "built-in cabinet installation" },
  "Cabinet Installer": { keyword: "cabinet installation contractor" },
  "Cabinet Manufacturer": { keyword: "custom cabinet manufacturer" },
  "Carpet Installer": { keyword: "carpet installer" },
  "Closet System Installer": { keyword: "custom closet system installer" },
  "Countertop Fabricator": { keyword: "countertop fabricator" },
  "Countertop Installer": { keyword: "countertop installation" },
  "Decorative Painter/Faux Finisher": { keyword: "faux finish decorative painter" },
  "Door Installer": { keyword: "interior door installer" },
  "Drywall Contractor": { keyword: "drywall contractor" },
  "Finish Carpenter": { keyword: "finish carpenter trim" },
  "Flooring Contractor": { type: "flooring_contractor" },
  "Hardwood Flooring Installer": { keyword: "hardwood floor installation" },
  "Insulation Contractor": { keyword: "insulation contractor" },
  "Interior Trim Contractor": { keyword: "interior trim carpentry contractor" },
  "Millwork Installer": { keyword: "millwork installation" },
  "Painter": { type: "painter" },
  "Shiplap Installer": { keyword: "shiplap installation contractor" },
  "Spray Foam Contractor": { keyword: "spray foam insulation contractor" },
  "Stair Contractor": { keyword: "stair contractor builder" },
  "Tile Contractor": { keyword: "tile contractor" },
  "Vinyl/LVP Installer": { keyword: "luxury vinyl plank installer" },
  "Wallpaper Installer": { keyword: "wallpaper installer" },
  "Window Installer": { keyword: "window installer" },

  // ============ LEGAL SERVICES ============
  "Business Attorney": { keyword: "business attorney" },
  "Construction Attorney": { keyword: "construction lawyer" },
  "Contract Attorney": { keyword: "contract attorney" },
  "Environmental Attorney": { keyword: "environmental lawyer" },
  "HOA Attorney": { keyword: "HOA attorney homeowners association" },
  "Land Use Attorney": { keyword: "land use attorney zoning" },
  "Lien Attorney": { keyword: "mechanics lien attorney" },
  "Real Estate Attorney": { keyword: "real estate attorney" },
  "Title Attorney": { keyword: "title attorney" },
  "Zoning Attorney": { keyword: "zoning attorney" },

  // ============ MATERIAL SUPPLIERS ============
  "Brick & Stone Supplier": { keyword: "brick stone supplier masonry" },
  "Building Materials Supplier": { type: "hardware_store" },
  "Cabinet Supplier": { keyword: "cabinet supplier showroom" },
  "Concrete Supplier (Ready-Mix)": { keyword: "ready mix concrete supplier" },
  "Countertop Supplier": { keyword: "countertop supplier" },
  "Door & Window Supplier": { keyword: "door window supplier" },
  "Drywall Supplier": { keyword: "drywall supplier" },
  "Electrical Fixtures Supplier": { keyword: "electrical supply lighting fixtures" },
  "Flooring Supplier": { keyword: "flooring supplier" },
  "Hardware Supplier": { keyword: "hardware supplier" },
  "Insulation Supplier": { keyword: "insulation supplier" },
  "Lumber Yard": { keyword: "lumber yard" },
  "Millwork Supplier": { keyword: "millwork supplier" },
  "Paint Supplier": { keyword: "paint supplier store" },
  "Plumbing Fixtures Supplier": { keyword: "plumbing fixtures supplier" },
  "Roofing Materials Supplier": { keyword: "roofing materials supplier" },
  "Steel Supplier": { keyword: "steel supplier" },
  "Tile Supplier": { keyword: "tile supplier showroom" },

  // ============ MEP CONTRACTORS ============
  "Audio/Video Installer": { keyword: "audio video installer" },
  "Electrical Contractor": { type: "electrician" },
  "Fire Sprinkler Contractor": { keyword: "fire sprinkler contractor" },
  "Generator Installer": { keyword: "generator installer" },
  "HVAC Contractor": { keyword: "HVAC contractor" },
  "Low Voltage Contractor": { keyword: "low voltage contractor" },
  "Plumbing Contractor": { type: "plumber" },
  "Security System Installer": { keyword: "security system installer" },
  "Smart Home Installer": { keyword: "smart home installer automation" },
  "Solar/Renewable Energy Contractor": { keyword: "solar installer" },

  // ============ SITE WORK CONTRACTORS ============
  "Concrete Contractor": { keyword: "concrete contractor" },
  "Demolition Contractor": { keyword: "demolition contractor" },
  "Earthwork Contractor": { keyword: "earthwork contractor" },
  "Erosion Control Contractor": { keyword: "erosion control contractor" },
  "Excavation Contractor": { keyword: "excavation contractor" },
  "Foundation Contractor": { keyword: "foundation contractor" },
  "Grading Contractor": { keyword: "grading contractor" },
  "Land Clearing Contractor": { keyword: "land clearing contractor" },
  "Retaining Wall Contractor": { keyword: "retaining wall contractor" },
  "Septic System Installer": { keyword: "septic system installer" },
  "Storm Water Management Contractor": { keyword: "stormwater management contractor" },
  "Utility Contractor": { keyword: "utility contractor" },

  // ============ SPECIALTY CONTRACTORS ============
  "Brick Mason": { keyword: "brick mason" },
  "Chimney Contractor": { keyword: "chimney contractor" },
  "EIFS Contractor": { keyword: "EIFS stucco contractor" },
  "Elevator Installer": { keyword: "residential elevator installer" },
  "Fireplace Installer": { keyword: "fireplace installer" },
  "Glass/Mirror Contractor": { keyword: "glass mirror contractor" },
  "Home Automation Contractor": { keyword: "home automation contractor" },
  "Metal Railing Contractor": { keyword: "metal railing contractor" },
  "Shower Door Installer": { keyword: "shower door installer" },
  "Stone Mason": { keyword: "stone mason" },
  "Stucco Contractor": { keyword: "stucco contractor" },
  "Waterproofing Contractor": { keyword: "waterproofing contractor" },
  "Wrought Iron Contractor": { keyword: "wrought iron fabricator" },

  // ============ STRUCTURAL TRADES ============
  "Deck Framing Contractor": { keyword: "deck framing contractor" },
  "Floor Joist Installer": { keyword: "floor joist installer" },
  "Framing Contractor": { keyword: "framing contractor" },
  "Lumber Framing Contractor": { keyword: "lumber framing contractor" },
  "Masonry Contractor": { keyword: "masonry contractor" },
  "Post-Frame Builder": { keyword: "post frame builder pole barn" },
  "Roofing Contractor": { type: "roofing_contractor" },
  "Siding Contractor": { keyword: "siding contractor" },
  "Steel Fabricator": { keyword: "steel fabricator" },
  "Timber Frame Builder": { keyword: "timber frame builder" },
  "Truss Manufacturer": { keyword: "truss manufacturer" },
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
    name: "Designers",
    types: ["Architect", "Bath Designer", "Closet Designer", "Home Theater Designer", "Interior Designer", "Kitchen Designer", "Landscape Architect", "Lighting Designer"],
  },
  {
    name: "Engineers",
    types: ["Civil Engineer", "Electrical Engineer", "Environmental Engineer", "Fire Protection Engineer", "Geotechnical Engineer", "Mechanical Engineer", "MEP Engineer", "Plumbing Engineer", "Stormwater Engineer", "Structural Engineer", "Transportation Engineer"],
  },
  {
    name: "Equipment Suppliers",
    types: ["Crane Rental", "Dumpster Rental", "Equipment Rental", "Generator Rental", "Heavy Equipment Rental", "Portable Toilet Rental", "Scaffolding Rental", "Tool Rental"],
  },
  {
    name: "Exterior & Landscaping",
    types: ["Deck Contractor", "Driveway Contractor", "Exterior Painting Contractor", "Fence Contractor", "Garage Door Installer", "Gutter Contractor", "Irrigation Contractor", "Landscaping Contractor", "Lawn Care Service", "Outdoor Living Contractor", "Patio Contractor", "Paving Contractor", "Pool/Spa Contractor", "Pressure Washing Service", "Tree Service", "Window Cleaning Service"],
  },
  {
    name: "Financial Services",
    types: ["Accountant/CPA", "Appraiser", "Commercial Lender", "Construction Lender", "Financial Advisor", "Insurance Agent", "Mortgage Lender", "Private Money Lender", "Surety Bond Provider", "Tax Consultant", "Title Company"],
  },
  {
    name: "Government & Services",
    types: ["Arborist", "Energy Auditor", "Home Inspector", "Home Warranty Provider", "Mold Inspector", "Municipality/Permitting", "Real Estate Agent", "Termite Inspector", "Utility Company"],
  },
  {
    name: "Interior Trades",
    types: ["Accent Wall Contractor", "Built-In Cabinet Installer", "Cabinet Installer", "Cabinet Manufacturer", "Carpet Installer", "Closet System Installer", "Countertop Fabricator", "Countertop Installer", "Decorative Painter/Faux Finisher", "Door Installer", "Drywall Contractor", "Finish Carpenter", "Flooring Contractor", "Hardwood Flooring Installer", "Insulation Contractor", "Interior Trim Contractor", "Millwork Installer", "Painter", "Shiplap Installer", "Spray Foam Contractor", "Stair Contractor", "Tile Contractor", "Vinyl/LVP Installer", "Wallpaper Installer", "Window Installer"],
  },
  {
    name: "Legal Services",
    types: ["Business Attorney", "Construction Attorney", "Contract Attorney", "Environmental Attorney", "HOA Attorney", "Land Use Attorney", "Lien Attorney", "Real Estate Attorney", "Title Attorney", "Zoning Attorney"],
  },
  {
    name: "Material Suppliers",
    types: ["Brick & Stone Supplier", "Building Materials Supplier", "Cabinet Supplier", "Concrete Supplier (Ready-Mix)", "Countertop Supplier", "Door & Window Supplier", "Drywall Supplier", "Electrical Fixtures Supplier", "Flooring Supplier", "Hardware Supplier", "Insulation Supplier", "Lumber Yard", "Millwork Supplier", "Paint Supplier", "Plumbing Fixtures Supplier", "Roofing Materials Supplier", "Steel Supplier", "Tile Supplier"],
  },
  {
    name: "MEP Contractors",
    types: ["Audio/Video Installer", "Electrical Contractor", "Fire Sprinkler Contractor", "Generator Installer", "HVAC Contractor", "Low Voltage Contractor", "Plumbing Contractor", "Security System Installer", "Smart Home Installer", "Solar/Renewable Energy Contractor"],
  },
  {
    name: "Site Work Contractors",
    types: ["Concrete Contractor", "Demolition Contractor", "Earthwork Contractor", "Erosion Control Contractor", "Excavation Contractor", "Foundation Contractor", "Grading Contractor", "Land Clearing Contractor", "Retaining Wall Contractor", "Septic System Installer", "Storm Water Management Contractor", "Utility Contractor"],
  },
  {
    name: "Specialty Contractors",
    types: ["Brick Mason", "Chimney Contractor", "EIFS Contractor", "Elevator Installer", "Fireplace Installer", "Glass/Mirror Contractor", "Home Automation Contractor", "Metal Railing Contractor", "Shower Door Installer", "Stone Mason", "Stucco Contractor", "Waterproofing Contractor", "Wrought Iron Contractor"],
  },
  {
    name: "Structural Trades",
    types: ["Deck Framing Contractor", "Floor Joist Installer", "Framing Contractor", "Lumber Framing Contractor", "Masonry Contractor", "Post-Frame Builder", "Roofing Contractor", "Siding Contractor", "Steel Fabricator", "Timber Frame Builder", "Truss Manufacturer"],
  },
];
