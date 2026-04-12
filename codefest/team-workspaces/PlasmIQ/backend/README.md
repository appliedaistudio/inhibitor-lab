# PlasmIQ Backend - Scheduling Chatbot API

AI-powered scheduling chatbot for plasma donation centers with intelligent rescheduling and ethical guardrails.

## Architecture

```
┌─────────────────────────────────────────────────┐
│ FastAPI Backend (main.py)                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Routes:                                        │
│  ├── /api/donors       - Donor management       │
│  ├── /api/appointments - Appointment CRUD       │
│  └── /api/chat         - Chat interface         │
│                                                 │
│  Services:                                      │
│  ├── OpenAI Reasoning Engine (reasoning.py)    │
│  │   └── Slot ranking, personalization         │
│  ├── Inhibitor API (inhibitor.py)              │
│  │   └── Ethical evaluation                    │
│  └── MongoDB (db.py)                           │
│      └── Data persistence                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Setup

### Prerequisites
- Python 3.10+
- MongoDB 4.0+ (running locally or remote)
- API Keys:
  - OpenAI API Key
  - Inhibitor API Key

### Installation

1. **Install dependencies:**
   ```bash
   pip3 install -r requirements.txt --break-system-packages
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp ../.env.example ../.env
   # Edit ../.env with your credentials
   ```

3. **Verify MongoDB connection:**
   ```bash
   # MongoDB should be running on localhost:27017
   # Or update MONGODB_URL in .env
   ```

### Running the Server

**Development:**
```bash
./start.sh
# Or directly:
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Production:**
```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Server will be available at `http://localhost:8000`

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Donors
```bash
# Create donor
curl -X POST http://localhost:8000/api/donors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "preferred_time": "morning"
  }'

# Get donor
curl http://localhost:8000/api/donors/{donor_id}

# List donors
curl http://localhost:8000/api/donors
```

### Appointments
```bash
# Create appointment
curl -X POST http://localhost:8000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "{donor_id}",
    "center_id": "{center_id}",
    "scheduled_time": "2026-04-15T10:00:00",
    "status": "scheduled"
  }'

# Get appointment
curl http://localhost:8000/api/appointments/{appointment_id}

# Reschedule appointment
curl -X POST http://localhost:8000/api/appointments/{appointment_id}/reschedule \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_time": "2026-04-16T14:00:00",
    "reason": "Traffic delay"
  }'

# Mark as missed
curl -X POST http://localhost:8000/api/appointments/{appointment_id}/mark-missed
```

### Chat
```bash
# Send chat message
curl -X POST http://localhost:8000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "{donor_id}",
    "message": "Can I schedule an appointment?"
  }'
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration & settings
│   ├── models/
│   │   └── database.py      # Pydantic schemas & MongoDB models
│   ├── routes/
│   │   ├── donors.py        # Donor endpoints
│   │   ├── appointments.py  # Appointment endpoints
│   │   └── chat.py          # Chat interface
│   ├── services/            # Business logic (optional)
│   └── utils/
│       ├── db.py            # MongoDB connection
│       ├── inhibitor.py     # Inhibitor API wrapper
│       └── reasoning.py     # OpenAI reasoning engine
├── requirements.txt         # Python dependencies
├── start.sh                 # Startup script
└── README.md               # This file
```

## Key Features

### 1. **Smart Slot Ranking**
- Analyzes donor patterns (preferred times, historical show-up rates)
- Considers context signals (weather, traffic, center crowding)
- Ranks top 3 slots using OpenAI reasoning

### 2. **Personalized Messaging**
- Generates customized engagement messages
- Tailored to donor preferences and incentives
- AI-driven tone and timing optimization

### 3. **Intelligent Rescheduling**
- Handles missed appointments automatically
- Factors in traffic delays and external disruptions
- Suggests optimal alternative slots

### 4. **Ethical Guardrails**
- All donor communications validated via Inhibitor API
- Ensures messages are respectful and non-coercive
- Ethical risk assessment before sending

### 5. **Real-time Chat Interface**
- Intent classification (schedule, reschedule, inquire)
- Context-aware responses
- Escalation to human agents if needed

## Environment Variables

```env
# Inhibitor API (ethical evaluation)
INHIBITOR_API_KEY=your-key-here
INHIBITOR_BASE_URL=https://iaas.appliedai.studio

# OpenAI (AI reasoning)
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4

# MongoDB (data persistence)
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=plasmiq

# Application
DEBUG=True
ENVIRONMENT=development
```

## Development Notes

### Adding New Routes
1. Create a new file in `app/routes/`
2. Define FastAPI router and endpoints
3. Include router in `app/main.py` with `app.include_router()`

### Extending the Reasoning Engine
- Edit `app/utils/reasoning.py`
- Add new methods for different scheduling scenarios
- Enhance prompts for better AI reasoning

### Inhibitor Integration
- All donor-facing communications pass through `inhibitor.evaluate_thought_chain()`
- Customize ethical guidelines in prompt engineering

## Troubleshooting

**MongoDB Connection Failed:**
- Ensure MongoDB is running: `brew services list | grep mongodb`
- Check connection string in `.env`
- Verify firewall isn't blocking port 27017

**API Key Errors:**
- Verify `.env` file exists and has correct keys
- Check for extra whitespace in key values
- Test keys independently with curl/Postman

**Import Errors:**
- Ensure all dependencies installed: `pip3 list | grep fastapi`
- Check Python version: `python3 --version` (3.10+)
- Reinstall if needed: `pip3 install --force-reinstall -r requirements.txt`

## Next Steps

1. **Frontend (React)** - Build chat UI
2. **Database Seeding** - Add sample donors and centers
3. **Integration Tests** - Test workflows end-to-end
4. **Deployment** - Docker & cloud hosting setup
5. **Analytics** - Track appointment and engagement metrics

---

**Built with:** FastAPI • MongoDB • OpenAI • Inhibitor API
