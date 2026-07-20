# PlantGuard AI — Plant Disease Detection System

A full-stack application for detecting plant diseases using EfficientNet-B4 with Grad-CAM heatmaps and AI-powered treatment advice via Ollama LLM.

## Tech Stack

- **Backend:** Python 3.13, FastAPI, TensorFlow/Keras, SQLAlchemy (SQLite)
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons
- **AI Chat:** Ollama (with rule-based fallback knowledge base)
- **Auth:** bcrypt password hashing, JWT (HS256, 7-day expiry)
- **Rate Limiting:** slowapi (5/min signup, 10/min login)

## Features

1. **Disease Detection** — Upload a leaf photo, get instant AI diagnosis with Grad-CAM heatmap overlay. Supports 38 disease classes across 14 crops.
2. **PlantGuard AI Chat** — Context-aware chatbot for treatment advice (Ollama-powered, falls back to rule-based knowledge base when offline). Sessions are auto-saved and persist across page refreshes.
3. **Detection History** — Past scans stored in SQLite with pagination, search, and delete.
4. **Camera Capture** — Take photos directly from mobile browser (no gallery needed).
5. **Report Export** — Download prediction reports as printable PDFs.
6. **User Accounts** — Sign up / log in with JWT authentication. History and chat sessions are scoped per user.
7. **Dashboard** — Aggregated stats (total scans, health score, accuracy rate, alerts).
8. **Expert Tips** — Curated library of treatment and prevention tips.
9. **Rate Limiting** — Protects auth endpoints from brute-force attacks.

## Prerequisites

- Python 3.13+
- Node.js 18+
- `efficientnet_b4.keras` model file placed in `backend/trained_model/`
- [Ollama](https://ollama.com) (optional — chat falls back to rule-based if unavailable)

## Quick Start (Local)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000
OLLAMA_MODEL=qwen2.5-coder:3b
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=60
```

Start the backend:
```bash
uvicorn main:app --reload
```
Runs on `http://localhost:8000`. Database tables are created automatically on first startup.

### 2. Frontend

```bash
cd frontend
cp .env.example .env           # VITE_API_URL defaults to http://localhost:8000
npm install
npm run dev
```
Runs on `http://localhost:3000`.

### 3. (Optional) Pull the Ollama model

```bash
ollama pull qwen2.5-coder:3b
ollama serve
```

## API Endpoints

### Auth
| Method | Route          | Description          | Rate Limit |
|--------|----------------|----------------------|------------|
| POST   | `/auth/signup` | Register a new user  | 5/min      |
| POST   | `/auth/login`  | Log in, get JWT      | 10/min     |
| GET    | `/auth/me`     | Get current user     | —          |

### Prediction
| Method | Route      | Description                            |
|--------|------------|----------------------------------------|
| POST   | `/predict` | Upload leaf image → prediction result  |

### Chat
| Method | Route                      | Description                          |
|--------|----------------------------|--------------------------------------|
| POST   | `/chat`                    | Context-aware AI chat (with session) |
| GET    | `/chat/sessions`           | List chat sessions                   |
| GET    | `/chat/sessions/{id}`      | Get session with messages            |
| POST   | `/chat/sessions`           | Create a new session                 |
| POST   | `/chat/sessions/{id}/messages` | Add a message to a session        |
| DELETE | `/chat/sessions/{id}`      | Delete a session                     |

### History
| Method | Route            | Description                     |
|--------|------------------|----------------------------------|
| GET    | `/history`       | List prediction history (paginated) |
| POST   | `/history`       | Add a history item               |
| DELETE | `/history`       | Clear all history                |
| DELETE | `/history/{id}`  | Delete single history item       |

### Dashboard
| Method | Route               | Description                |
|--------|---------------------|----------------------------|
| GET    | `/dashboard/stats`  | Aggregated analytics       |
| GET    | `/dashboard/recent` | Recent 5 predictions       |

### Guides & Tips
| Method | Route        | Description                        |
|--------|--------------|------------------------------------|
| GET    | `/guides`    | List all treatment guides          |
| GET    | `/tips`      | List all expert tips               |
| GET    | `/tips/{id}` | Get a single expert tip by ID      |

### Health
| Method | Route | Description                        |
|--------|-------|------------------------------------|
| GET    | `/`   | Health check (model + KB status)   |

## 38 Supported Classes (14 Crops)

| Crop           | Conditions                                                                 |
|----------------|---------------------------------------------------------------------------|
| Apple          | Apple Scab, Black Rot, Cedar Apple Rust, Healthy                          |
| Bell Pepper    | Bacterial Spot, Healthy                                                   |
| Blueberry      | Healthy                                                                   |
| Cherry         | Powdery Mildew, Healthy                                                   |
| Corn (Maize)   | Cercospora Leaf Spot, Common Rust, Northern Leaf Blight, Healthy          |
| Grape          | Black Rot, Esca (Black Measles), Leaf Blight, Healthy                     |
| Orange         | Haunglongbing (Citrus Greening)                                           |
| Peach          | Bacterial Spot, Healthy                                                   |
| Potato         | Early Blight, Late Blight, Healthy                                        |
| Raspberry      | Healthy                                                                   |
| Soybean        | Healthy                                                                   |
| Squash         | Powdery Mildew                                                           |
| Strawberry     | Leaf Scorch, Healthy                                                      |
| Tomato         | Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, Yellow Leaf Curl Virus, Tomato Mosaic Virus, Healthy |

## Project Structure

```
├── backend/
│   ├── ai/                    # Model loading, preprocessing (128×128, EfficientNet norm), prediction, Grad-CAM
│   ├── chat/                  # Ollama-powered chat + rule-based fallback + session persistence
│   ├── controllers/           # FastAPI route handlers
│   │   ├── auth_controller.py
│   │   ├── chatbot_controller.py
│   │   ├── chat_history_controller.py
│   │   ├── dashboard_controller.py
│   │   ├── history_controller.py
│   │   ├── prediction_controller.py
│   │   └── tips_controller.py
│   ├── core/                  # Shared dependencies
│   │   ├── auth.py            # Password hashing, JWT create/decode, get_current_user
│   │   └── database.py        # SQLAlchemy session dependency
│   ├── database/              # ORM layer
│   │   ├── engine.py          # SQLAlchemy engine + declarative Base
│   │   └── models.py          # User, Prediction, ChatSession, ChatMessage
│   ├── knowledge_base/        # Disease treatment knowledge (JSON)
│   ├── services/              # Business logic layer
│   ├── trained_model/         # efficientnet_b4.keras
│   ├── utils/                 # Image validation, leaf validator, Grad-CAM helpers
│   ├── requirements.txt
│   └── .env                   # JWT_SECRET, CORS_ORIGINS, Ollama config
├── frontend/
│   ├── src/
│   │   ├── components/        # TopNavbar, BottomNavbar, CameraCapture, Toast
│   │   ├── context/           # AuthContext (localStorage-based)
│   │   ├── pages/             # Home, Detection, Chat, History, Login, Guides
│   │   └── services/          # api.ts (Axios client with JWT interceptor)
│   └── package.json
```
