# B.L.A.S.T. Framework - Vercel Production Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- Vercel CLI installed (`npm install -g vercel`)
- JIRA and GROQ credentials ready

## Step 1: Build and Test Locally

```bash
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK

# Build the React app
npm run build

# Verify build is successful
ls -lah build/
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Login to Vercel (first time only)
vercel login

# Deploy to production
vercel --prod

# Follow the prompts:
# - Project name: jira-test-plan-generator
# - Framework: Create React App
# - Output directory: build
# - Override settings: No
```

### Option B: Using GitHub (Recommended for future deployments)

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import from GitHub
4. Select your repository
5. Configure environment variables (see Step 3)
6. Deploy

## Step 3: Set Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:

```
REACT_APP_JIRA_BASE_URL = https://your-domain.atlassian.net
REACT_APP_JIRA_EMAIL = your.email@example.com
REACT_APP_JIRA_API_TOKEN = your_atlassian_api_token_here
REACT_APP_GROQ_API_KEY = your_groq_api_key_here
REACT_APP_GROQ_MODEL = openai/gpt-oss-120b
REACT_APP_TEST_ISSUE_ID = KAN-1
REACT_APP_API_URL = /api/jira
```

## Step 4: Verify Deployment

After deployment completes:

1. Visit your deployment URL (e.g., `https://jira-test-plan-generator-xyz.vercel.app`)
2. Click "Settings" tab
3. Click "Test Connections"
4. Should see:
   - ✅ JIRA: Connected
   - ✅ GROQ: Connected

## Production URL

Your app will be available at:
```
https://jira-test-plan-generator-<random-id>.vercel.app
```

## Troubleshooting

### JIRA Connection Error
- Verify JIRA token is valid and not expired
- Check JIRA Base URL is correct
- Ensure JIRA email is correct

### GROQ 401 Error
- Verify GROQ API key is valid
- Create a new key at https://console.groq.com/keys
- Update environment variable in Vercel Dashboard

### Serverless Function Timeout
- The `/api/jira` endpoint is a serverless function
- Default timeout is 60 seconds
- If JIRA is slow, it may timeout
- Increase timeout in vercel.json if needed

## Rolling Back

If deployment fails:

```bash
# List recent deployments
vercel list

# Rollback to previous version
vercel rollback
```

## Monitoring

Monitor your deployment at:
- Vercel Dashboard: https://vercel.com/dashboard
- Analytics: https://vercel.com/dashboard/[project]/analytics
- Logs: https://vercel.com/dashboard/[project]/logs

## CI/CD Pipeline

For automatic deployments on push:

1. Connect GitHub to Vercel
2. Set "Main" branch as production
3. Every push to main triggers automatic deployment

## Notes

- Development: Uses local backend API (`http://localhost:5000/api/jira`)
- Production: Uses Vercel serverless function (`/api/jira`)
- Build output: `build/` folder (~57KB gzipped)
- No environment variables in browser (all proxied through API)
- JIRA and GROQ keys are never exposed to frontend
