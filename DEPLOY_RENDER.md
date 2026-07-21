# Deploy to Render.com

## Prerequisites
- GitHub account
- MongoDB database (MongoDB Atlas recommended: https://www.mongodb.com/atlas/database)

## Steps

### 1. Push code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-suite.git
git push -u origin main
```

### 2. Create Render Account
- Go to https://render.com
- Sign up with GitHub

### 3. Deploy Backend
1. Click "New" → "Blueprint"
2. Connect your GitHub repository
3. Select the `render.yaml` file
4. Click "Apply"

### 4. Create MongoDB Database (if not using Atlas)
- In Render dashboard: "New" → "MongoDB"
- Or use MongoDB Atlas (recommended for production)

### 5. Update Environment Variables
After deployment, in Render dashboard:
- Go to your service → "Environment"
- Add these variables:
  - `MONGO_URI`: Your MongoDB connection string
  - `JWT_SECRET`: A secure random string (generate with: `openssl rand -hex 32`)
  - `JWT_REFRESH_SECRET`: Another secure random string
  - `REDIS_HOST` (optional): Leave empty if not using
  - `REDIS_PORT` (optional): Leave empty if not using

### 6. Deploy Frontend
Option A: Already included in render.yaml (served by backend)
Option B: Separate deployment
- "New" → "Static Site"
- Build command: `cd frontend && npm install && npm run build`
- Publish directory: `frontend/dist`
- Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`

## Access Your Application
- Frontend: https://whatsapp-suite-backend.onrender.com
- API: https://whatsapp-suite-backend.onrender.com/api

## Notes
- Free tier sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Sessions are persisted in Render disk (1GB)
- For production, upgrade to paid plan ($7/month)