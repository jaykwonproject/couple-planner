import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import EventItem, { EventData } from './EventItem';
import WeatherDropdown, { WeatherInfo } from './WeatherDropdown';
import { LocationData } from '../types/location';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LOADER_ID } from '../config/googlemaps';

interface DayCardProps {
  dayId: string;
  date: Date;
  dayName: string;
  weatherLocations: WeatherInfo[];
  events: EventData[];
  showWeatherDropdown: boolean;
  onToggleWeatherDropdown: (dayId: string) => void;
  onAddEvent: (dayId: string, event: EventData) => void;
  onUpdateEvent: (dayId: string, event: EventData) => void;
  onDeleteEvent: (dayId: string, eventId: string) => void;
  onDeleteDay: (dayId: string) => void;
  onReorderEvents: (dayId: string, reorderedEvents: EventData[]) => void;
  onAddWeatherLocation: (dayId: string, location: string) => void;
  onRemoveWeatherLocation: (dayId: string, location: string) => void;
  onSetPrimaryWeather: (dayId: string, location: string) => void;
  onToggleDefaultLocation: (location: string) => void;
  defaultLocations: string[];
  onLocationSelect?: (location: LocationData) => void;
}

const DayCard = ({ 
  dayId,
  date, 
  dayName, 
  weatherLocations,
  events,
  showWeatherDropdown,
  onToggleWeatherDropdown,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onDeleteDay,
  onReorderEvents,
  onAddWeatherLocation,
  onRemoveWeatherLocation,
  onSetPrimaryWeather,
  onToggleDefaultLocation,
  defaultLocations,
  onLocationSelect
}: DayCardProps) => {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<EventData, 'id'>>({
    time: '',
    location: '',
    type: 'activity',
    notes: ''
  });
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
    id: GOOGLE_MAPS_LOADER_ID
  });

  const handlePlaceSelect = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const location: LocationData = {
          address: place.formatted_address || '',
          coordinates: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          placeId: place.place_id
        };
        
        setNewEvent(prev => ({
          ...prev,
          location: location.address
        }));
        
        if (onLocationSelect) {
          onLocationSelect(location);
        }
      }
    }
  };

  const moveEventUp = (index: number) => {
    if (index === 0) return;
    
    const reorderedEvents = [...events];
    const temp = reorderedEvents[index];
    reorderedEvents[index] = reorderedEvents[index - 1];
    reorderedEvents[index - 1] = temp;
    
    onReorderEvents(dayId, reorderedEvents);
  };
  
  const moveEventDown = (index: number) => {
    if (index === events.length - 1) return;
    
    const reorderedEvents = [...events];
    const temp = reorderedEvents[index];
    reorderedEvents[index] = reorderedEvents[index + 1];
    reorderedEvents[index + 1] = temp;
    
    onReorderEvents(dayId, reorderedEvents);
  };
  
  const handleAddEvent = () => {
    const eventId = Math.random().toString(36).substring(2, 15);
    onAddEvent(dayId, {
      id: eventId,
      ...newEvent
    });
    
    setNewEvent({
      time: '',
      location: '',
      type: 'activity',
      notes: ''
    });
    setShowAddModal(false);
  };
  
  const primaryWeather = weatherLocations.find(w => w.isPrimary) || 
                          (weatherLocations.length > 0 ? weatherLocations[0] : null);
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.dayInfo}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.date}>{date.toLocaleDateString()}</Text>
        </View>
        
        {primaryWeather && (
          <TouchableOpacity 
            style={styles.weather}
            onPress={(e) => {
              e.stopPropagation();
              onToggleWeatherDropdown(dayId);
            }}
          >
            <Text style={styles.temperature}>{primaryWeather.temperature}°F</Text>
            <Text style={styles.description}>{primaryWeather.description}</Text>
            <Feather name="chevron-down" size={16} color="#666" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        )}
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => onDeleteDay(dayId)}
          >
            <Feather name="trash-2" size={18} color="#f44336" />
          </TouchableOpacity>
          <Feather 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#333" 
          />
        </View>
      </TouchableOpacity>
      
      {showWeatherDropdown && (
        <View style={styles.dropdownContainer}>
          <WeatherDropdown
            dayId={dayId}
            locations={weatherLocations}
            defaultLocations={defaultLocations}
            onAddLocation={onAddWeatherLocation}
            onRemoveLocation={onRemoveWeatherLocation}
            onSetPrimary={onSetPrimaryWeather}
            onToggleDefault={onToggleDefaultLocation}
            onClose={() => onToggleWeatherDropdown(dayId)}
          />
        </View>
      )}
      
      {expanded && (
        <View style={styles.content}>
          <View style={styles.actionBar}>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => setShowAddModal(true)}
            >
              <Feather name="plus" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Event</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => setIsEditing(!isEditing)}
            >
              <Feather name={isEditing ? "check" : "edit-2"} size={20} color="white" />
              <Text style={styles.editButtonText}>
                {isEditing ? "Done" : "Edit Events"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {events.length === 0 ? (
            <Text style={styles.emptyText}>No events planned for this day</Text>
          ) : (
            events.map((event, index) => (
              <View key={event.id} style={styles.eventWrapper}>
                {isEditing && (
                  <View style={styles.reorderButtons}>
                    <TouchableOpacity 
                      onPress={() => moveEventUp(index)}
                      style={[styles.reorderButton, index === 0 && styles.disabledButton]}
                      disabled={index === 0}
                    >
                      <Feather name="chevron-up" size={18} color={index === 0 ? "#ccc" : "#666"} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => moveEventDown(index)}
                      style={[styles.reorderButton, index === events.length - 1 && styles.disabledButton]}
                      disabled={index === events.length - 1}
                    >
                      <Feather name="chevron-down" size={18} color={index === events.length - 1 ? "#ccc" : "#666"} />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.eventContent}>
                  <EventItem 
                    event={event}
                    isEditing={isEditing}
                    onUpdate={(updatedEvent) => onUpdateEvent(dayId, updatedEvent)}
                    onDelete={(eventId) => onDeleteEvent(dayId, eventId)}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      )}
      
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Event</Text>
            
            <Text style={styles.label}>Time:</Text>
            <TextInput
              style={styles.input}
              value={newEvent.time}
              onChangeText={(text) => setNewEvent({...newEvent, time: text})}
              placeholder="e.g. 10:00 AM"
            />
            
            <Text style={styles.label}>Location:</Text>
            {isLoaded ? (
              <div style={{ width: '100%', position: 'relative', marginBottom: 15 }}>
                <Autocomplete
                  onLoad={setAutocomplete}
                  onPlaceChanged={handlePlaceSelect}
                >
                  <input
                    type="text"
                    placeholder="Search for a location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      borderRadius: '5px',
                      border: '1px solid #ddd'
                    }}
                  />
                </Autocomplete>
              </div>
            ) : (
              <TextInput
                style={styles.input}
                value={newEvent.location}
                onChangeText={(text) => setNewEvent({...newEvent, location: text})}
                placeholder="Where is this event?"
              />
            )}
            
            <Text style={styles.label}>Type:</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  {backgroundColor: newEvent.type === 'activity' ? '#4CAF50' : '#f0f0f0'}
                ]}
                onPress={() => setNewEvent({...newEvent, type: 'activity'})}
              >
                <Text style={{color: newEvent.type === 'activity' ? 'white' : '#333'}}>Activity</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  {backgroundColor: newEvent.type === 'food' ? '#FF9800' : '#f0f0f0'}
                ]}
                onPress={() => setNewEvent({...newEvent, type: 'food'})}
              >
                <Text style={{color: newEvent.type === 'food' ? 'white' : '#333'}}>Food</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  {backgroundColor: newEvent.type === 'other' ? '#2196F3' : '#f0f0f0'}
                ]}
                onPress={() => setNewEvent({...newEvent, type: 'other'})}
              >
                <Text style={{color: newEvent.type === 'other' ? 'white' : '#333'}}>Other</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Notes:</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={newEvent.notes}
              onChangeText={(text) => setNewEvent({...newEvent, notes: text})}
              placeholder="Any additional details"
              multiline
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleAddEvent}
              >
                <Text style={styles.saveButtonText}>Add Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  temperature: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 8,
  },
  content: {
    padding: 15,
  },
  actionBar: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    flex: 1,
  },
  editButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  eventWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  reorderButtons: {
    flexDirection: 'column',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginVertical: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  eventContent: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  typeButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
    marginRight: 5,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    padding: 15,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  saveButton: {
    padding: 15,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    flex: 1,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 70,
    right: 20,
    zIndex: 1000,
  }
});

export default DayCard;