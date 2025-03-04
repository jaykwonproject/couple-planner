// src/components/WeekendPlan.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DayPlan, WeatherInfo, LocationWeather } from '../types/weather';
import { WEATHER_API_KEY } from '../config/keys';

interface WeekendPlanProps {
  coupleSpaceId: string;
}

const WeekendPlan = ({ coupleSpaceId }: WeekendPlanProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [plans, setPlans] = useState<{
    saturday: DayPlan;
    sunday: DayPlan;
  }>({
    saturday: {
      date: '',
      location: '',
      activity: '',
      food: '',
      other: '',
      weather: {
        "Washington DC": { location: '', temperature: 0, description: '', icon: '' },
        "Bowie MD": { location: '', temperature: 0, description: '', icon: '' },
        "Owings MD": { location: '', temperature: 0, description: '', icon: '' }
      }
    },
    sunday: {
      date: '',
      location: '',
      activity: '',
      food: '',
      other: '',
      weather: {
        "Washington DC": { location: '', temperature: 0, description: '', icon: '' },
        "Bowie MD": { location: '', temperature: 0, description: '', icon: '' },
        "Owings MD": { location: '', temperature: 0, description: '', icon: '' }
      }
    }
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Get the upcoming weekend dates
    const today = new Date();
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + (6 - today.getDay() + 7) % 7);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    // Setup listener for plans in Firestore
    const unsubscribe = onSnapshot(doc(db, 'coupleSpaces', coupleSpaceId), async (docSnap) => {
      if (docSnap.exists() && docSnap.data().weekendPlans) {
        setPlans(docSnap.data().weekendPlans);
      } else {
        // Initialize with new dates if no plans exist
        setPlans(prev => ({
          saturday: { ...prev.saturday, date: saturday.toLocaleDateString() },
          sunday: { ...prev.sunday, date: sunday.toLocaleDateString() }
        }));
        await fetchWeather(saturday, sunday);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [coupleSpaceId]);

  const fetchWeather = async (saturday: Date, sunday: Date) => {
    setWeatherError(false);
    
    const fetchForLocation = async (location: string, date: Date): Promise<WeatherInfo> => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${WEATHER_API_KEY}&units=imperial`
        );
        
        if (!response.ok) {
          throw new Error(`Weather API returned ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || !data.list || !data.list[0]) {
          throw new Error('Invalid weather data structure');
        }

        return {
          location,
          temperature: Math.round(data.list[0].main.temp),
          description: data.list[0].weather[0].description,
          icon: data.list[0].weather[0].icon
        };
      } catch (error) {
        console.error(`Error fetching weather for ${location}:`, error);
        setWeatherError(true);
        return {
          location,
          temperature: 0,
          description: 'Weather unavailable',
          icon: ''
        };
      }
    };

    const satWeather: LocationWeather = {
      "Washington DC": await fetchForLocation("Washington,DC,US", saturday),
      "Bowie MD": await fetchForLocation("Bowie,MD,US", saturday),
      "Owings MD": await fetchForLocation("Owings,MD,US", saturday)
    };

    const sunWeather: LocationWeather = {
      "Washington DC": await fetchForLocation("Washington,DC,US", sunday),
      "Bowie MD": await fetchForLocation("Bowie,MD,US", sunday),
      "Owings MD": await fetchForLocation("Owings,MD,US", sunday)
    };

    setPlans(prev => ({
      saturday: { ...prev.saturday, weather: satWeather },
      sunday: { ...prev.sunday, weather: sunWeather }
    }));
  };

  const handleSave = async () => {
    try {
      const planRef = doc(db, 'coupleSpaces', coupleSpaceId);
      await updateDoc(planRef, {
        weekendPlans: plans
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving plans:', error);
    }
  };

  const WeatherSection = ({ data }: { data: DayPlan }) => (
    <View style={styles.weatherSection}>
      {isLoading ? (
        <View style={styles.weatherLoading}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading weather data...</Text>
        </View>
      ) : weatherError ? (
        <View style={styles.weatherError}>
          <Text style={styles.errorText}>Weather data temporarily unavailable</Text>
        </View>
      ) : (
        <>
          <View style={styles.weatherItem}>
            <Text style={styles.locationText}>Washington DC</Text>
            <Text>{data.weather["Washington DC"].temperature}°F</Text>
            <Text>{data.weather["Washington DC"].description}</Text>
          </View>
          <View style={styles.weatherItem}>
            <Text style={styles.locationText}>Bowie MD</Text>
            <Text>{data.weather["Bowie MD"].temperature}°F</Text>
            <Text>{data.weather["Bowie MD"].description}</Text>
          </View>
          <View style={styles.weatherItem}>
            <Text style={styles.locationText}>Owings MD</Text>
            <Text>{data.weather["Owings MD"].temperature}°F</Text>
            <Text>{data.weather["Owings MD"].description}</Text>
          </View>
        </>
      )}
    </View>
  );

  const DayCard = ({ day, data }: { day: 'saturday' | 'sunday', data: DayPlan }) => (
    <View style={styles.dayCard}>
      <Text style={styles.dayTitle}>{day.charAt(0).toUpperCase() + day.slice(1)} - {data.date}</Text>
      
      <WeatherSection data={data} />

      <View style={styles.planDetails}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readOnly]}
            value={data.location}
            onChangeText={(text) => setPlans(prev => ({
              ...prev,
              [day]: { ...prev[day], location: text }
            }))}
            placeholder="Where to meet?"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Activity</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readOnly]}
            value={data.activity}
            onChangeText={(text) => setPlans(prev => ({
              ...prev,
              [day]: { ...prev[day], activity: text }
            }))}
            placeholder="What to do?"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Food</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readOnly]}
            value={data.food}
            onChangeText={(text) => setPlans(prev => ({
              ...prev,
              [day]: { ...prev[day], food: text }
            }))}
            placeholder="Where to eat?"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Other Notes</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readOnly]}
            value={data.other}
            onChangeText={(text) => setPlans(prev => ({
              ...prev,
              [day]: { ...prev[day], other: text }
            }))}
            placeholder="Additional notes..."
            editable={isEditing}
            multiline
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.editButton]}
        onPress={() => isEditing ? handleSave() : setIsEditing(true)}
      >
        <Text style={styles.buttonText}>
          {isEditing ? 'Save Plans' : 'Edit Plans'}
        </Text>
      </TouchableOpacity>

      <DayCard day="saturday" data={plans.saturday} />
      <DayCard day="sunday" data={plans.sunday} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 600,
    padding: 15,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  weatherSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  weatherItem: {
    alignItems: 'center',
    flex: 1,
  },
  weatherLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    width: '100%',
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  weatherError: {
    padding: 10,
    alignItems: 'center',
    width: '100%',
  },
  locationText: {
    fontWeight: '500',
    marginBottom: 5,
  },
  planDetails: {
    marginTop: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  readOnly: {
    backgroundColor: '#f5f5f5',
    borderColor: 'transparent',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#f44336',
  },
});

export default WeekendPlan;