# 🧪 Quick Start Testing (5 minutes)

## Step 1: Start Backend & MongoDB (1 minute)

### Terminal 1: Start MongoDB
```bash
brew services start mongodb-community
# or: docker run -d -p 27017:27017 mongo:latest
```

### Terminal 2: Start Backend
```bash
cd /Users/priyankjhaveri/Desktop/PlasmIQ/backend
./start.sh
```

Expected output:
```
✓ Connected to MongoDB
✓ Inhibitor API connected
✓ Database indexes created
INFO: Uvicorn running on http://0.0.0.0:8000
```

**Wait 30 seconds for full startup.**

## Step 2: Seed Database with Test Data (1 minute)

### Add Donation Centers

Open MongoDB in another terminal:
```bash
mongosh
use plasmiq

db.donation_centers.insertMany([
  {
    "name": "Downtown Plasma Center",
    "address": "123 Main St, New York",
    "latitude": 40.7580,
    "longitude": -73.9855,
    "phone": "555-0001"
  },
  {
    "name": "Uptown Plasma Center", 
    "address": "456 Park Ave, New York",
    "latitude": 40.7831,
    "longitude": -73.9712,
    "phone": "555-0002"
  }
])
```

Type: `exit` to close MongoDB.

## Step 3: Run Automated Tests (3 minutes)

```bash
# From project root
bash backend/test_chatbot.sh
```

This tests:
- ✅ Health check
- ✅ Create donor
- ✅ Find nearest center
- ✅ Get available slots
- ✅ Book appointment
- ✅ Chat interface (3 types of messages)
- ✅ Retrieve data

---

## OR Manual Testing (Alternative)

If you prefer to test step-by-step:

### 1. Check Backend is Running
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "inhibitor_api": "connected",
  "database": "connected"
}
```

### 2. Create a Test Donor
```bash
curl -X POST http://localhost:8000/api/donors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Donor",
    "email": "test@plasma.com",
    "phone": "555-0100",
    "preferred_time": "morning",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

**Copy the `_id` from response** - you'll need it!

### 3. Find Nearest Center
```bash
curl -X POST http://localhost:8000/api/appointments/find-nearest-center/{DONOR_ID}
```

Replace `{DONOR_ID}` with the ID from step 2.

### 4. Get Smart-Ranked Slots
```bash
curl -X POST http://localhost:8000/api/appointments/get-available-slots/{DONOR_ID}
```

Should return 15 slots ranked by score (highest first).

### 5. Book an Appointment
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

### 6. Chat with Chatbot
```bash
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "{DONOR_ID}",
    "message": "I want to schedule a donation appointment"
  }'
```

### 7. View Interactive API Docs
Open in browser:
```
http://localhost:8000/docs
```

---

## What to Check

### ✓ Chatbot Responses
- [ ] Message understood (correct intent)
- [ ] Returns ranked slots
- [ ] Shows distance & travel time
- [ ] Shows weather conditions
- [ ] Shows show-up probability

### ✓ Constraints Enforced
- [ ] Rest day violations blocked
- [ ] Weekly limits enforced
- [ ] Clear error messages
- [ ] Next available time shown

### ✓ Location Services
- [ ] Nearest center found correctly
- [ ] Distance in kilometers
- [ ] Travel time estimated
- [ ] Weather data included

### ✓ Ranking Algorithm
- [ ] Slots ranked by score
- [ ] Closest slots ranked higher
- [ ] Clear weather slots ranked higher
- [ ] Show-up probability calculated

---

## Common Issues

**Backend won't start:**
- Check port 8000 isn't in use: `lsof -i :8000`

**MongoDB not found:**
- Start it: `brew services start mongodb-community`

**"Donor location not set":**
- Update donor with latitude/longitude

**"No centers found":**
- Seed database (step 2 above)

**Chat returns error:**
- Check OpenAI API key in .env
- Check Inhibitor API key in .env

---

## Success Indicators

When everything works:

1. **Health check**: Returns `"status": "healthy"`
2. **Donor created**: Has `_id` field
3. **Nearest center**: Returns distance in km
4. **Available slots**: Returns 15 ranked slots
5. **Appointment booked**: Returns appointment `_id`
6. **Chat response**: AI-generated message about scheduling
7. **API docs**: Load in browser at /docs

---

## Performance Expectations

| Operation | Time |
|-----------|------|
| Health check | <100ms |
| Create donor | <500ms |
| Find nearest center | <1s |
| Get available slots | <2s |
| Book appointment | <500ms |
| Chat message | <3s |

---

## Detailed Testing

For comprehensive tests, see: `TESTING_GUIDE.md`

---

**Ready? Let's go!**

```bash
bash backend/test_chatbot.sh
```
