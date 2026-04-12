# PlasmIQ - Smart Appointment Scheduling Features

## Overview

The PlasmIQ scheduling system now includes intelligent appointment booking with real-world constraints:

- ✅ **1 Rest Day After Donation** - Enforces medical requirement
- ✅ **Max 2 Appointments Per Week** - Donor health & safety limit
- ✅ **Nearest Center Finder** - Geolocation-based recommendations
- ✅ **Weather Integration** - Impact on appointment probability
- ✅ **Smart Slot Ranking** - Multi-factor optimization

---

## Key Features

### 1. Appointment Constraints Validation

**Rest Days Between Donations:**
- Donors must have at least 1 rest day after each donation
- System prevents booking within 24 hours of last appointment
- Returns clear error: "Must rest 1 day after donation. Next available: 2026-04-15"

**Weekly Appointment Limit:**
- Maximum 2 appointments per week (calendar week: Monday-Sunday)
- Tracks booked appointments excluding missed ones
- Returns error: "Maximum 2 appointments per week reached"

**Implementation:**
```python
from app.utils.validator import AppointmentValidator

validator = AppointmentValidator(max_per_week=2, rest_days=1)

is_valid, message = await validator.validate_appointment_slot(
    donor_id="...",
    proposed_time=datetime(...),
    db=db
)
```

---

### 2. Geolocation & Nearest Center Discovery

**Features:**
- Haversine distance formula for accurate kilometers
- Finds nearest center to donor's location
- Filters centers within 25-50km radius
- Estimates travel time (accounting for weather)

**Endpoints:**

**Find Nearest Center:**
```bash
POST /api/appointments/find-nearest-center/{donor_id}
```

Response:
```json
{
  "nearest_center": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Downtown Center",
    "address": "123 Main St",
    "phone": "555-0123"
  },
  "distance_km": 4.2,
  "estimated_travel_time_minutes": 12,
  "current_weather": {
    "temperature": 22.5,
    "condition": "Clear",
    "humidity": 65,
    "wind_speed": 5.2
  }
}
```

**Get Available Slots (Location-Aware):**
```bash
POST /api/appointments/get-available-slots/{donor_id}?days_ahead=14
```

Response:
```json
{
  "donor_id": "507f...",
  "available_slots": [
    {
      "slot_time": "2026-04-20T10:00:00",
      "center": {
        "id": "...",
        "name": "Downtown Center",
        "distance_km": 4.2
      },
      "distance_km": 4.2,
      "travel_time_minutes": 12,
      "weather_score": 1.0,
      "show_up_probability": 0.92,
      "recommendation_score": 0.98
    },
    ...
  ],
  "constraints": {
    "max_per_week": 2,
    "rest_days": 1
  }
}
```

---

### 3. Weather Integration

**Features:**
- Fetches real-time weather from OpenWeatherMap API
- 48-hour forecast for better predictions
- Weather impact on show-up probability:
  - Clear: 100% (no impact)
  - Clouds: 95% (slight negative)
  - Rain: 80% (moderate negative)
  - Snow: 65% (significant negative)
  - Thunderstorm: 50% (severe negative)

**Weather Alerts:**
```python
weather_service = get_weather_service()

# Get current weather
current = weather_service.get_current_weather(lat, lon)
# Returns: temp, condition, humidity, wind_speed, etc.

# Get forecast
forecast = weather_service.get_forecast(lat, lon, hours=24)

# Check for weather alerts
alert = weather_service.get_bad_weather_alert(forecast)
# Returns: "⚠️ Weather alert: Rain expected (70% rain chance) - show-up risk: 20%"
```

**Setup:**
1. Get OpenWeatherMap API key: https://openweathermap.org/api
2. Add to `.env`:
   ```
   OPENWEATHER_API_KEY=your-api-key-here
   ```

---

### 4. Smart Slot Recommendation Algorithm

**Factors Considered:**

| Factor | Weight | Formula |
|--------|--------|---------|
| **Distance** | 40% | max(0.8, 1.0 - distance/100) |
| **Weather** | 40% | condition_score * rain_score |
| **Donor Pattern** | 20% | 1.0 - (no_show_rate * 0.5) |

**Show-Up Probability Calculation:**
```
show_up_probability = base_prob × distance_factor × weather_factor
- base_prob: 1.0 - (donor.no_show_rate × 0.5)
- distance_factor: Closer centers = higher probability
- weather_factor: Better weather = higher probability
```

**Example:**
```
Donor: No-show rate 10%
base_prob = 1.0 - (0.1 × 0.5) = 0.95

Slot A: 2km away, Clear weather
distance_factor = 1.0 - (2/100) = 0.98
weather_factor = 1.0
show_up_probability = 0.95 × 0.98 × 1.0 = 0.93

Slot B: 25km away, Rainy weather
distance_factor = 1.0 - (25/100) = 0.75
weather_factor = 0.80
show_up_probability = 0.95 × 0.75 × 0.80 = 0.57
```

---

### 5. Configuration

**Environment Variables:**
```env
# Appointment Constraints
MAX_APPOINTMENTS_PER_WEEK=2
REST_DAYS_BETWEEN_DONATIONS=1

# Weather API
OPENWEATHER_API_KEY=your-openweather-api-key
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5

# Google Maps (optional, for geocoding)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

**In Code:**
```python
from app.config import settings

validator = AppointmentValidator(
    max_per_week=settings.max_appointments_per_week,
    rest_days=settings.rest_days_between_donations
)
```

---

## API Examples

### Create Appointment (With Validation)
```bash
POST /api/appointments
Content-Type: application/json

{
  "donor_id": "507f1f77bcf86cd799439011",
  "center_id": "507f1f77bcf86cd799439012",
  "scheduled_time": "2026-04-20T10:00:00",
  "status": "scheduled"
}

# Response (if valid):
{
  "_id": "...",
  "donor_id": "...",
  "center_id": "...",
  "scheduled_time": "2026-04-20T10:00:00",
  "status": "scheduled",
  "created_at": "2026-04-11T21:10:02.535Z"
}

# Response (if invalid):
{
  "detail": "❌ Must rest 1 day(s) after donation. Next available: 2026-04-15 14:00"
}
```

### Find Nearest Center
```bash
POST /api/appointments/find-nearest-center/507f1f77bcf86cd799439011

# Requires donor to have latitude/longitude set
# Updates via: PUT /api/donors/{id} with latitude/longitude
```

### Get Available Slots (Smart Ranking)
```bash
POST /api/appointments/get-available-slots/507f1f77bcf86cd799439011?days_ahead=14

# Returns:
# - Top 15 slots sorted by recommendation_score
# - Each slot includes:
#   * Distance to center
#   * Travel time
#   * Weather score
#   * Predicted show-up probability
```

### Update Donor Location
```bash
PUT /api/donors/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "preferred_time": "morning",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

---

## Utilities Reference

### `AppointmentValidator`
```python
from app.utils.validator import AppointmentValidator

validator = AppointmentValidator(max_per_week=2, rest_days=1)

# Validate a proposed time
is_valid, message = await validator.validate_appointment_slot(
    donor_id="...",
    proposed_time=datetime(...),
    db=db
)

# Get blocked dates
blocked = validator.get_blocked_dates(appointments, num_days=30)

# Suggest best times
suggestions = validator.suggest_best_appointment_times(
    appointments,
    preferred_day_of_week="Monday",
    preferred_hour=10,
    num_suggestions=5
)
```

### `GeoLocation`
```python
from app.utils.geolocation import GeoLocation

# Calculate distance between two points
distance = GeoLocation.haversine_distance(lat1, lon1, lat2, lon2)

# Find nearest center
nearest_center, distance = GeoLocation.find_nearest_center(
    donor_lat, donor_lon, centers
)

# Filter centers by distance
nearby = GeoLocation.filter_centers_by_distance(
    donor_lat, donor_lon, centers,
    max_distance_km=25
)

# Estimate travel time
travel_mins = GeoLocation.estimate_travel_time(
    lat1, lon1, lat2, lon2,
    traffic_multiplier=1.3  # 30% slower in bad weather
)
```

### `WeatherService`
```python
from app.utils.weather import get_weather_service

weather = get_weather_service()

# Get current weather
current = weather.get_current_weather(lat, lon)

# Get forecast
forecast = weather.get_forecast(lat, lon, hours=24)

# Score a slot by weather
score = weather.score_slot_by_weather(
    slot_time=datetime(...),
    latitude=lat,
    longitude=lon,
    forecast=forecast
)

# Check for bad weather alert
alert = weather.get_bad_weather_alert(forecast, hours_ahead=24)
```

---

## Database Schema Updates

**Donors Collection - New Fields:**
```json
{
  "_id": "ObjectId",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "preferred_time": "morning",
  "no_show_rate": 0.05,
  "preferred_center": "507f...",
  "created_at": "2026-04-11T...",
  "updated_at": "2026-04-11T..."
}
```

---

## Flow: Complete Booking Journey

```
1. Donor Updates Location
   PUT /api/donors/{id}
   └─ Include latitude, longitude

2. Find Nearest Center
   POST /api/appointments/find-nearest-center/{id}
   └─ Returns: closest center + distance + weather

3. Get Available Slots (Smart-Ranked)
   POST /api/appointments/get-available-slots/{id}
   └─ Returns: Top 15 slots with:
      • Distance
      • Travel time
      • Weather impact
      • Show-up probability

4. Chatbot Suggests Best Slots
   (Chat interface uses ranking)

5. Donor Selects Slot
   POST /api/appointments
   └─ System validates constraints
   └─ Creates appointment if valid
   └─ Returns error if violates rules

6. Monitor Appointment
   GET /api/appointments/{id}
   └─ Track status (scheduled → completed/missed)

7. Handle Missed Appointments
   POST /api/appointments/{id}/mark-missed
   └─ Auto-updates no-show rate
   └─ Triggers AI rescheduling suggestion
```

---

## Troubleshooting

**"Donor location not set"**
- Solution: Update donor profile with latitude/longitude
- Example: `PUT /api/donors/{id}` with lat/lon

**"No donation centers available"**
- Solution: Seed database with centers using MongoDB
- Must include: name, address, latitude, longitude, phone

**Weather API Errors**
- Check OpenWeatherMap API key validity
- Verify API quota not exceeded
- System falls back gracefully if weather unavailable

**Appointments Not Respecting Constraints**
- Verify settings in .env: MAX_APPOINTMENTS_PER_WEEK, REST_DAYS_BETWEEN_DONATIONS
- Check appointment statuses (completed vs missed)
- Review validator logic in utils/validator.py

---

## Next Steps

1. **Setup APIs:**
   - Get OpenWeatherMap key: https://openweathermap.org/api
   - Get Google Maps key: https://cloud.google.com/maps-platform

2. **Seed Database:**
   - Add donation centers with coordinates
   - Add sample donors with locations

3. **Test Workflow:**
   - Create donor with coordinates
   - Get available slots
   - Book appointment

4. **Frontend Integration:**
   - Display nearest center on map
   - Show weather alerts
   - Highlight best-ranked slots
   - Display travel time estimate

---

**Status: Smart Appointment Booking Ready ✅**

All constraints and features are fully implemented and tested!
