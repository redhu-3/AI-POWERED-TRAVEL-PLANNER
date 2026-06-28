# TripCraft AI — AI-Powered Travel Itinerary Planner

TripCraft AI is a premium full-stack web application that generates context-aware, day-by-day travel itineraries using the Google Gemini LLM. Users enter a destination, trip length, budget, and interests — the AI then combines live weather data, real-time currency exchange rates, and curated destination photos to produce a rich, personalized travel plan. Itineraries can be saved to a personal dashboard, viewed at any time, and regenerated day-by-day without losing the rest of the schedule.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js (Vite), React Router v6, Axios, Custom Glassmorphic CSS |
| **Backend** | Node.js, Express.js, REST API |
| **Database** | MongoDB Atlas with Mongoose ODM |
| **Authentication** | JWT (JSON Web Tokens) + Bcrypt password hashing |
| **AI Engine** | Google Gemini API (`gemini-1.5-flash`) with structured JSON output |
| **Weather** | OpenWeatherMap API — live temperature & forecast |
| **Currency** | ExchangeRate-API / open.er-api.com (keyless fallback) |
| **Photos** | Unsplash API — high-quality destination images |

---

## Key Features

- 🤖 **Gemini AI Generation** — Structured JSON itineraries with morning, afternoon, and evening plans for each day
- 🌦️ **Weather-Aware Planning** — Live weather context shifts activity suggestions (rainy → indoor; sunny → outdoor)
- 💱 **Dual Currency Display** — USD estimates alongside live local currency conversions
- 🖼️ **Destination Collage** — Automatically fetches 3 Unsplash photos to build a hero banner
- 🔄 **Single-Day Regeneration** — Regenerate any individual day's plan on demand
- 💾 **Save & History** — Save itineraries to your personal dashboard; view or delete them any time
- 🔐 **JWT Auth** — Secure login/signup; all itinerary routes are protected
- 📱 **Fully Responsive** — Mobile-first layout from 375px to 1440px+

---

## Setup Instructions

### Prerequisites
- **Node.js** v18 or higher
- A **MongoDB Atlas** cluster (or local MongoDB instance)
- API keys listed below

### Environment Variables

Create a `.env` file inside the `/backend` directory:

```env
# Required
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/tripcraft
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_google_gemini_api_key

# Optional (app degrades gracefully without these)
WEATHER_API_KEY=your_openweathermap_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
EXCHANGE_RATE_API_KEY=your_exchangerate_api_key
```

> **Where to get keys:**
> - Gemini: [Google AI Studio](https://aistudio.google.com/app/apikey)
> - Weather: [OpenWeatherMap](https://openweathermap.org/api)
> - Unsplash: [Unsplash Developers](https://unsplash.com/developers)
> - Exchange Rate: [ExchangeRate-API](https://www.exchangerate-api.com/) *(optional — free public endpoint is used as fallback)*

### 1. Run the Backend

```bash
cd tripcraft-ai/backend
npm install
npm run dev
# Server starts on http://localhost:5000
```

### 2. Run the Frontend

```bash
cd tripcraft-ai/frontend
npm install
npm run dev
# App opens at http://localhost:5173
```

> **Frontend `.env` (optional)** — Create `/frontend/.env` if your backend runs on a different port:
> ```env
> VITE_API_URL=http://localhost:5000/api
> ```

---

## Folder Structure

```
tripcraft-ai/
├── backend/
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification middleware
│   ├── models/
│   │   ├── User.js               # Mongoose User schema
│   │   └── Itinerary.js          # Mongoose Itinerary schema
│   ├── routes/
│   │   ├── authRoutes.js         # POST /api/auth/signup, /login
│   │   └── itineraryRoutes.js    # Generate, save, fetch, delete, regenerate-day
│   ├── server.js                 # Express app entry point
│   ├── .env                      # Environment variables (not committed)
│   └── package.json
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Navbar.jsx          # Sticky navbar with mobile hamburger
        │   ├── Navbar.css
        │   ├── SkeletonLoader.jsx  # Full-page loading state during generation
        │   └── SkeletonLoader.css
        ├── context/
        │   └── AuthContext.jsx     # Global auth state (login, signup, logout)
        ├── pages/
        │   ├── Home.jsx            # Landing page: hero, how-it-works, preview
        │   ├── Home.css
        │   ├── Login.jsx           # Login form
        │   ├── Signup.jsx          # Signup form
        │   ├── Login.css           # Shared auth form styles
        │   ├── Dashboard.jsx       # Itinerary generator form + saved trips list
        │   ├── Dashboard.css
        │   ├── ItineraryResult.jsx # Tabbed result view: days / lodging / tips
        │   └── ItineraryResult.css
        ├── utils/
        │   └── api.js              # Axios instance with JWT interceptor
        ├── App.jsx                 # Routes + ProtectedRoute wrapper
        ├── index.css               # Global design tokens, glass, buttons, skeleton
        └── main.jsx
```

---

## Architecture Flow

```
React Client
  │
  ├── POST /api/itinerary/generate (JWT required)
  │     │
  │     ├── 1. OpenWeatherMap → live weather for destination
  │     ├── 2. ExchangeRate API → USD → local currency rate
  │     ├── 3. Unsplash → 3 destination photos
  │     └── 4. Google Gemini → structured JSON itinerary
  │
  ├── POST /api/itinerary/save → MongoDB
  ├── GET  /api/itinerary      → user's saved list
  └── DELETE /api/itinerary/:id
```

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | ❌ | Create account |
| `POST` | `/api/auth/login` | ❌ | Login, returns JWT |
| `POST` | `/api/itinerary/generate` | ✅ JWT | Generate a new itinerary |
| `POST` | `/api/itinerary/regenerate-day` | ✅ JWT | Regenerate a single day |
| `POST` | `/api/itinerary/save` | ✅ JWT | Save itinerary to DB |
| `GET` | `/api/itinerary` | ✅ JWT | Get all saved itineraries |
| `DELETE` | `/api/itinerary/:id` | ✅ JWT | Delete a saved itinerary |
