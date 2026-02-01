const axios = require('axios');

class WeatherService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.WEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  async getCurrentWeather(lat, lon) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });
      
      return this.formatWeatherData(response.data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      return this.getMockWeatherData(lat, lon);
    }
  }

  async getForecast(lat, lon) {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });
      
      return this.formatForecastData(response.data);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      return this.getMockForecastData();
    }
  }

  async getHistoricalWeather(lat, lon, date) {
    // Historical weather data (requires paid plan or alternative API)
    return this.getMockHistoricalData(lat, lon, date);
  }

  formatWeatherData(data) {
    return {
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      clouds: data.clouds.all,
      weather: data.weather[0],
      visibility: data.visibility,
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000),
      timestamp: new Date()
    };
  }

  formatForecastData(data) {
    return data.list.map(item => ({
      timestamp: new Date(item.dt * 1000),
      temperature: item.main.temp,
      feelsLike: item.main.feels_like,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      windSpeed: item.wind.speed,
      windDirection: item.wind.deg,
      precipitation: item.pop, // Probability of precipitation
      rain: item.rain ? item.rain['3h'] : 0,
      snow: item.snow ? item.snow['3h'] : 0,
      clouds: item.clouds.all,
      weather: item.weather[0]
    }));
  }

  getMockWeatherData(lat, lon) {
    return {
      temperature: 25 + (Math.random() * 10 - 5),
      feelsLike: 26,
      humidity: 65 + (Math.random() * 20 - 10),
      pressure: 1013,
      windSpeed: 15 + (Math.random() * 10),
      windDirection: 45 + (Math.random() * 180),
      weather: { main: 'Clear', description: 'clear sky', icon: '01d' },
      timestamp: new Date()
    };
  }

  getMockForecastData() {
    return Array.from({ length: 8 }, (_, i) => ({
      timestamp: new Date(Date.now() + i * 3 * 60 * 60 * 1000),
      temperature: 20 + Math.sin(i / 8 * Math.PI) * 10,
      humidity: 60 + Math.random() * 20,
      windSpeed: 10 + Math.random() * 10,
      precipitation: Math.random() * 100,
      weather: { main: ['Clear', 'Clouds', 'Rain'][Math.floor(Math.random() * 3)] }
    }));
  }
}

module.exports = new WeatherService();