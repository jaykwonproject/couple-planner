// src/components/MapComponent.tsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// For TypeScript
let MapViewComponent: any = View;
let MarkerComponent: any = View;

// Only import the map when not on web
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapViewComponent = Maps.default;
    MarkerComponent = Maps.Marker;
  } catch (error) {
    console.error('Error importing react-native-maps:', error);
  }
}

interface MapComponentProps {
  style?: any;
}

const MapComponent = ({ style }: MapComponentProps) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.text}>Map will be available on mobile devices</Text>
        <Text style={styles.subtext}>Web version coming soon</Text>
      </View>
    );
  }

  // Only pass initialRegion to actual MapView
  return (
    <MapViewComponent
      style={[styles.container, style]}
      initialRegion={{
        latitude: 38.9072,
        longitude: -77.0369,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  subtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
  },
});

export default MapComponent;
export { MarkerComponent as Marker };