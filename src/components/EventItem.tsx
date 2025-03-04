// src/components/EventItem.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface EventData {
  id: string;
  time: string;
  location: string;
  type: 'activity' | 'food' | 'other';
  notes?: string;
}

interface EventItemProps {
  event: EventData;
  isEditing: boolean;
  onUpdate: (event: EventData) => void;
  onDelete: (eventId: string) => void;
}

const EventItem = ({ event, isEditing, onUpdate, onDelete }: EventItemProps) => {
  const [editedEvent, setEditedEvent] = useState<EventData>(event);
  
  const typeColors = {
    activity: '#4CAF50',
    food: '#FF9800',
    other: '#2196F3'
  };
  
  const handleTypeChange = (newType: 'activity' | 'food' | 'other') => {
    setEditedEvent({...editedEvent, type: newType});
    onUpdate({...editedEvent, type: newType});
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.timeContainer}>
        {isEditing ? (
          <TextInput
            style={styles.timeInput}
            value={editedEvent.time}
            onChangeText={(text) => {
              setEditedEvent({...editedEvent, time: text});
              onUpdate({...editedEvent, time: text});
            }}
            placeholder="Time"
          />
        ) : (
          <Text style={styles.time}>{event.time}</Text>
        )}
      </View>
      
      <View style={[styles.detailsContainer, {borderLeftColor: typeColors[event.type]}]}>
        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              value={editedEvent.location}
              onChangeText={(text) => {
                setEditedEvent({...editedEvent, location: text});
                onUpdate({...editedEvent, location: text});
              }}
              placeholder="Location"
            />
            
            <View style={styles.typeContainer}>
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  {backgroundColor: editedEvent.type === 'activity' ? '#4CAF50' : '#f0f0f0'}
                ]}
                onPress={() => handleTypeChange('activity')}
              >
                <Text style={{color: editedEvent.type === 'activity' ? 'white' : '#333'}}>Activity</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  {backgroundColor: editedEvent.type === 'food' ? '#FF9800' : '#f0f0f0'}
                ]}
                onPress={() => handleTypeChange('food')}
              >
                <Text style={{color: editedEvent.type === 'food' ? 'white' : '#333'}}>Food</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  {backgroundColor: editedEvent.type === 'other' ? '#2196F3' : '#f0f0f0'}
                ]}
                onPress={() => handleTypeChange('other')}
              >
                <Text style={{color: editedEvent.type === 'other' ? 'white' : '#333'}}>Other</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={editedEvent.notes}
              onChangeText={(text) => {
                setEditedEvent({...editedEvent, notes: text});
                onUpdate({...editedEvent, notes: text});
              }}
              placeholder="Notes"
              multiline
            />
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => onDelete(event.id)}
            >
              <Feather name="trash-2" size={18} color="white" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.location}>{event.location}</Text>
            <View style={styles.typeTag}>
              <Text style={styles.typeText}>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</Text>
            </View>
            {event.notes && <Text style={styles.notes}>{event.notes}</Text>}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timeContainer: {
    width: 80,
    paddingRight: 10,
  },
  time: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeInput: {
    fontSize: 16,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  detailsContainer: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  location: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 60,
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeButton: {
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 4,
  },
  typeText: {
    fontSize: 12,
    color: '#333',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  deleteText: {
    color: 'white',
    marginLeft: 5,
  },
});

export default EventItem;