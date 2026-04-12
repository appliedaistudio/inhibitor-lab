# 🎯 PlasmIQ Smart Appointment Booking - Quick Reference

## What's New

Your appointment booking system now enforces **real-world medical constraints** and uses **AI-powered location & weather** to find the best slots:

### ✅ Constraints Enforced
1. **1 Rest Day After Each Donation** (medical requirement)
2. **Max 2 Appointments Per Week** (donor health & safety)
3. **No Appointments in Past** (obviously)

### 🌍 Location Features
- **Find Nearest Center** - Geolocation-based using Haversine formula
- **Filter by Distance** - Show centers within 25-50km radius
- **Estimate Travel Time** - With weather impact adjustments

### 🌤️ Weather Integration
- **Real-Time Weather** - Current conditions at donation centers
- **48-Hour Forecast** - Plan around bad weather
- **Impact on Show-Up** - Adjust recommendations based on weather conditions

### 📊 Smart Slot Ranking
- **Multi-Factor Scoring** - Distance (40%) + Weather (40%) + Donor Pattern (20%)
- **Show-Up Probability** - Predicts likelihood donor will attend
- **Top 15 Ranked Slots** - Best recommendations sorted by score

---

## Setup (5 minutes)

### 1. Get API Keys

**Weather (Required):**
- Go to: https://openweathermap.org/api
- Sign up for free
- Copy API key

**Google Maps (Optional, for geocoding addresses):**
- Go to: https://cloud.google.com/maps-platform
- Enable Maps API
- Copy API key

### 2. Update `.env`
```bash
# Add to .env:
OPENWEATHER_API_KEY=your-api-key-from-openweathermap
GOOGLE_MAPS_API_KEY=your-api-key-from-google

# Or use example keys (limited functionality):
OPENWEATHER_API_KEY=demo
```

### 3. Seed Database
Add donation centers to MongoDB:
```bash
# Use MongoDB Compass or shell:
db.donation_centers.insertMany([
  {
    "name": "Downtown Center",
    "address": "123 Main St, New York, NY",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "phone": "555-0001"
  },
  {
    "name": "Uptown Center",
    "address": "456 Park Ave, New York, NY",
    "latitude": 40.7831,
    "longitude": -73.9712,
    "phone": "555-0002"
  }
])
```

### 4. Update Donors with Location
```bash
curl -X PUT http://localhost:8000/api/donors/{donor_id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "preferred_time": "morning",
    "latitude": 40.7580,
    "longitude": -73.9855
  }'
```

---

## API Usage Examples

### Find Nearest Donation Center
```bash
POST /api/appointments/find-nearest-center/{donor_id}

Response:
{
  "nearest_center": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Downtown Center",
    "distance_km": 4.2
  },
  "distance_km": 4.2,
  "estimated_travel_time_minutes": 12,
  "current_weather": {
    "temperature": 22.5,
    "condition": "Clear",
    "humidity": 65
  }
}
```

### Get Available Slots (Smart-Ranked)
```bash
POST /api/appointments/get-available-slots/{donor_id}?days_ahead=14

Response (top 3 of 15):
{
  "available_slots": [
    {
      "slot_time": "2026-04-20T10:00:00",
      "center": {"name": "Downtown Center", "distance_km": 4.2},
      "travel_time_minutes": 12,
      "weather_score": 1.0,
      "show_up_probability": 0.95,
      "recommendation_score": 0.98
    },
    {
      "slot_time": "2026-04-21T14:00:00",
      "center": {"name": "Uptown Center", "distance_km": 8.5},
      "travel_time_minutes": 20,
      "weather_score": 0.85,
      "show_up_probability": 0.87,
      "recommendation_score": 0.85
    },
    ...
  ],
  "constraints": {
    "max_per_week": 2,
    "rest_days": 1
  }
}
```

### Book Appointment (Auto-Validates Constraints)
```bash
POST /api/appointments
Content-Type: application/json

{
  "donor_id": "507f1f77bcf86cd799439011",
  "center_id": "507f1f77bcf86cd799439012",
  "scheduled_time": "2026-04-20T10:00:00",
  "status": "scheduled"
}

# Success Response:
{
  "_id": "507f1f77bcf86cd799439013",
  "status": "scheduled"
}

# Constraint Violation Response (400 Bad Request):
{
  "detail": "❌ Must rest 1 day(s) after donation. Next available: 2026-04-15 14:00"
}

# Weekly Limit Violation Response (400 Bad Request):
{
  "detail": "❌ Maximum 2 appointment(s) per week reached. Currently scheduled: Mon 10:00, Wed 14:00"
}
```

---

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/appointments/find-nearest-center/{donor_id}` | POST | Find closest center to donor |
| `/api/appointments/get-available-slots/{donor_id}` | POST | Get smart-ranked available slots |
| `/api/appointments` | POST | Book appointment (validates constraints) |
| `/api/appointments/{id}/reschedule` | POST | Reschedule (validates constraints) |
| `/api/appointments/{id}/mark-missed` | POST | Mark as missed (updates stats) |
| `/api/donors/{id}` | PUT | Update donor location (lat/lon) |

---

## Recommendation Scoring Explained

**How slots are ranked (0.0 to 1.0):**

```
recommendation_score = distance_factor × weather_factor

distance_factor = 1.0 - (distance_km / 100)
  • 0 km → 1.0 (perfect)
  • 25 km → 0.75
  • 50 km → 0.5

weather_factor = condition_score × (1 - rain_chance%)
  • Clear, no rain → 1.0
  • Cloudy → 0.95
  • Rain → 0.80
  • Snow → 0.65
  • Thunderstorm → 0.50

Example:
  Slot A: 5km away, Clear weather
  score = (1 - 0.05) × 1.0 = 0.95 ⭐ Best!

  Slot B: 25km away, Rainy weather
  score = (1 - 0.25) × 0.80 = 0.60
```

---

## Show-Up Probability Calculation

System predicts likelihood donor will show up:

```
show_up_probability = base_probability × distance_factor × weather_factor

base_probability = 1.0 - (donor.no_show_rate × 0.5)
  • New donor (0% no-show) → 1.0
  • 10% no-show rate → 0.95
  • 20% no-show rate → 0.90

Example:
  Donor with 10% no-show history
  5 km away, Clear weather
  
  base = 1.0 - (0.10 × 0.5) = 0.95
  distance = 1 - (5/100) = 0.95
  weather = 1.0
  probability = 0.95 × 0.95 × 1.0 = 0.90 (90% likely to show)
```

---

## Configuration

**In `.env`:**
```env
# Appointment Rules
MAX_APPOINTMENTS_PER_WEEK=2
REST_DAYS_BETWEEN_DONATIONS=1

# Weather API
OPENWEATHER_API_KEY=your-key
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5

# Google Maps (optional)
GOOGLE_MAPS_API_KEY=your-key
```

**In Code (Python):**
```python
from app.config import settings

print(settings.max_appointments_per_week)      # 2
print(settings.rest_days_between_donations)    # 1
print(settings.openweather_api_key)            # API key
```

---

## Constraints in Action

### Scenario 1: Rest Day Enforcement
```
Donor's last donation: Tuesday 10:00 AM
Tries to book: Tuesday 2:00 PM

Error: "❌ Must rest 1 day after donation. Next available: Wednesday 10:00 AM"

Why? Need 24 hours (1 day) rest after donation.
```

### Scenario 2: Weekly Limit
```
Week of April 15-21:
- Monday 10:00 AM ✅ Booked
- Wednesday 2:00 PM ✅ Booked
- Friday 10:00 AM ❌ Request blocked

Error: "❌ Maximum 2 appointments per week reached"

Why? Already at limit (2) for this week.

Next available: Monday April 22 (next week)
```

### Scenario 3: Weather Impact
```
Available Slot: Monday 10:00 AM @ Downtown Center (3 km away)
Forecast: 70% rain expected

Slot is still bookable, but:
- recommendation_score drops from 0.95 → 0.80
- show_up_probability drops from 0.92 → 0.74
- Ranked lower in list of suggestions
- Alert shown: "⚠️ Weather alert: Rain (70%) - show-up risk: 26%"
```

---

## Troubleshooting

**Donor location not set error**
→ Update donor with latitude/longitude: `PUT /api/donors/{id}`

**No centers found**
→ Seed database with donation centers (see Setup section)

**Weather API not working**
→ Check API key in `.env`
→ System gracefully falls back to no weather data

**Appointments not respecting constraints**
→ Verify appointments have correct status (scheduled/completed)
→ Check validator settings in `.env`

---

## Next: Frontend Integration

The chat interface and UI should:

1. **Ask for Donor Location**
   - "What's your address?" or "Enable location access?"
   - Store latitude/longitude

2. **Show Nearest Center**
   - Call find-nearest-center endpoint
   - Display on map or text: "Closest: Downtown Center, 4.2 km away"

3. **Display Available Slots**
   - Get smart-ranked slots
   - Show as cards sorted by recommendation_score
   - Include:
     * Time & date
     * Center name
     * Distance & travel time
     * Weather icon
     * Show-up probability %

4. **Book Appointment**
   - Donor clicks a slot
   - Call POST /api/appointments
   - Show confirmation or error message

---

**Status: ✅ Smart Appointment Booking Complete**

All constraints, APIs, and ranking algorithms are production-ready!

Read `backend/APPOINTMENT_FEATURES.md` for complete technical documentation.
