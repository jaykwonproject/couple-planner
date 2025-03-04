// src/components/WeatherDropdown.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface WeatherInfo {
  location: string;
  temperature: number;
  description: string;
  icon: string;
  isPrimary?: boolean;
}

interface WeatherDropdownProps {
  dayId: string;
  locations: WeatherInfo[];
  defaultLocations: string[];
  onAddLocation: (dayId: string, location: string) => void;
  onRemoveLocation: (dayId: string, location: string) => void;
  onSetPrimary: (dayId: string, location: string) => void;
  onToggleDefault: (location: string) => void;
  onClose: () => void;
}

const WeatherDropdown = ({
  dayId,
  locations,
  defaultLocations,
  onAddLocation,
  onRemoveLocation,
  onSetPrimary,
  onToggleDefault,
  onClose
}: WeatherDropdownProps) => {
  const [newLocation, setNewLocation] = useState('');
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weather Locations</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      {locations.map((weather) => (
        <View key={weather.location} style={styles.locationItem}>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{weather.location.split(',')[0]}</Text>
          <View style={styles.weatherDetail}>
            <Image 
              source={{ uri: `https://openweathermap.org/img/wn/${weather.icon}@2x.png` }}
              style={styles.weatherIcon} 
            />
            <Text style={styles.temperature}>{weather.temperature}°F</Text>
            <Text style={styles.description}>{weather.description}</Text>
          </View>
        </View>
          
          <View style={styles.locationActions}>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                weather.isPrimary && styles.activeButton
              ]}
              onPress={() => onSetPrimary(dayId, weather.location)}
            >
              <Feather name="star" size={16} color={weather.isPrimary ? "white" : "#666"} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionButton,
                defaultLocations.includes(weather.location) && styles.activeButton
              ]}
              onPress={() => onToggleDefault(weather.location)}
            >
              <Feather 
                name="bookmark" 
                size={16} 
                color={defaultLocations.includes(weather.location) ? "white" : "#666"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onRemoveLocation(dayId, weather.location)}
            >
              <Feather name="trash-2" size={16} color="#f44336" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      
      <View style={styles.addLocationSection}>
        <TextInput
          style={styles.input}
          value={newLocation}
          onChangeText={setNewLocation}
          placeholder="Add location (e.g. New York,NY,US)"
        />
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            if (newLocation.trim()) {
              onAddLocation(dayId, newLocation.trim());
              setNewLocation('');
            }
          }}
        >
          <Feather name="plus" size={16} color="white" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // In WeatherDropdown.tsx
container: {
    width: '100%',
  backgroundColor: 'white',
  borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '500',
  },
  temperature: {
    fontSize: 12,
    color: '#666',
  },
  description: {
    fontSize: 12,
    color: '#666',
  },
  locationActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginLeft: 5,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  addLocationSection: {
    marginTop: 15,
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 5,
  },
  weatherDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  weatherIcon: {
    width: 30,
    height: 30,
    marginRight: 5,
  },
});

export default WeatherDropdown;