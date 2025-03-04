// src/types/location.ts
export interface LocationData {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    placeId?: string;
  }
  
  export interface MapLocation extends LocationData {
    id: string;
    title?: string;
    type?: 'food' | 'activity' | 'other';
    dayName: string;  // Added this
    dayId: string;
    number: number;
    color: string;    // Added this
  }