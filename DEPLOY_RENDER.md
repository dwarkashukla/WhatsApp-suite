# Deploy to Render.com

This guide walks you through deploying WhatsApp Suite using Render Blueprint + MongoDB Atlas.

## Prerequisites

- GitHub account
- MongoDB Atlas account (free tier): https://www.mongodb.com/atlas/database

## Step 1 — Push code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-suite.git
git push -u origin main
```

## Step 2 — Create Render Account

1. Go to https://render.com
2. Sign up using your GitHub account

## Step 3 — Create MongoDB Atlas Database

1. Go to https://www.mongodb.com/atlas/database and sign up (free tier available)
2. Deploy a **Shared (M0)** cluster — it's free
3. Once the cluster is created, go to **Security → Database Access**
   - Click **Add New Database User**
   - Choose **Password** authentication
   - Set a username and password (save these securely)
   - Click **Add User**
4. Go to **Security → Network Access**
   - Click **Add IP Address**
   - Enter `0.0.0.0/0` (allows Render to connect)
   - Click **Confirm**
5. Click **Connect** → **Drivers**
   - Copy the connection string, which looks like:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/whatsapp_suite?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with the credentials from step 3

## Step 4 — Deploy with Render Blueprint

1. In Render dashboard, click **New → Blueprint**
2. Connect your GitHub repository
3. Render will detect the `render.yaml` file
4. Click **Apply**
5. The first deploy will fail — **this is expected** because `MONGO_URI` is not yet set

## Step 5 — Set Environment Variables

1. In Render dashboard, go to your **whatsapp-suite-backend** service
2. Click the **Environment** tab
3. Add the following variables manually:

| Variable | Value |
|---|---|
| `MONGO_URI` | Your MongoDB Atlas connection string from Step 3 |
| `JWT_SECRET` | Run `openssl rand -hex 32` (or any secure random string) |
| `JWT_REFRESH_SECRET` | Run `openssl rand -hex 32` (use a different string) |
| `REDIS_HOST` | *(optional)* Leave empty if not using Redis |
| `REDIS_PORT` | *(optional)* Leave empty if not using Redis |

4. Click **Save Changes**
5. Render will automatically redeploy the service with the new environment variables

## Step 6 — Verify Deployment

Once the deploy succeeds:

- **Backend API**: `https://whatsapp-suite-backend.onrender.com/api`
- **Frontend**: `https://whatsapp-suite-backend.onrender.com`
- **Health check**: `https://whatsapp-suite-backend.onrender.com/api/health`

If you want a custom frontend URL, update `CLIENT_URL` in the Render dashboard Environment tab to your custom domain.

## Notes

- Render's free tier sleeps after 15 minutes of inactivity
- The first request after sleep takes ~30 seconds to wake up
- WhatsApp session data is persisted on a 1GB Render disk at `/opt/render/project/src/backend/sessions`
- For production workloads, upgrade to a paid plan ($7/month)