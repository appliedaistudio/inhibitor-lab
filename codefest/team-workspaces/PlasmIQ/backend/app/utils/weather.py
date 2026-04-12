import logging
from typing import Dict, Any, Optional
import requests
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class WeatherService:
    """Weather service for appointment recommendations."""
    
    # Weather condition impact on show-up probability
    WEATHER_IMPACT = {
        "Clear": 1.0,           # No impact
        "Clouds": 0.95,         # Slight negative
        "Rain": 0.80,           # Moderate negative
        "Snow": 0.65,           # Significant negative
        "Thunderstorm": 0.50,   # Very negative
        "Drizzle": 0.85,        # Slight negative
        "Mist": 0.90,           # Very slight negative
    }
    
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
    
    def get_current_weather(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Get current weather conditions at a location.
        
        Args:
            latitude, longitude: Location coordinates
        
        Returns:
            Weather data dict with temp, condition, etc.
        """
        try:
            url = f"{self.base_url}/weather"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key,
                "units": "metric"
            }
            
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            
            if response.status_code == 200:
                return {
                    "temperature": data.get("main", {}).get("temp"),
                    "feels_like": data.get("main", {}).get("feels_like"),
                    "condition": data.get("weather", [{}])[0].get("main"),
                    "description": data.get("weather", [{}])[0].get("description"),
                    "humidity": data.get("main", {}).get("humidity"),
                    "wind_speed": data.get("wind", {}).get("speed"),
                    "visibility": data.get("visibility"),
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                logger.error(f"Weather API error: {response.status_code}")
                return {}
        
        except Exception as e:
            logger.error(f"Failed to fetch weather: {e}")
            return {}
    
    def get_forecast(
        self,
        latitude: float,
        longitude: float,
        hours: int = 24
    ) -> list:
        """
        Get weather forecast for next N hours.
        
        Args:
            latitude, longitude: Location coordinates
            hours: Hours to forecast (max 48 for free tier)
        
        Returns:
            List of hourly forecast entries
        """
        try:
            url = f"{self.base_url}/forecast"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key,
                "units": "metric",
                "cnt": min(hours // 3, 40)  # API returns 3-hour chunks
            }
            
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            
            if response.status_code == 200:
                forecasts = []
                for item in data.get("list", []):
                    forecasts.append({
                        "datetime": item.get("dt_txt"),
                        "temperature": item.get("main", {}).get("temp"),
                        "condition": item.get("weather", [{}])[0].get("main"),
                        "rain_chance": item.get("pop", 0) * 100,  # Probability of precipitation
                        "wind_speed": item.get("wind", {}).get("speed")
                    })
                return forecasts
            else:
                logger.error(f"Forecast API error: {response.status_code}")
                return []
        
        except Exception as e:
            logger.error(f"Failed to fetch forecast: {e}")
            return []
    
    def get_weather_impact_score(self, condition: str) -> float:
        """
        Get show-up probability impact for weather condition.
        
        Args:
            condition: Weather condition (e.g., "Rain", "Clear")
        
        Returns:
            Impact multiplier (1.0 = no impact, 0.5 = -50% impact)
        """
        return self.WEATHER_IMPACT.get(condition, 1.0)
    
    def score_slot_by_weather(
        self,
        slot_time: datetime,
        latitude: float,
        longitude: float,
        forecast: list
    ) -> float:
        """
        Score a time slot based on weather forecast.
        
        Args:
            slot_time: Appointment time
            latitude, longitude: Location
            forecast: Weather forecast data
        
        Returns:
            Score 0-1 (higher = better weather conditions)
        """
        if not forecast:
            return 1.0  # Default if no forecast
        
        # Find matching forecast entry closest to slot_time
        best_score = 1.0
        
        for entry in forecast:
            try:
                forecast_time = datetime.fromisoformat(entry["datetime"].replace("Z", "+00:00"))
                time_diff = abs((forecast_time - slot_time).total_seconds() / 3600)
                
                # Use forecasts within 3 hours of slot time
                if time_diff <= 3:
                    condition = entry.get("condition", "Clear")
                    rain_chance = entry.get("rain_chance", 0)
                    
                    condition_score = self.get_weather_impact_score(condition)
                    rain_score = 1.0 - (rain_chance / 100 * 0.3)  # 30% impact from rain
                    
                    combined_score = (condition_score * 0.7) + (rain_score * 0.3)
                    best_score = min(best_score, combined_score)
            
            except Exception as e:
                logger.warning(f"Error scoring forecast entry: {e}")
                continue
        
        return best_score
    
    def get_bad_weather_alert(
        self,
        forecast: list,
        hours_ahead: int = 24,
        threshold: float = 0.7
    ) -> Optional[str]:
        """
        Check if bad weather is expected in forecast period.
        
        Args:
            forecast: Weather forecast data
            hours_ahead: Hours to check ahead
            threshold: Score threshold below which to warn (0-1)
        
        Returns:
            Alert message if bad weather expected, None otherwise
        """
        for entry in forecast:
            try:
                forecast_time = datetime.fromisoformat(entry["datetime"].replace("Z", "+00:00"))
                time_diff = (forecast_time - datetime.utcnow()).total_seconds() / 3600
                
                if 0 <= time_diff <= hours_ahead:
                    condition = entry.get("condition", "Clear")
                    score = self.get_weather_impact_score(condition)
                    
                    if score < threshold:
                        rain_chance = entry.get("rain_chance", 0)
                        return (f"⚠️ Weather alert: {condition} expected "
                               f"({rain_chance:.0f}% rain chance) - "
                               f"show-up risk: {(1-score)*100:.0f}%")
            
            except Exception as e:
                logger.warning(f"Error checking weather alert: {e}")
                continue
        
        return None


# Initialize weather service
def get_weather_service():
    """Get configured weather service instance."""
    from app.config import settings
    
    if not settings.openweather_api_key:
        logger.warning("OpenWeather API key not configured")
        return None
    
    return WeatherService(
        api_key=settings.openweather_api_key,
        base_url=settings.openweather_base_url
    )
