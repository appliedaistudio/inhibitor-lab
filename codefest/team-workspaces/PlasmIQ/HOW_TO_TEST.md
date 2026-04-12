# 🧪 How to Test Your PlasmIQ Chatbot

Complete guide to validate your scheduling chatbot.

---

## The Fastest Way (5 minutes)

```bash
# Terminal 1: Start MongoDB
brew services start mongodb-community

# Terminal 2: Start backend
cd backend
./start.sh

# Terminal 3: Run all tests
bash backend/test_chatbot.sh
```

That's it! The script tests everything automatically.

---

## What Gets Tested

The `test_chatbot.sh` script validates:

1. ✅ Backend health (MongoDB, APIs connected)
2. ✅ Donor creation with location
3. ✅ Geolocation (nearest center)
4. ✅ Distance calculation
5. ✅ Travel time estimation
6. ✅ Weather integration
7. ✅ Slot ranking algorithm
8. ✅ Constraint validation
9. ✅ Appointment booking
10. ✅ Chat interface (3 intents)
11. ✅ Data persistence

---

## Manual Testing

### Step 1: Health Check
```bash
curl http://localhost:8000/health
```

### Step 2: Create Donor
```bash
curl -X POST http://localhost:8000/api/donors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Donor",
    "email": "test@test.com",
    "phone": "555-0100",
    "preferred_time": "morning",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

Save the `_id` value!

### Step 3: Seed Centers (MongoDB)
```bash
mongosh
use plasmiq

db.donation_centers.insertMany([
  {
    "name": "Downtown",
    "latitude": 40.7580,
    "longitude": -73.9855,
    "phone": "555-0001"
  },
  {
    "name": "Uptown",
    "latitude": 40.7831,
    "longitude": -73.9712,
    "phone": "555-0002"
  }
])

exit
```

### Step 4: Find Nearest Center
```bash
curl -X POST http://localhost:8000/api/appointments/find-nearest-center/{DONOR_ID}
```

Should return: name, distance (6.4 km), travel time, weather

### Step 5: Get Available Slots
```bash
curl -X POST http://localhost:8000/api/appointments/get-available-slots/{DONOR_ID}
```

Should return: 15 ranked slots with scores

### Step 6: Book Appointment
```bash
curl -X POST http://localhost:8000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "{DONOR_ID}",
    "center_id": "507f1f77bcf86cd799439012",
    "scheduled_time": "2026-04-20T10:00:00",
    "status": "scheduled"
  }'
```

Should return: appointment `_id`

### Step 7: Chat
```bash
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "{DONOR_ID}",
    "message": "I want to schedule a plasma donation"
  }'
```

Should return: AI-generated response with recommendations

---

## Interactive Testing

Open in browser:
```
http://localhost:8000/docs
```

Click any endpoint → "Try it out" → Enter parameters → "Execute" → See response

---

## Constraint Tests

### Rest Day Enforcement
- Book Mon 10am ✅
- Try Tue 10am ❌ Error: "Must rest 1 day..."
- Try Wed 10am ✅

### Weekly Limit
- Book Mon ✅ (1/2)
- Book Wed ✅ (2/2)
- Try Fri ❌ Error: "Maximum 2 per week"

### Weather Scoring
- Clear 5km → 0.95 score
- Rain 5km → 0.80 score
- Snow 5km → 0.58 score

---

## Success Indicators

✅ Everything works when:

- Health check returns "healthy"
- Donor created with ID
- Nearest center found (6.4 km away)
- 15 slots returned, ranked
- Valid booking succeeds
- Invalid bookings rejected
- Chat responds intelligently
- Weather included in responses
- Show-up probability calculated (0-1)
- All responses < 3 seconds

---

## Common Issues

**Backend won't start**
- Check if 8000 is in use: `lsof -i :8000`

**MongoDB error**
- Start it: `brew services start mongodb-community`

**"Donor location not set"**
- Add latitude/longitude to donor

**"No centers found"**
- Seed database (see Step 3)

**Chat error**
- Check API keys in .env

---

## Checklist

- [ ] Backend runs without errors
- [ ] Health check passes
- [ ] Donor created
- [ ] Centers seeded
- [ ] Nearest center found
- [ ] Slots ranked
- [ ] Appointment booked
- [ ] Rest day blocks invalid booking
- [ ] Weekly limit blocks 3rd booking
- [ ] Chat responds
- [ ] Weather shown
- [ ] Probability shown
- [ ] Swagger UI loads
- [ ] Data in MongoDB

---

## Next Steps

✅ All tests pass → Build React frontend!
❌ Some tests fail → Check TESTING_GUIDE.md

---

## Quick Reference

**Test everything:**
```bash
bash backend/test_chatbot.sh
```

**Full guide:**
→ TESTING_GUIDE.md

**Quick start:**
→ TEST_QUICK_START.md

---

**Start testing:** `bash backend/test_chatbot.sh` 🚀
