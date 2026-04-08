# AMS Backend Deployment

## Quick Deploy to Render (Free)

1. **Create Render Account**: https://render.com
2. **Connect GitHub**: Link your GitHub repo
3. **Create Web Service**:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
4. **Environment Variables**:
   - `FIREBASE_SERVICE_ACCOUNT`: Your Firebase service account JSON (single line)
   - `PORT`: Auto-set by Render

## Frontend Update

After backend deploys, update `frontend/.env`:
```
REACT_APP_API_BASE=https://your-render-app.onrender.com
```

Then redeploy frontend:
```bash
cd frontend
npm run build
firebase deploy --only hosting
```