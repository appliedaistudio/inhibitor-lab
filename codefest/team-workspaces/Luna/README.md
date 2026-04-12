# Luna 🌙

## Team
- **Team name:** Luna
- **Team members:** Thu, Shreya, Abibat, Kira

## Challenges implemented
- **Challenge 1: Culture & Community Innovation Award (CCI)** — Luna connects women with similar symptoms, fostering community and reducing isolation around women's health experiences
- **Challenge 2: Inhibitor Innovation & Red Team Gauntlet (Track A)** — Built an AI-powered women's health agent where every GPT-4o response is validated in real time by the Inhibitor API before reaching the user

## What we built
Luna is an AI-powered women's health screening assistant. Users answer 8 symptom questions, and Luna generates personalized health insights using GPT-4o. Every response is validated by the Inhibitor API to ensure nothing unsafe, biased, or harmful reaches the user. Luna also matches users with other women who share similar symptoms, so no one feels alone in their health journey.

## Run instructions

### Backend
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env`in the backend folder:
```
OPENAI_API_KEY=your_openai_key
INHIBITOR_API_KEY=your_inhibitor_key
```

Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0
```

API docs available at: `http://YOUR_IP:8000/docs`

### Frontend
```bash
cd frontend
npm install
```

Create a `.env` file in the frontend folder:
```
EXPO_PUBLIC_API_URL=http://YOUR_IP:8000
```

Run the app:
```bash
npx expo start --clear
```

Scan the QR code with Expo Go on your phone. Make sure your phone and computer are on the same WiFi network.

## API Endpoints

### POST /analyze
Takes user profile and symptom screening answers, returns GPT-4o health insight validated by Inhibitor.

### POST /match
Finds women with similar symptoms from dataset, returns GPT-4o generated community summary validated by Inhibitor.

## Assumptions and limitations
- User profile (age, weight, height) is currently set to placeholder values; a future version would collect this during onboarding
- Matching is based on a synthetic dataset of 50 profiles; a larger real-world dataset would improve match quality
- The app is designed for iOS via Expo Go
- Inhibitor validates every AI-generated response before it reaches the user — if flagged, a safe fallback message is shown instead

## License and copyright
Copyright (c) 2025 Luna Team — Thu, Shreya, Abibat, Kira

This team's submission is provided under the MIT License.

SPDX-License-Identifier: MIT
