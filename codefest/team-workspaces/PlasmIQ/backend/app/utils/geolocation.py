import math
import logging
from typing import Tuple, List, Dict
import requests

logger = logging.getLogger(__name__)


class GeoLocation:
    """Utility for geolocation and distance calculations."""
    
    EARTH_RADIUS_KM = 6371  # Earth's radius in kilometers
    
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two points using Haversine formula.
        
        Args:
            lat1, lon1: Donor's latitude and longitude
            lat2, lon2: Center's latitude and longitude
        
        Returns:
            Distance in kilometers
        """
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = (math.sin(dlat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
        c = 2 * math.asin(math.sqrt(a))
        
        return GeoLocation.EARTH_RADIUS_KM * c
    
    @staticmethod
    def find_nearest_center(
        donor_lat: float,
        donor_lon: float,
        centers: List[Dict]
    ) -> Tuple[Dict, float]:
        """
        Find the nearest donation center to a donor's location.
        
        Args:
            donor_lat, donor_lon: Donor's coordinates
            centers: List of center objects with latitude/longitude
        
        Returns:
            Tuple of (nearest_center, distance_in_km)
        """
        if not centers:
            return None, float('inf')
        
        nearest_center = None
        min_distance = float('inf')
        
        for center in centers:
            distance = GeoLocation.haversine_distance(
                donor_lat, donor_lon,
                center.get('latitude'), center.get('longitude')
            )
            
            if distance < min_distance:
                min_distance = distance
                nearest_center = center
        
        return nearest_center, min_distance
    
    @staticmethod
    def filter_centers_by_distance(
        donor_lat: float,
        donor_lon: float,
        centers: List[Dict],
        max_distance_km: float = 25
    ) -> List[Tuple[Dict, float]]:
        """
        Filter centers within a certain distance from donor.
        
        Args:
            donor_lat, donor_lon: Donor's coordinates
            centers: List of all centers
            max_distance_km: Maximum distance threshold
        
        Returns:
            List of (center, distance) tuples sorted by distance
        """
        centers_with_distance = []
        
        for center in centers:
            distance = GeoLocation.haversine_distance(
                donor_lat, donor_lon,
                center.get('latitude'), center.get('longitude')
            )
            
            if distance <= max_distance_km:
                centers_with_distance.append((center, distance))
        
        # Sort by distance
        centers_with_distance.sort(key=lambda x: x[1])
        return centers_with_distance
    
    @staticmethod
    def get_coordinates_from_address(address: str) -> Tuple[float, float]:
        """
        Get coordinates from address using geocoding.
        Requires GOOGLE_MAPS_API_KEY in environment.
        
        Args:
            address: Physical address
        
        Returns:
            Tuple of (latitude, longitude) or None if failed
        """
        from app.config import settings
        
        if not settings.google_maps_api_key:
            logger.warning("Google Maps API key not configured")
            return None
        
        try:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": address,
                "key": settings.google_maps_api_key
            }
            
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            
            if data.get("results"):
                location = data["results"][0].get("geometry", {}).get("location")
                if location:
                    return (location["lat"], location["lng"])
            
            return None
        except Exception as e:
            logger.error(f"Geocoding failed: {e}")
            return None
    
    @staticmethod
    def estimate_travel_time(
        donor_lat: float,
        donor_lon: float,
        center_lat: float,
        center_lon: float,
        traffic_multiplier: float = 1.0
    ) -> int:
        """
        Estimate travel time to center based on distance.
        Rough estimation: ~60 km/h average speed.
        
        Args:
            donor_lat, donor_lon: Donor's coordinates
            center_lat, center_lon: Center's coordinates
            traffic_multiplier: Multiplier for traffic conditions (1.0 = normal)
        
        Returns:
            Estimated travel time in minutes
        """
        distance = GeoLocation.haversine_distance(
            donor_lat, donor_lon,
            center_lat, center_lon
        )
        
        # Estimate: 60 km/h = 1 km/minute
        base_time = distance  # minutes
        
        return int(base_time * traffic_multiplier)
