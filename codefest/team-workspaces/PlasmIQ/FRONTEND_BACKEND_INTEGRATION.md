# 🔗 Frontend & Backend Integration Guide

Complete guide to integrate React frontend with FastAPI backend.

## Architecture

```
┌─────────────────┐          ┌──────────────────┐
│   React App     │          │   FastAPI        │
│   (Port 5173)   │ ◄────►   │   (Port 8000)    │
│                 │  HTTP    │                  │
└─────────────────┘          └──────────────────┘
     Frontend                     Backend
  • Chat UI                  • Chat endpoint
  • Map display              • Geolocation
  • Slot picker              • Slot ranking
  • Booking flow             • Constraints
```

## Setup Instructions

### 1. Backend Setup (Already Complete ✅)

```bash
cd backend
./start.sh
# Runs on http://localhost:8000
```

API Endpoints:
- `POST /api/chat/send` - Chat messages
- `GET /api/donors/{id}` - Get donor profile
- `POST /api/appointments/get-available-slots/{donor_id}` - Ranked slots
- `POST /api/appointments/find-nearest-center/{donor_id}` - Find nearest center
- `POST /api/appointments` - Book appointment

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### 3. API Integration

Create `frontend/src/services/api.ts`:

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  // Chat
  async sendChat(donorId: string, message: string) {
    const response = await axios.post(`${API_URL}/chat/send`, {
      donor_id: donorId,
      message
    });
    return response.data;
  },

  // Donors
  async getDonor(donorId: string) {
    const response = await axios.get(`${API_URL}/donors/${donorId}`);
    return response.data;
  },

  // Appointments
  async getAvailableSlots(donorId: string) {
    const response = await axios.post(`${API_URL}/appointments/get-available-slots/${donorId}`);
    return response.data;
  },

  async findNearestCenter(donorId: string) {
    const response = await axios.post(`${API_URL}/appointments/find-nearest-center/${donorId}`);
    return response.data;
  },

  async bookAppointment(data: {
    donor_id: string;
    center_id: string;
    scheduled_time: string;
    status: string;
  }) {
    const response = await axios.post(`${API_URL}/appointments`, data);
    return response.data;
  }
};
```

## Component Development Order

### Phase 1: Layout & Navigation
1. ✅ Create `Header.tsx` - Navigation bar
2. Create `Layout.tsx` - Main layout wrapper
3. Create routing setup

### Phase 2: Donor Management
1. Create donor login/profile
2. Create `DonorProfile.tsx` component
3. Add authentication context

### Phase 3: Chat Interface
1. Create `Chat.tsx` component
2. Integrate with `/api/chat/send`
3. Display AI responses

### Phase 4: Slot Selection
1. Create `SlotPicker.tsx` component
2. Show 15 ranked slots
3. Display distance, weather, scores

### Phase 5: Map & Location
1. Create `Map.tsx` with Leaflet
2. Show all Philadelphia centers
3. Display donor location

### Phase 6: Booking Flow
1. Create `BookingForm.tsx`
2. Integrate `/api/appointments`
3. Handle confirmation

## CORS Configuration

Backend already has CORS enabled:

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Frontend proxy (in `vite.config.ts`):

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true
  }
}
```

## Environment Variables

### Backend (`.env`)
```
INHIBITOR_API_KEY=...
OPENAI_API_KEY=...
MONGODB_URL=mongodb://localhost:27017
```

### Frontend (`.env.local`)
```
VITE_API_URL=http://localhost:8000
VITE_MAPBOX_TOKEN=your_token_here (optional)
```

## Data Flow Examples

### Chat Message Flow

```
User types message
  ↓
Frontend: Chat.tsx calls api.sendChat()
  ↓
Backend: POST /api/chat/send
  ↓
Backend: Use ChatRouter → OpenAI reasoning
  ↓
Response: { message, action, data }
  ↓
Frontend: Display in Chat.tsx
```

### Slot Booking Flow

```
User selects location
  ↓
Frontend: Calls api.findNearestCenter()
  ↓
Backend: Geolocation calculates distance
  ↓
Frontend: Calls api.getAvailableSlots()
  ↓
Backend: AI ranks 15 slots
  ↓
Frontend: Shows SlotPicker.tsx
  ↓
User selects slot
  ↓
Frontend: Calls api.bookAppointment()
  ↓
Backend: Validates constraints, books
  ↓
Success response
```

## Testing Integration

### Manual Testing

```bash
# Terminal 1: Backend
cd backend && ./start.sh

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Test API
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "69dacc4c602cb9c49acd6770",
    "message": "Schedule me"
  }'
```

### Automated Testing

```bash
# Frontend tests
cd frontend && npm run test

# API tests
cd backend && bash test_chatbot.sh
```

## Performance Optimization

### Caching
```typescript
// Add query caching
const queryClient = new QueryClient();

// Cache available slots for 5 minutes
const { data: slots } = useQuery(
  ['slots', donorId],
  () => api.getAvailableSlots(donorId),
  { staleTime: 5 * 60 * 1000 }
);
```

### Code Splitting
```typescript
// Lazy load components
const ChatComponent = lazy(() => import('./components/Chat'));
const MapComponent = lazy(() => import('./components/Map'));
```

## Troubleshooting

### CORS Errors
- ✅ Backend has CORS enabled
- Check frontend proxy in `vite.config.ts`
- Ensure API_URL is correct

### 401 Unauthorized
- Check MongoDB is running
- Verify donor ID is valid ObjectId
- Check authentication headers if adding auth

### Timeout Errors
- Backend might be slow loading data
- Check MongoDB connection
- Increase timeout in axios config

### Map Not Showing
- Check Leaflet is installed
- Verify CSS is imported
- Check MapBox token (if using)

## Deployment

### Frontend (Vercel)
```bash
# Automatic deployment
git push origin main
# Vercel detects frontend/ and deploys
```

### Backend (Heroku/Railway)
```bash
# Deploy with environment variables
git push heroku main
```

## Security Checklist

- [ ] API keys in .env (not committed)
- [ ] CORS restricted to known origins
- [ ] Input validation on both sides
- [ ] Rate limiting on endpoints
- [ ] HTTPS in production
- [ ] API authentication tokens
- [ ] XSS protection
- [ ] CSRF tokens for mutations

## Next Steps

1. Initialize frontend: `npm install`
2. Create base layout
3. Integrate chat component
4. Add slot picker
5. Add map display
6. Test end-to-end flow
7. Deploy to production

---

**Status**: Integration guide complete. Ready to build!

