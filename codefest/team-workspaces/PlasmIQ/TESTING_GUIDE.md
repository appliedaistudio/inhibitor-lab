# 🧪 PlasmIQ Chatbot Testing Guide

Complete guide to test and validate your scheduling chatbot.

---

## Quick Start: Automated Testing (2 minutes)

### 1. Start Backend
```bash
cd backend
./start.sh
```

### 2. Run Test Script
```bash
bash backend/test_chatbot.sh
```

This runs all tests:
- ✅ Health check
- ✅ Create test donor
- ✅ Find nearest center
- ✅ Get available slots
- ✅ Booking appointment
- ✅ Chat interface (multiple intents)
- ✅ Retrieve data

---

## Manual Testing Guide

### Prerequisites
1. Backend running: `cd backend && ./start.sh`
2. MongoDB running: `brew services start mongodb-community`
3. API keys in `.env` (Inhibitor, OpenAI, OpenWeatherMap)

### Check Backend Status
```bash
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "inhibitor_api": "connected",
  "database": "connected"
}
```

---

## Test Scenario 1: Create a Test Donor

**Step 1: Create Donor**
```bash
curl -X POST http://localhost:8000/api/donors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Johnson",
    "email": "sarah@plasma.test",
    "phone": "555-0100",
    "preferred_time": "morning",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

**Expected Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Sarah Johnson",
  "email": "sarah@plasma.test",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "no_show_rate": 0.0,
  "created_at": "2026-04-11T21:44:23.013Z"
}
```

**Save the `_id`** - you'll use it for all following tests!

---

## Test Scenario 2: Find Nearest Donation Center

**Requires:**
- Donor with location (lat/lon)
- Donation centers seeded in database

**Step 1: Seed Donation Centers (MongoDB)**

```bash
# Open MongoDB CLI or use Compass
# Add test centers:

db.donation_centers.insertMany([
  {
    "name": "Downtown Plasma Center",
    "address": "123 Main St, New York, NY",
    "latitude": 40.7580,
    "longitude": -73.9855,
    "phone": "555-0001"
  },
  {
    "name": "Uptown Plasma Center",
    "address": "456 Park Ave, New York, NY",
    "latitude": 40.7831,
    "longitude": -73.9712,
    "phone": "555-0002"
  },
  {
    "name": "Brooklyn Plasma Center",
    "address": "789 Prospect Ave, Brooklyn, NY",
    "latitude": 40.6602,
    "longitude": -73.9776,
    "phone": "555-0003"
  }
])
```

**Step 2: Find Nearest Center**
```bash
curl -X POST http://localhost:8000/api/appointments/find-nearest-center/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "nearest_center": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Downtown Plasma Center",
    "address": "123 Main St, New York, NY",
    "phone": "555-0001"
  },
  "distance_km": 6.4,
  "estimated_travel_time_minutes": 18,
  "current_weather": {
    "temperature": 22.5,
    "condition": "Clear",
    "humidity": 65,
    "wind_speed": 5.2
  }
}
```

---

## Test Scenario 3: Get Smart-Ranked Available Slots

**Step 1: Get Available Slots**
```bash
curl -X POST "http://localhost:8000/api/appointments/get-available-slots/507f1f77bcf86cd799439011?days_ahead=14" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "donor_id": "507f1f77bcf86cd799439011",
  "available_slots": [
    {
      "slot_time": "2026-04-20T10:00:00",
      "center": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Downtown Plasma Center",
        "distance_km": 6.4
      },
      "distance_km": 6.4,
      "travel_time_minutes": 18,
      "weather_score": 1.0,
      "show_up_probability": 0.95,
      "recommendation_score": 0.98
    },
    {
      "slot_time": "2026-04-21T14:00:00",
      "center": {
        "id": "507f1f77bcf86cd799439013",
        "name": "Uptown Plasma Center",
        "distance_km": 8.5
      },
      "distance_km": 8.5,
      "travel_time_minutes": 22,
      "weather_score": 0.95,
      "show_up_probability": 0.88,
      "recommendation_score": 0.85
    }
  ],
  "constraints": {
    "max_per_week": 2,
    "rest_days": 1
  }
}
```

**What to check:**
- ✓ Slots are ranked by `recommendation_score` (highest first)
- ✓ `show_up_probability` shows likelihood of attendance
- ✓ Closest center appears first
- ✓ Weather data is included

---

## Test Scenario 4: Book an Appointment (Constraint Validation)

**Test 4a: Valid Booking**
```bash
FUTURE_TIME=$(date -u -d "+5 days 10:00" +"%Y-%m-%dT%H:%M:%S")

curl -X POST http://localhost:8000/api/appointments \
  -H "Content-Type: application/json" \
  -d "{
    \"donor_id\": \"507f1f77bcf86cd799439011\",
    \"center_id\": \"507f1f77bcf86cd799439012\",
    \"scheduled_time\": \"$FUTURE_TIME\",
    \"status\": \"scheduled\"
  }"
```

**Expected Response (Success):**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "donor_id": "507f1f77bcf86cd799439011",
  "center_id": "507f1f77bcf86cd799439012",
  "scheduled_time": "2026-04-16T10:00:00",
  "status": "scheduled",
  "created_at": "2026-04-11T21:44:23.013Z"
}
```

**Test 4b: Rest Day Violation**
```bash
# Try to book 1 hour after first appointment
SAME_DAY=$(date -u -d "+5 days 11:00" +"%Y-%m-%dT%H:%M:%S")

curl -X POST http://localhost:8000/api/appointments \
  -H "Content-Type: application/json" \
  -d "{
    \"donor_id\": \"507f1f77bcf86cd799439011\",
    \"center_id\": \"507f1f77bcf86cd799439012\",
    \"scheduled_time\": \"$SAME_DAY\",
    \"status\": \"scheduled\"
  }"
```

**Expected Response (Error):**
```json
{
  "detail": "❌ Must rest 1 day(s) after donation. Next available: 2026-04-17 10:00"
}
```

**Test 4c: Weekly Limit Violation**
```bash
# Create 2 appointments, then try to create 3rd

# 1st: Monday 10am ✅
# 2nd: Wednesday 2pm ✅
# 3rd: Friday 10am ❌ (at limit)

curl -X POST http://localhost:8000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "507f1f77bcf86cd799439011",
    "center_id": "507f1f77bcf86cd799439012",
    "scheduled_time": "2026-04-17T10:00:00",
    "status": "scheduled"
  }'
```

**Expected Response (Error):**
```json
{
  "detail": "❌ Maximum 2 appointment(s) per week reached. Currently scheduled for: Mon 10:00, Wed 14:00"
}
```

---

## Test Scenario 5: Chat Interface

### Test 5a: Scheduling Request
```bash
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "507f1f77bcf86cd799439011",
    "message": "I want to schedule a plasma donation"
  }'
```

**Expected Response:**
```json
{
  "message": "I found perfect slots for you! Monday 10am has great weather and is closest (6.4km away). You have a 95% chance of making it.",
  "action": "schedule",
  "data": {
    "slots": [
      {
        "slot_id": "...",
        "rank": 1,
        "score": 0.98,
        "reasoning": "Best distance + clear weather + your preferred time"
      }
    ]
  }
}
```

### Test 5b: Rescheduling Request (Traffic/Delay)
```bash
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "507f1f77bcf86cd799439011",
    "message": "I am stuck in traffic and cant make my 10am appointment"
  }'
```

**Expected Response:**
```json
{
  "message": "No problem! I found 3 alternative times for you. Tuesday 2pm at the Uptown center is only 8.5km away with excellent weather.",
  "action": "reschedule",
  "data": {
    "analysis": "Traffic delays are common for donors from your area. I recommend the Uptown center for better accessibility.",
    "suggested_slots": ["2026-04-18T14:00:00", "2026-04-19T10:30:00"],
    "recommended_incentive_boost": "+$5 courtesy bonus for the inconvenience"
  }
}
```

### Test 5c: General Information Request
```bash
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "507f1f77bcf86cd799439011",
    "message": "What are the health requirements for plasma donation?"
  }'
```

**Expected Response:**
```json
{
  "message": "Plasma donors should be in good general health, weigh at least 110 lbs, and be at least 18 years old. You must have valid ID and proof of Social Security number. Most donations take 1-2 hours.",
  "action": "chat"
}
```

---

## Test Scenario 6: View Interactive API Docs

**Open your browser:**
```
http://localhost:8000/docs
```

**You'll see:**
- All endpoints listed
- Try out buttons for each endpoint
- Request/response schemas
- Auto-generated documentation

**Test directly in Swagger:**
1. Click on any endpoint
2. Click "Try it out"
3. Fill in parameters
4. Click "Execute"
5. See response in real-time

---

## Test Scenario 7: Monitor AI Reasoning

**Check Backend Logs:**
```bash
# Watch for:
# 1. Inhibitor API evaluation logs
# 2. OpenAI reasoning responses
# 3. Slot ranking calculations
# 4. Constraint validation messages
```

**Example log output:**
```
INFO:app.utils.reasoning:Slot ranking response: {"ranked_slots": [{"slot_id": "...", "rank": 1, "score": 0.98, ...}]}
INFO:app.utils.inhibitor:Evaluating thought chain for message validation
INFO:app.utils.validator:Appointment validation passed for donor ...: booking
```

---

## Constraint Testing Checklist

### ✅ Rest Day Enforcement
- [ ] Book appointment on Monday 10am
- [ ] Try to book Tuesday 10am → Should fail with rest day error
- [ ] Try to book Wednesday 10am → Should succeed
- [ ] Verify next available is Wednesday

### ✅ Weekly Limit Enforcement
- [ ] Book 2 appointments in same week
- [ ] Try to book 3rd appointment same week → Should fail
- [ ] Try to book same time next week → Should succeed
- [ ] Create multiple weeks, verify limit resets

### ✅ Time Validation
- [ ] Try to book in the past → Should fail
- [ ] Book for today → Should succeed (if in future)
- [ ] Book for future → Should succeed

---

## Performance Testing

### Test Response Times
```bash
# Time a simple request
time curl -X GET http://localhost:8000/api/donors/507f1f77bcf86cd799439011

# Expected: < 200ms for GET
# Expected: < 500ms for POST with AI reasoning
# Expected: < 2s for weather/geolocation lookups
```

### Load Testing (Optional)
```bash
# Install Apache Bench
# ab -n 100 -c 10 http://localhost:8000/health

# Or use wrk
# brew install wrk
# wrk -t4 -c10 -d10s http://localhost:8000/health
```

---

## Database Validation

### Check MongoDB Collections
```bash
# Connect to MongoDB
mongosh

# Switch to plasmiq database
use plasmiq

# View collections
show collections

# Check donor data
db.donors.findOne()

# Check appointments
db.appointments.findOne()

# Check centers
db.donation_centers.findOne()

# Count records
db.donors.countDocuments()
db.appointments.countDocuments()
```

---

## Troubleshooting Tests

### Backend Won't Start
```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill existing process
kill -9 <PID>

# Start fresh
cd backend && ./start.sh
```

### MongoDB Connection Error
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Start MongoDB
brew services start mongodb-community

# Or use Docker
docker run -d -p 27017:27017 mongo:latest
```

### API Key Errors
```bash
# Verify .env has all keys
cat .env

# Check format (no extra quotes/spaces)
OPENWEATHER_API_KEY=your-key-no-quotes

# Test key independently
curl "https://api.openweathermap.org/data/2.5/weather?lat=40.7128&lon=-74.0060&appid=YOUR_KEY"
```

### Chat Returns Empty Response
```bash
# Check OpenAI API key
# Check OpenAI account has credits
# Check rate limits (usually 3,500 req/min for GPT-4)

# Test OpenAI directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Inhibitor Validation Blocking Messages
```bash
# Check Inhibitor API key
# Check message content (ensure not coercive/harmful)
# Review Inhibitor logs: http://localhost:8000/docs shows call history
```

---

## Testing Checklist

- [ ] Backend health check passes
- [ ] Create donor succeeds
- [ ] Donation centers are seeded
- [ ] Find nearest center returns correct distance
- [ ] Get available slots returns rankings
- [ ] Book valid appointment succeeds
- [ ] Rest day constraint blocks invalid booking
- [ ] Weekly limit constraint blocks 3rd booking
- [ ] Chat accepts scheduling request
- [ ] Chat accepts rescheduling request
- [ ] Chat answers general questions
- [ ] Swagger UI loads at /docs
- [ ] MongoDB contains all created data
- [ ] Weather data is retrieved
- [ ] Inhibitor validation passes
- [ ] Performance is acceptable (<2s for complex ops)

---

## Performance Benchmarks

**Acceptable Times:**
| Operation | Expected | Actual |
|-----------|----------|--------|
| Health check | <100ms | ? |
| Get donor | <200ms | ? |
| Create appointment | <500ms | ? |
| Find nearest center | <1s | ? |
| Get available slots | <2s | ? |
| Chat message | <3s | ? |
| Inhibitor validation | <2s | ? |

---

## Sample Data for Testing

**Donor 1 - High reliability:**
- Name: Sarah Johnson
- Email: sarah@test.com
- No-show rate: 0%
- Location: NYC (40.7128, -74.0060)
- Preferred: Morning

**Donor 2 - Lower reliability:**
- Name: Mike Smith
- Email: mike@test.com
- No-show rate: 20%
- Location: Brooklyn (40.6602, -73.9776)
- Preferred: Afternoon

**Centers:**
- Downtown: (40.7580, -73.9855) - 6.4km from Sarah
- Uptown: (40.7831, -73.9712) - 8.5km from Sarah
- Brooklyn: (40.6602, -73.9776) - 0km from Mike

---

## Next: Frontend Testing

Once backend is validated, test:
- React chat interface
- Location picker/map
- Slot selection UI
- Booking confirmation
- Reschedule flow

---

**Status: Ready for Complete Testing ✅**

Run `bash backend/test_chatbot.sh` to start automated tests!
