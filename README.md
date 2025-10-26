# Stress Sense Companion - Next.js

A mental health companion app that analyzes text for stress levels, identifies stress themes, and provides personalized recommendations using AI.

## Features

- Stress level detection using machine learning
- Theme identification from text input
- AI-powered recommendations via Google Gemini
- Beautiful pie chart visualizations
- Responsive design with Tailwind CSS
- **Secure API proxy** - Backend API URL and credentials kept private

## Architecture

This app uses a secure proxy pattern where:
- Frontend calls Next.js API routes (not external APIs directly)
- API routes proxy requests to the backend, keeping credentials secure
- Backend API URL is never exposed to the browser
- API authentication headers are added server-side only

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Google Gemini API key
- Access to the Stress Sense backend API
- API secret key for authenticating with the backend

### Installation

1. Clone the repository:
```bash
git clone https://github.com/g0zzy/stress-sense-nextjs.git
cd stress-sense-nextjs
```

2. Install dependencies:
```bash
npm install
```

3. Generate an API secret key:
```bash
openssl rand -base64 32
```

4. Create a `.env.local` file in the root directory (copy from `.env.example`):
```bash
# Google Gemini API Key
GOOGLE_API_KEY=your_google_api_key_here

# Stress Sense API Configuration (Server-side only)
STRESS_API_BASE_URL=https://stress-sense-v3-1032027763517.europe-west1.run.app
STRESS_API_SECRET=your_generated_secret_from_step_3
```

5. **Configure your Cloud Run backend** (see section below)

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuring Cloud Run Backend for Authentication

To secure your Cloud Run API and only accept authenticated requests:

### Option 1: API Key Authentication (Recommended for simplicity)

1. **Update your Cloud Run service to validate API keys:**

Add this middleware to your Flask/FastAPI app:

```python
from flask import request, jsonify
import os

API_SECRET = os.environ.get('API_SECRET')

def require_api_key(f):
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key or api_key != API_SECRET:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Apply to your endpoints
@app.route('/predict_stress_dl')
@require_api_key
def predict_stress_dl():
    # your existing code
    pass
```

2. **Set the API_SECRET environment variable in Cloud Run:**

```bash
gcloud run services update stress-sense-v3 \
  --region=europe-west1 \
  --set-env-vars="API_SECRET=your_generated_secret_from_earlier"
```

3. **Verify it works:**
```bash
# This should fail (401 Unauthorized)
curl https://stress-sense-v3-1032027763517.europe-west1.run.app/predict_stress_dl

# This should work
curl -H "X-API-Key: your_secret" \
  https://stress-sense-v3-1032027763517.europe-west1.run.app/predict_stress_dl
```

### Option 2: Cloud Run IAM Authentication (More secure, but complex)

If you want Google-managed authentication:

1. Set Cloud Run to require authentication:
```bash
gcloud run services update stress-sense-v3 \
  --region=europe-west1 \
  --no-allow-unauthenticated
```

2. Create a service account and give it invoker permissions
3. Use Google Auth libraries to authenticate requests from Next.js

**Note:** Option 1 is simpler and sufficient for most use cases.

## Deployment on Vercel

1. Push your code to GitHub (already done ✅)

2. Go to [Vercel](https://vercel.com) and sign in

3. Click "New Project" and import your repository: `g0zzy/stress-sense-nextjs`

4. Add environment variables:
   - `GOOGLE_API_KEY`: Your Google Gemini API key
   - `STRESS_API_BASE_URL`: `https://stress-sense-v3-1032027763517.europe-west1.run.app`
   - `STRESS_API_SECRET`: The same secret you configured in Cloud Run

5. Click "Deploy"

6. Once deployed, test your app!

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Google Generative AI (Gemini)** - AI recommendations
- **Axios** - HTTP requests

## API Architecture

### Frontend → Next.js API Routes (Public)
- `/api/predict-stress` - POST - Proxy to stress prediction
- `/api/predict-theme` - POST - Proxy to theme prediction
- `/api/recommendation` - POST - Generate AI recommendations

### Next.js API Routes → Backend API (Authenticated)
- Adds `X-API-Key` header for authentication
- Keeps backend URL and credentials secret
- Handles errors gracefully

## Security Features

✅ Backend API URL not exposed to browser
✅ API credentials handled server-side only
✅ Authentication headers added automatically
✅ Error messages sanitized for client
✅ Environment variables properly gitignored

## License

MIT
