# Cloud Run Backend Authentication Setup

This document explains how to add authentication to your Cloud Run backend API.

## Why Add Authentication?

Currently, your Cloud Run API is publicly accessible. Anyone who knows the URL can call your endpoints, which could lead to:
- Unauthorized usage and costs
- Potential abuse
- No control over who uses your API

By adding API key authentication, your API will only accept requests from your Next.js frontend.

## Step-by-Step Setup

### Step 1: Generate a Secure API Key

Run this command to generate a secure random key:

```bash
openssl rand -base64 32
```

Save this key - you'll need it for both Cloud Run and Vercel.

### Step 2: Update Your Flask/FastAPI Backend

Add authentication middleware to your backend application.

#### For Flask Applications:

```python
from flask import Flask, request, jsonify
from functools import wraps
import os

app = Flask(__name__)

# Load API secret from environment variable
API_SECRET = os.environ.get('API_SECRET')

def require_api_key(f):
    """Decorator to require API key authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get API key from request header
        api_key = request.headers.get('X-API-Key')

        # Validate API key
        if not api_key or api_key != API_SECRET:
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Valid API key required'
            }), 401

        # API key is valid, proceed with the request
        return f(*args, **kwargs)
    return decorated_function

# Apply decorator to your endpoints
@app.route('/predict_stress_dl', methods=['GET'])
@require_api_key
def predict_stress_dl():
    prompt = request.args.get('prompt')
    # Your existing code here
    return jsonify(result)

@app.route('/predict_theme', methods=['GET'])
@require_api_key
def predict_theme():
    prompt = request.args.get('prompt')
    multi_label = request.args.get('multi_label', False)
    # Your existing code here
    return jsonify(result)
```

#### For FastAPI Applications:

```python
from fastapi import FastAPI, Header, HTTPException, Depends
import os

app = FastAPI()

API_SECRET = os.environ.get('API_SECRET')

async def verify_api_key(x_api_key: str = Header(...)):
    """Dependency to verify API key"""
    if x_api_key != API_SECRET:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    return x_api_key

# Use as dependency in your endpoints
@app.get("/predict_stress_dl", dependencies=[Depends(verify_api_key)])
async def predict_stress_dl(prompt: str):
    # Your existing code here
    return result
```

### Step 3: Set Environment Variable in Cloud Run

#### Option A: Using gcloud CLI

```bash
gcloud run services update stress-sense-v3 \
  --region=europe-west1 \
  --set-env-vars="API_SECRET=YOUR_GENERATED_KEY_HERE"
```

#### Option B: Using Google Cloud Console

1. Go to [Cloud Run](https://console.cloud.google.com/run) in GCP Console
2. Select your service (`stress-sense-v3`)
3. Click **"Edit & Deploy New Revision"**
4. Go to **"Variables & Secrets"** tab
5. Click **"Add Variable"**
6. Add environment variable:
   - Name: `API_SECRET`
   - Value: Your generated key from Step 1
7. Click **"Deploy"**

### Step 4: Test Authentication

Test that unauthorized requests are blocked:

```bash
# This should return 401 Unauthorized
curl "https://stress-sense-v3-1032027763517.europe-west1.run.app/predict_stress_dl?prompt=test"

# This should work (200 OK)
curl -H "X-API-Key: YOUR_GENERATED_KEY_HERE" \
  "https://stress-sense-v3-1032027763517.europe-west1.run.app/predict_stress_dl?prompt=test"
```

### Step 5: Update Your Next.js Environment Variables

Update your `.env.local` file with the API secret:

```bash
GOOGLE_API_KEY=your_google_api_key_here
STRESS_API_BASE_URL=https://stress-sense-v3-1032027763517.europe-west1.run.app
STRESS_API_SECRET=YOUR_GENERATED_KEY_HERE
```

The Next.js API routes are already configured to send this key automatically!

### Step 6: Test Locally

```bash
cd stress-sense-nextjs
npm run dev
```

Visit http://localhost:3000 and test the app. It should work normally, but now all requests are authenticated!

### Step 7: Deploy to Vercel

When deploying to Vercel, add these environment variables:

1. Go to your project settings in Vercel
2. Navigate to **Environment Variables**
3. Add:
   - `GOOGLE_API_KEY`: Your Google Gemini API key
   - `STRESS_API_BASE_URL`: `https://stress-sense-v3-1032027763517.europe-west1.run.app`
   - `STRESS_API_SECRET`: Your generated key (same as Cloud Run)

## Security Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ (API URL hidden)
         ↓
┌─────────────────────┐
│  Vercel (Next.js)   │
│  - Frontend         │
│  - API Routes       │ ← Adds X-API-Key header
└────────┬────────────┘
         │ (Authenticated request)
         ↓
┌─────────────────────┐
│  Cloud Run API      │
│  - Validates key    │ ← Checks X-API-Key
│  - Returns data     │
└─────────────────────┘
```

## Security Best Practices

✅ **API URL never exposed to browser** - Hidden in server-side env vars
✅ **API key never exposed to browser** - Only Next.js API routes have access
✅ **Authentication enforced** - Cloud Run rejects unauthorized requests
✅ **Works from any client** - Not just browser CORS protection
✅ **Future-proof** - Easy to add rate limiting, caching, etc.

## Optional Enhancements

### Add Rate Limiting (Recommended)

Install flask-limiter:
```bash
pip install flask-limiter
```

Add to your Flask app:
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/predict_stress_dl')
@require_api_key
@limiter.limit("10 per minute")
def predict_stress_dl():
    # Your code here
    pass
```

### Add Request Logging

```python
import logging

@require_api_key
def predict_stress_dl():
    logging.info(f"Stress prediction request from {request.remote_addr}")
    # Your code here
```

## Troubleshooting

### Issue: Getting 401 errors even with correct key

**Check:**
1. Environment variable is set correctly in Cloud Run
2. Key matches exactly (no extra spaces or newlines)
3. Header name is exactly `X-API-Key` (case-sensitive)
4. Cloud Run service has been redeployed after adding env var
5. Restart Next.js dev server after changing `.env.local`

### Issue: Cloud Run shows old behavior

**Solution:**
- Make sure you deployed a new revision after adding the env var
- Check current env vars:
  ```bash
  gcloud run services describe stress-sense-v3 --region=europe-west1
  ```

### Issue: Works locally but not on Vercel

**Check:**
1. Environment variables are set in Vercel project settings
2. Variable names match exactly
3. Redeploy after adding environment variables

## Summary

After completing these steps:

✅ Your Cloud Run API requires authentication
✅ Only your Next.js app can call the API
✅ API URL and credentials are completely hidden
✅ Ready for secure production deployment

Your API is now secure! 🔒
