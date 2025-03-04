import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { EventData } from './EventItem';
import { LocationData, MapLocation } from '../types/location';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LOADER_ID } from '../config/googlemaps';

interface MapViewProps {
  events: {
    dayId: string;
    dayName: string;
    events: EventData[];
  }[];
  selectedLocation?: LocationData | null;
  onMapClick?: (location: LocationData) => void;
}

const MapView = ({ events, selectedLocation, onMapClick }: MapViewProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
    id: GOOGLE_MAPS_LOADER_ID
  });

  // Generate a color for each day
  const getDayColor = useCallback((index: number) => {
    const colors = [
      '#4CAF50', // Green
      '#2196F3', // Blue
      '#9C27B0', // Purple
      '#FF9800', // Orange
      '#E91E63', // Pink
      '#00BCD4', // Cyan
      '#FF5722'  // Deep Orange
    ];
    return colors[index % colors.length];
  }, []);

  // Process events into map locations
  useEffect(() => {
    const processedLocations: MapLocation[] = events.flatMap((day, dayIndex) => 
      day.events
        .filter(event => event.location)
        .map((event, eventIndex) => ({
          id: event.id,
          address: event.location,
          coordinates: { lat: 0, lng: 0 }, // Will be updated by geocoding
          title: `${event.time} - ${event.location}`,
          type: event.type,
          dayName: day.dayName,
          dayId: day.dayId,
          number: eventIndex + 1,
          color: getDayColor(dayIndex)
        }))
    );
    
    setLocations(processedLocations);
  }, [events, getDayColor]);

  // Geocode locations
  useEffect(() => {
    if (!isLoaded || locations.length === 0) return;
    
    const geocoder = new google.maps.Geocoder();
    
    const geocodeLocations = async () => {
      const updatedLocations = [...locations];
      
      for (let location of updatedLocations) {
        if (location.coordinates.lat === 0 && location.coordinates.lng === 0) {
          try {
            const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
              geocoder.geocode({ address: location.address }, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK && results) {
                  resolve(results);
                } else {
                  reject(status);
                }
              });
            });

            if (result[0].geometry?.location) {
              location.coordinates = {
                lat: result[0].geometry.location.lat(),
                lng: result[0].geometry.location.lng()
              };
            }
          } catch (error) {
            console.error(`Geocoding error for ${location.address}:`, error);
          }
        }
      }

      setLocations(updatedLocations);

      // Fit bounds to show all markers
      if (map && updatedLocations.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        updatedLocations.forEach(loc => {
          if (loc.coordinates.lat !== 0) {
            bounds.extend(loc.coordinates);
          }
        });
        map.fitBounds(bounds);
      }
    };

    geocodeLocations();
  }, [isLoaded, locations, map]);

  // Handle selected location updates
  useEffect(() => {
    if (map && selectedLocation) {
      map.panTo(selectedLocation.coordinates);
      map.setZoom(15);
    }
  }, [selectedLocation, map]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !onMapClick) return;
    
    const latLng = e.latLng; // Store reference to prevent null check issues
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng.toJSON() }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        onMapClick({
          address: results[0].formatted_address,
          coordinates: latLng.toJSON(),
          placeId: results[0].place_id
        });
      }
    });
  }, [onMapClick]);
  
  if (!isLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        zoom={12}
        center={{ lat: 38.9072, lng: -77.0369 }} // Default to DC
        onLoad={setMap}
        onClick={handleMapClick}
        options={{
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          zoomControl: true,
        }}
      >
        {/* Existing event markers */}
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={location.coordinates}
            onClick={() => setSelectedMarker(location.id)}
            label={{
              text: location.number.toString(),
              color: 'white',
              fontWeight: 'bold'
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: location.color,
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
              scale: 15,
            }}
          >
            {selectedMarker === location.id && (
              <InfoWindow
                position={location.coordinates}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div style={{ padding: '5px' }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                    {location.dayName}
                  </p>
                  <p style={{ margin: '0' }}>{location.title}</p>
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}

        {/* Selected location marker */}
        {selectedLocation && (
          <Marker
            position={selectedLocation.coordinates}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#FF4444',
              fillOpacity: 0.7,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
              scale: 15,
            }}
          >
            <InfoWindow>
              <div style={{ padding: '5px' }}>
                <p style={{ margin: '0' }}>New Event Location</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                  {selectedLocation.address}
                </p>
              </div>
            </InfoWindow>
          </Marker>
        )}
      </GoogleMap>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
  }
});

export default MapView;