# WhatsApp Suite

## Running Locally on Windows (PowerShell)

### Prerequisites
- Node.js installed
- MongoDB installed or MongoDB Atlas account

### Setup

**First, navigate to your project folder:**
```powershell
cd C:\Users\maxwa\Downloads\CyberPeace\whatsapp-suite
```

1. **Install backend dependencies:**
```powershell
cd backend
npm install
```

2. **Configure environment:**
```powershell
Copy-Item .env.example .env
```

3. **Install frontend dependencies:**
```powershell
cd ..\frontend
npm install
```

4. **Start backend (PowerShell Window 1):**
```powershell
cd ..\backend
node server.js
```

5. **Start frontend (PowerShell Window 2):**
```powershell
cd ..\frontend
npm run dev
```

6. **Open browser to:**
```
http://localhost:5173
```

## Original Task Completed

- Fixed TypeScript deprecation error in `frontend/tsconfig.json`
- Added `"ignoreDeprecations": "6.0"` to compilerOptions

## Deployment

See `DEPLOY_RENDER.md` for instructions on deploying to Render.com.