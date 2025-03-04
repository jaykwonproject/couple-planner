// src/components/PlannerLayout.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  PanResponder,
  Modal
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import DayCard from './DayCard';
import { EventData } from './EventItem';
import { WeatherInfo } from './WeatherDropdown';
import MapView from './MapView';
import { LocationData } from '../types/location';
import { WEATHER_API_KEY } from '../config/keys';

interface DayData {
  id: string;
  name: string;
  date: string;
  events: EventData[];
  weatherLocations: WeatherInfo[];
}

interface PlannerLayoutProps {
  coupleSpaceId: string;
  onLeaveSpace: () => void;
  onLogout: () => void;
}

const PlannerLayout = ({ coupleSpaceId, onLeaveSpace, onLogout }: PlannerLayoutProps) => {
  // State declarations
  const [showSettings, setShowSettings] = useState(false);
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [splitRatio, setSplitRatio] = useState(0.4);
  const [dragRatio, setDragRatio] = useState(0.4);
  const [isDragging, setIsDragging] = useState(false);
  const [defaultLocations, setDefaultLocations] = useState<string[]>(["Washington,DC,US", "Bowie,MD,US", "Owings,MD,US"]);
  const [showWeatherDropdown, setShowWeatherDropdown] = useState<string | null>(null);
  
  // New states for location selection
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // PanResponder setup
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const { moveX } = gestureState;
        const screenWidth = Dimensions.get('window').width;
        const newRatio = Math.max(0.2, Math.min(0.8, moveX / screenWidth));
        setDragRatio(newRatio);
      },
      onPanResponderRelease: () => {
        setSplitRatio(dragRatio);
        setIsDragging(false);
      },
    })
  ).current;

    // Add effect to handle cursor styles for web
    useEffect(() => {
        if (typeof document !== 'undefined') {
            // Create a style element for the cursor
            const style = document.createElement('style');
            style.textContent = `
        .divider-handle {
          cursor: col-resize !important;
        }
        body.dragging {
          cursor: col-resize !important;
          user-select: none;
        }
      `;
            document.head.appendChild(style);

            return () => {
                document.head.removeChild(style);
            };
        }
    }, []);

    // Add effect to handle body class during dragging
    useEffect(() => {
        if (typeof document !== 'undefined') {
            if (isDragging) {
                document.body.classList.add('dragging');
            } else {
                document.body.classList.remove('dragging');
            }
        }
    }, [isDragging]);

    // Weather fetching function
    const fetchWeatherForDate = async (location: string, date: Date): Promise<WeatherInfo | null> => {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${WEATHER_API_KEY}&units=imperial`
            );

            if (!response.ok) {
                console.error(`Weather API error: ${response.status}`);
                return null;
            }

            const data = await response.json();

            // Find forecast closest to the date
            const targetDate = new Date(date);
            targetDate.setHours(12, 0, 0, 0); // Noon on the target date

            // Find the forecast closest to the target date
            let closestForecast = null;
            let closestDiff = Infinity;

            for (const forecast of data.list) {
                const forecastDate = new Date(forecast.dt * 1000);
                const diff = Math.abs(forecastDate.getTime() - targetDate.getTime());

                if (diff < closestDiff) {
                    closestDiff = diff;
                    closestForecast = forecast;
                }
            }

            if (!closestForecast) {
                return null;
            }

            return {
                location,
                temperature: Math.round(closestForecast.main.temp),
                description: closestForecast.weather[0].description,
                icon: closestForecast.weather[0].icon
            };
        } catch (error) {
            console.error(`Error fetching weather for ${location}:`, error);
            return null;
        }
    };

    // Get the upcoming weekend dates
    const today = new Date();
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + (6 - today.getDay() + 7) % 7);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    // Firestore data fetching effect
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'coupleSpaces', coupleSpaceId), async (docSnap) => {
          if (docSnap.exists()) {
            if (docSnap.data().defaultWeatherLocations) {
              setDefaultLocations(docSnap.data().defaultWeatherLocations);
            }
            
            if (docSnap.data().days) {
              setDays(docSnap.data().days);
            } else {
              const initialDays = await Promise.all([
                {
                  id: 'saturday',
                  name: 'Saturday',
                  date: saturday.toISOString(),
                  events: [],
                  weatherLocations: []
                },
                {
                  id: 'sunday',
                  name: 'Sunday',
                  date: sunday.toISOString(),
                  events: [],
                  weatherLocations: []
                }
              ].map(async (day) => {
                // Add weather for default locations
                const weatherPromises = defaultLocations.map(async (location, index) => {
                  const weather = await fetchWeatherForDate(location, new Date(day.date));
                  if (weather) {
                    return {
                      ...weather,
                      isPrimary: index === 0
                    };
                  }
                  return null;
                });
                
                const weatherLocations = (await Promise.all(weatherPromises)).filter(Boolean) as WeatherInfo[];
                
                return {
                  ...day,
                  weatherLocations
                };
              }));
              
              setDays(initialDays);
              await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
                days: initialDays,
                defaultWeatherLocations: defaultLocations
              });
            }
          }
          setLoading(false);
        });
        
        return () => unsubscribe();
      }, [coupleSpaceId]);

      const handleLocationSelect = (location: LocationData) => {
        setSelectedLocation(location);
      };
    
      // Handle map click
      const handleMapClick = (location: LocationData) => {
        setSelectedLocation(location);
        setShowLocationModal(true);
      };
    
      // Handle event addition from map click
      const handleAddEventFromMap = async (dayId: string) => {
        if (!selectedLocation) return;
    
        const newEvent: EventData = {
          id: Math.random().toString(36).substring(2, 15),
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          location: selectedLocation.address,
          type: 'activity',
          notes: ''
        };
    
        await handleAddEvent(dayId, newEvent);
        setShowLocationModal(false);
        setSelectedLocation(null);
      };

    // Event handlers
    const handleAddEvent = async (dayId: string, event: EventData) => {
        const updatedDays = days.map(day => {
          if (day.id === dayId) {
            return {
              ...day,
              events: [...day.events, event]
            };
          }
          return day;
        });
        
        setDays(updatedDays);
        await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
          days: updatedDays
        });
      };
    

    const handleUpdateEvent = async (dayId: string, updatedEvent: EventData) => {
        const updatedDays = days.map(day => {
            if (day.id === dayId) {
                return {
                    ...day,
                    events: day.events.map(event =>
                        event.id === updatedEvent.id ? updatedEvent : event
                    )
                };
            }
            return day;
        });

        setDays(updatedDays);

        // Update Firestore
        await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
            days: updatedDays
        });
    };

    const handleDeleteEvent = async (dayId: string, eventId: string) => {
        const updatedDays = days.map(day => {
            if (day.id === dayId) {
                return {
                    ...day,
                    events: day.events.filter(event => event.id !== eventId)
                };
            }
            return day;
        });

        setDays(updatedDays);

        // Update Firestore
        await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
            days: updatedDays
        });
    };

    const handleReorderEvents = async (dayId: string, reorderedEvents: EventData[]) => {
        const updatedDays = days.map(day => {
            if (day.id === dayId) {
                return {
                    ...day,
                    events: reorderedEvents
                };
            }
            return day;
        });

        setDays(updatedDays);

        // Update Firestore
        await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
            days: updatedDays
        });
    };

    const handleDeleteDay = async (dayId: string) => {
        // Confirm before deleting
        if (confirm(`Are you sure you want to delete this day?`)) {
            const updatedDays = days.filter(day => day.id !== dayId);
            setDays(updatedDays);

            // Update Firestore
            await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
                days: updatedDays
            });
        }
    };

    const handleAddDayBefore = async () => {
        let newDay: DayData;
        let newDate: Date;

        if (days.length === 0) {
            // If no days exist, create a new Saturday
            newDate = new Date(saturday);
            newDay = {
                id: `day-${Date.now()}`,
                name: 'Saturday',
                date: newDate.toISOString(),
                events: [],
                weatherLocations: []
            };
        } else {
            // Normal case when days exist
            const firstDay = days[0];
            newDate = new Date(firstDay.date);
            newDate.setDate(newDate.getDate() - 1);

            newDay = {
                id: `day-${Date.now()}`,
                name: newDate.toLocaleDateString('en-US', { weekday: 'long' }),
                date: newDate.toISOString(),
                events: [],
                weatherLocations: []
            };
        }

        // Add weather for default locations
        const weatherPromises = defaultLocations.map(async (location, index) => {
            const weather = await fetchWeatherForDate(location, newDate);
            if (weather) {
                return {
                    ...weather,
                    isPrimary: index === 0
                };
            }
            return null;
        });

        const weatherLocations = (await Promise.all(weatherPromises)).filter(Boolean) as WeatherInfo[];
        newDay.weatherLocations = weatherLocations;

        const updatedDays = days.length === 0 ? [newDay] : [newDay, ...days];
        setDays(updatedDays);

        // Update Firestore
        await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
            days: updatedDays
        });
    };

    const handleAddDayAfter = async () => {
        let newDay: DayData;
        let newDate: Date;

        if (days.length === 0) {
            // If no days exist, create a new Saturday
            newDate = new Date(saturday);
            newDay = {
                id: `day-${Date.now()}`,
                name: 'Saturday',
                date: newDate.toISOString(),
                events: [],
                weatherLocations: []
            };
        } else {
            // Normal case when days exist
            const lastDay = days[days.length - 1];
            newDate = new Date(lastDay.date);
            newDate.setDate(newDate.getDate() + 1);

            newDay = {
                id: `day-${Date.now()}`,
                name: newDate.toLocaleDateString('en-US', { weekday: 'long' }),
                date: newDate.toISOString(),
                events: [],
                weatherLocations: []
            };
        }

        // Add weather for default locations
        const weatherPromises = defaultLocations.map(async (location, index) => {
            const weather = await fetchWeatherForDate(location, newDate);
            if (weather) {
                return {
                    ...weather,
                    isPrimary: index === 0
                };
            }
            return null;
        });

        const weatherLocations = (await Promise.all(weatherPromises)).filter(Boolean) as WeatherInfo[];
        newDay.weatherLocations = weatherLocations;

        const updatedDays = days.length === 0 ? [newDay] : [...days, newDay];
        setDays(updatedDays);

        // Update Firestore
        await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
            days: updatedDays
        });
    };

    // Weather management functions
    const handleToggleWeatherDropdown = (dayId: string) => {
        setShowWeatherDropdown(prev => prev === dayId ? null : dayId);
    };

    const handleAddWeatherLocation = async (dayId: string, location: string) => {
        // Fetch weather for the new location
        const day = days.find(d => d.id === dayId);
        if (!day) return;

        const date = new Date(day.date);
        const weatherInfo = await fetchWeatherForDate(location, date);

        if (weatherInfo) {
            const newWeather: WeatherInfo = {
                ...weatherInfo,
                isPrimary: day.weatherLocations.length === 0 // Make primary if it's the first
            };

            const updatedDays = days.map(d => {
                if (d.id === dayId) {
                    return {
                        ...d,
                        weatherLocations: [...d.weatherLocations, newWeather]
                    };
                }
                return d;
            });

            setDays(updatedDays);
            await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
                days: updatedDays
            });
        }
    };

    const handleRemoveWeatherLocation = async (dayId: string, location: string) => {
        const updatedDays = days.map(d => {
            if (d.id === dayId) {
                const filteredLocations = d.weatherLocations.filter(w => w.location !== location);
                // If we removed the primary, set a new one
                if (filteredLocations.length > 0 && !filteredLocations.some(w => w.isPrimary)) {
                    filteredLocations[0].isPrimary = true;
                }
                return {
                    ...d,
                    weatherLocations: filteredLocations
                };
            }
            return d;
        });

        setDays(updatedDays);
        await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
            days: updatedDays
        });
    };

    const handleSetPrimaryWeather = async (dayId: string, location: string) => {
        const updatedDays = days.map(d => {
            if (d.id === dayId) {
                return {
                    ...d,
                    weatherLocations: d.weatherLocations.map(w => ({
                        ...w,
                        isPrimary: w.location === location
                    }))
                };
            }
            return d;
        });

        setDays(updatedDays);
        await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
            days: updatedDays
        });
    };

    const handleToggleDefaultLocation = async (location: string) => {
        let updatedDefaults;

        if (defaultLocations.includes(location)) {
            // Remove from defaults
            updatedDefaults = defaultLocations.filter(l => l !== location);
        } else {
            // Add to defaults
            updatedDefaults = [...defaultLocations, location];
        }

        setDefaultLocations(updatedDefaults);

        // Save to Firestore
        await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
            defaultWeatherLocations: updatedDefaults
        });

        // For newly added default locations, add them to all days that don't have them
        if (!defaultLocations.includes(location)) {
            const updatedDays = await Promise.all(days.map(async (day) => {
                // Skip if this day already has this location
                if (day.weatherLocations.some(w => w.location === location)) {
                    return day;
                }

                // Fetch weather for this location and date
                const date = new Date(day.date);
                const weather = await fetchWeatherForDate(location, date);

                if (weather) {
                    return {
                        ...day,
                        weatherLocations: [
                            ...day.weatherLocations,
                            {
                                ...weather,
                                isPrimary: day.weatherLocations.length === 0 // Make primary if it's the first
                            }
                        ]
                    };
                }

                return day;
            }));

            setDays(updatedDays);
            await updateDoc(doc(db, 'coupleSpaces', coupleSpaceId), {
                days: updatedDays
            });
        }
    };

    // Render component
    return (
        <View style={styles.container}>
          {/* Settings Menu */}
          <View style={styles.header}>
            <Text style={styles.title}>Couple Planner</Text>
            <TouchableOpacity 
              onPress={() => setShowSettings(!showSettings)}
              style={styles.settingsButton}
            >
              <Feather name="settings" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {showSettings && (
            <View style={styles.settingsMenu}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  navigator.clipboard.writeText(coupleSpaceId);
                  alert('Join code copied to clipboard');
                  setShowSettings(false);
                }}
              >
                <Text style={styles.menuText}>Copy Join Code</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  onLeaveSpace();
                  setShowSettings(false);
                }}
              >
                <Text style={styles.menuText}>Leave Space</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  onLogout();
                  setShowSettings(false);
                }}
              >
                <Text style={styles.menuText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Main Content */}
          <View style={styles.content}>
            <View style={[styles.timeline, { flex: dragRatio * 10 }]}>
              <ScrollView>
                <Text style={styles.sectionTitle}>This Weekend Plans</Text>
                
                <TouchableOpacity 
                  style={styles.addDayButton}
                  onPress={handleAddDayBefore}
                >
                  <Feather name="plus" size={16} color="#4CAF50" />
                  <Text style={styles.addDayText}>Add Day Before</Text>
                </TouchableOpacity>
                
                {loading ? (
                  <Text style={styles.loadingText}>Loading your plans...</Text>
                ) : (
                  days.map(day => (
                    <DayCard
                      key={day.id}
                      dayId={day.id}
                      dayName={day.name}
                      date={new Date(day.date)}
                      weatherLocations={day.weatherLocations || []}
                      events={day.events || []}
                      onAddEvent={handleAddEvent}
                      onUpdateEvent={handleUpdateEvent}
                      onDeleteEvent={handleDeleteEvent}
                      onDeleteDay={handleDeleteDay}
                      onReorderEvents={handleReorderEvents}
                      showWeatherDropdown={showWeatherDropdown === day.id}
                      onToggleWeatherDropdown={handleToggleWeatherDropdown}
                      onAddWeatherLocation={handleAddWeatherLocation}
                      onRemoveWeatherLocation={handleRemoveWeatherLocation}
                      onSetPrimaryWeather={handleSetPrimaryWeather}
                      onToggleDefaultLocation={handleToggleDefaultLocation}
                      defaultLocations={defaultLocations}
                      onLocationSelect={handleLocationSelect}
                    />
                  ))
                )}
                
                <TouchableOpacity 
                  style={styles.addDayButton}
                  onPress={handleAddDayAfter}
                >
                  <Feather name="plus" size={16} color="#4CAF50" />
                  <Text style={styles.addDayText}>Add Day After</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
            
            <View 
              style={[styles.divider, isDragging && { backgroundColor: '#ddd' }]}
              {...panResponder.panHandlers}
            >
              <View style={styles.dividerHandle} />
            </View>
            
            <View style={[styles.map, { flex: (1 - dragRatio) * 10 }]}>
              <MapView 
                events={days.map(day => ({
                  dayId: day.id,
                  dayName: day.name,
                  events: day.events
                }))}
                selectedLocation={selectedLocation}
                onMapClick={handleMapClick}
              />
            </View>
          </View>
    
          {/* Modal for adding events from map clicks */}
          {showLocationModal && selectedLocation && (
            <Modal
              visible={showLocationModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => {
                setShowLocationModal(false);
                setSelectedLocation(null);
              }}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Add Event at this Location</Text>
                  <Text style={styles.modalSubtitle}>{selectedLocation.address}</Text>
                  
                  <Text style={styles.label}>Select Day:</Text>
                  <View style={styles.daySelectionContainer}>
                    {days.map(day => (
                      <TouchableOpacity
                        key={day.id}
                        style={[
                          styles.daySelectButton,
                          selectedDayId === day.id && styles.selectedDayButton
                        ]}
                        onPress={() => setSelectedDayId(day.id)}
                      >
                        <Text style={[
                          styles.daySelectText,
                          selectedDayId === day.id && styles.selectedDayText
                        ]}>
                          {day.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowLocationModal(false);
                        setSelectedLocation(null);
                        setSelectedDayId(null);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.addButton,
                        !selectedDayId && styles.disabledButton
                      ]}
                      disabled={!selectedDayId}
                      onPress={() => {
                        if (selectedDayId) {
                          handleAddEventFromMap(selectedDayId);
                          setSelectedDayId(null);
                        }
                      }}
                    >
                      <Text style={styles.addButtonText}>Add Event</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
      );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    settingsButton: {
        padding: 10,
    },
    settingsMenu: {
        position: 'absolute',
        top: 70,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 1000,
    },
    menuItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    menuText: {
        fontSize: 16,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    timeline: {
        padding: 20,
    },
    map: {
        flex: 6, // 60% of the width
  padding: 0, // Remove padding
  backgroundColor: '#f9f9f9',
    },
    divider: {
        width: 12,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    dividerHandle: {
        width: 4,
        height: 30,
        backgroundColor: '#ccc',
        borderRadius: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    comingSoon: {
        color: '#666',
        marginTop: 20,
        textAlign: 'center',
    },
    addDayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        marginVertical: 10,
    },
    addDayText: {
        color: '#4CAF50',
        marginLeft: 5,
        fontWeight: '500',
    },
    loadingText: {
        textAlign: 'center',
        marginVertical: 20,
        color: '#666',
    },
    // Add these styles to the existing StyleSheet.create({}) object

modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  daySelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  daySelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDayButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  daySelectText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDayText: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  }
});

export default PlannerLayout;