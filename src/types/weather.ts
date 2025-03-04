// src/types/weather.ts
export interface WeatherInfo {
    location: string;
    temperature: number;
    description: string;
    icon: string;
  }
  
  export interface LocationWeather {
    "Washington DC": WeatherInfo;
    "Bowie MD": WeatherInfo;
    "Owings MD": WeatherInfo;
  }
  
  export interface DayPlan {
    date: string;
    location: string;
    activity: string;
    food: string;
    other: string;
    weather: LocationWeather;
  }