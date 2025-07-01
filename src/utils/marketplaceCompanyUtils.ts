
export const determineCompanyTypeFromGoogleTypes = (placeTypes: string[]): string => {
  if (placeTypes.includes('general_contractor') || placeTypes.includes('contractor')) {
    return 'Subcontractor';
  } else if (placeTypes.includes('store') || placeTypes.includes('hardware_store')) {
    return 'Vendor';
  } else if (placeTypes.includes('local_government_office')) {
    return 'Municipality';
  }
  return '';
};

export const createFormDataFromPlace = (place: any) => {
  return {
    companyName: place.name || '',
    address: place.formatted_address || '',
    phoneNumber: place.formatted_phone_number || '',
    website: place.website || '',
    rating: place.rating ? place.rating.toString() : '',
    reviewCount: place.user_ratings_total ? place.user_ratings_total.toString() : '',
    companyType: place.types ? determineCompanyTypeFromGoogleTypes(place.types) : ''
  };
};

export const addToArray = (items: string[], newItem: string): string[] => {
  if (newItem.trim() && !items.includes(newItem.trim())) {
    return [...items, newItem.trim()];
  }
  return items;
};

export const removeFromArray = (items: string[], itemToRemove: string): string[] => {
  return items.filter(item => item !== itemToRemove);
};
