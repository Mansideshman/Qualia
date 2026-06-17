# 🚀 Getting Started - JIRA Test Plan Generator

**Quick Start Guide**  
**Last Updated:** June 11, 2026

---

## Prerequisites

Before you can run the JIRA Test Plan Generator, you need:

### 1. System Requirements
- **Node.js:** v18 or higher
- **npm:** v9 or higher (or pnpm)
- **Git:** For version control
- **Browser:** Chrome, Firefox, Safari, or Edge (latest versions)

### 2. JIRA Cloud Account
- Active JIRA Cloud instance
- Admin access (to create API tokens)
- Valid JIRA project with issues

### 3. GROQ API Account
- GROQ API key (free tier available)
- API access enabled

### 4. Code Editor
- VS Code (recommended) or any JavaScript IDE

---

## Step 1: Clone/Setup the Project

### Option A: Clone from Git
```bash
cd ~/Documents/AITester/
git clone <repository-url> jira-test-generator
cd jira-test-generator
```

### Option B: Use Existing Directory
```bash
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK
```

---

## Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# If you prefer pnpm:
pnpm install

# Verify installation
npm --version
node --version
```

### Required Dependencies
These should be installed automatically:
- `react` - UI framework
- `react-dom` - DOM binding
- `axios` - HTTP client
- `tailwindcss` - CSS framework
- `html2pdf` - PDF generation
- `react-markdown` - Markdown rendering

---

## Step 3: Get JIRA API Credentials

### Step 3a: Create JIRA API Token

1. **Go to JIRA Cloud**
   - Login to your JIRA instance: `https://your-domain.atlassian.net`

2. **Create API Token**
   - Click your profile icon (top right)
   - Select "Profile"
   - Go to "Security" → "API tokens"
   - Click "Create API token"
   - Give it a name: `JIRA Test Generator`
   - Copy the token (save it safely!)

3. **Note Your Details**
   - **JIRA Base URL:** `https://your-domain.atlassian.net`
   - **JIRA Email:** Your Atlassian email address
   - **JIRA API Token:** The token you just created

### Step 3b: Test JIRA Connectivity

```bash
# Run the JIRA connectivity test
node connectivity-test.js

# Or with Python
python3 connectivity-test.py
```

When prompted, enter:
- Base URL: `https://your-domain.atlassian.net`
- Email: `your-email@company.com`
- API Token: `your-api-token`

Expected output:
```
✅ JIRA Connection Test Passed!
✅ GROQ Connection Test Passed!
```

---

## Step 4: Get GROQ API Key

### Option A: Free Tier (Recommended for Testing)

1. **Go to GROQ Console**
   - Visit: https://console.groq.com/keys

2. **Sign Up / Login**
   - Create free account
   - Free tier includes API usage

3. **Create API Key**
   - Click "Create API Key"
   - Name: `JIRA Test Generator`
   - Copy the key (starts with `gsk_`)

### Option B: Paid Tier
- For production use, upgrade to paid plan
- Same process, just with billing

---

## Step 5: Configure Environment Variables

### Create `.env` file

```bash
# Copy the template
cp .env.template .env

# Edit the .env file
nano .env  # or use your editor
```

### Fill in `.env` with your credentials:

```bash
# JIRA Configuration
REACT_APP_JIRA_BASE_URL=https://your-domain.atlassian.net
REACT_APP_JIRA_EMAIL=your-email@company.com
REACT_APP_JIRA_API_TOKEN=your-api-token-here

# GROQ Configuration
REACT_APP_GROQ_API_KEY=gsk_your-api-key-here

# Environment
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0

# Optional: Analytics
REACT_APP_GA_ID=your-google-analytics-id
```

### ⚠️ Important: Never commit `.env` to Git!

The `.env` file should be in `.gitignore`:
```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
```

---

## Step 6: Start the Development Server

### Start React Development Server

```bash
# Start the app
npm start

# Or with pnpm
pnpm start
```

Expected output:
```
Compiled successfully!

You can now view the app in the browser.

Local:            http://localhost:3000
On Your Network:  http://192.168.x.x:3000

Press q to quit.
```

### App Opens Automatically

The application should automatically open in your default browser at:
```
http://localhost:3000
```

If not, manually navigate to: `http://localhost:3000`

---

## Step 7: Configure Credentials in App

When you first open the app:

### 1. Settings Panel Opens
   - You'll see "Settings" tab is active
   - Two forms: JIRA Configuration and GROQ Configuration

### 2. Enter JIRA Credentials
   - **JIRA Base URL:** Paste your JIRA URL
   - **Email:** Your JIRA email
   - **API Token:** Your JIRA API token
   - Click "Validate JIRA Connection"
   - Wait for ✅ success message

### 3. Enter GROQ Configuration
   - **GROQ API Key:** Your GROQ API key
   - Model is locked: `openai/gpt-oss-120b`
   - Click "Validate GROQ Connection"
   - Wait for ✅ success message

### 4. Save Configuration
   - Click "Save Configuration"
   - Credentials saved to browser localStorage
   - Tab switches to "Generation" panel

---

## Step 8: Use the Application

### Generate Your First Test Plan

#### 1. Go to Generation Tab
   - You should see "Generation" tab (or click it)

#### 2. Enter Issue ID
   - Enter a JIRA issue ID (e.g., `VWO-48` or `PROJ-123`)
   - Click "Fetch Issue"
   - Wait for issue to load (~2 seconds)
   - You'll see issue details: summary, type, priority

#### 3. Generate Test Plan
   - Click "Generate Test Plan"
   - Watch the real-time streaming preview
   - Test plan appears in 10-30 seconds (depends on GROQ response)
   - You'll see 5 sections:
     - Positive Scenarios
     - Negative Scenarios
     - Edge Cases
     - Security Tests
     - Performance Tests

#### 4. Export Test Plan
   - Click "Copy to Clipboard" to copy the formatted test plan
   - Click "Download as Markdown" to save as `.md` file
   - Click "Download as PDF" to save as `.pdf` file

---

## Full Setup Example (Step-by-Step)

```bash
# 1. Navigate to project
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK

# 2. Install dependencies
npm install

# 3. Copy and edit environment file
cp .env.template .env
nano .env
# (Add your JIRA and GROQ credentials)

# 4. Test connectivity
node connectivity-test.js
# (Verify both JIRA and GROQ connections pass)

# 5. Start the app
npm start

# 6. Open browser
# Browser should open automatically at http://localhost:3000
# If not, manually go to http://localhost:3000

# 7. In the app:
#    - Settings panel opens automatically
#    - Enter JIRA credentials and validate
#    - Enter GROQ API key and validate
#    - Click Save Configuration
#    - Switch to Generation tab
#    - Enter JIRA issue ID
#    - Click Fetch Issue
#    - Click Generate Test Plan
#    - Export as desired (clipboard, markdown, or PDF)
```

---

## Troubleshooting

### Problem: "Failed to install dependencies"

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try installing again
npm install

# If still failing, try with different Node version
nvm install 18
nvm use 18
npm install
```

### Problem: "JIRA Connection Failed"

**Check:**
1. Is JIRA Base URL correct? Should be: `https://domain.atlassian.net`
2. Is email address correct? (The one you login with)
3. Is API token valid? (Should start with specific pattern)
4. Does your JIRA account have API access enabled?

**Test connection:**
```bash
node connectivity-test.js
```

### Problem: "GROQ API Key Invalid"

**Check:**
1. Is API key correct? (Should start with `gsk_`)
2. Is API key still valid? (Check GROQ console)
3. Is account active? (Check GROQ billing)

**Solutions:**
- Create a new API key in GROQ console
- Make sure free tier still has available usage
- Upgrade to paid tier if needed

### Problem: "Port 3000 already in use"

**Solution:**
```bash
# Use different port
PORT=3001 npm start

# Or kill the process using port 3000
# On macOS/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Problem: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Clear cache
npm cache clean --force
npm install
```

### Problem: ".env file not being loaded"

**Check:**
1. Is `.env` file in the root directory?
2. Are variable names correct? (Start with `REACT_APP_`)
3. Have you restarted the dev server? (Stop with Ctrl+C, run `npm start` again)

---

## Docker Setup (Optional)

### Run with Docker

```bash
# Build Docker image
docker build -t jira-test-generator .

# Run container
docker run -p 3000:3000 \
  -e REACT_APP_JIRA_BASE_URL=https://your-domain.atlassian.net \
  -e REACT_APP_JIRA_EMAIL=your-email@company.com \
  -e REACT_APP_JIRA_API_TOKEN=your-token \
  -e REACT_APP_GROQ_API_KEY=gsk_your-key \
  jira-test-generator

# Open browser to http://localhost:3000
```

### Run with Docker Compose

```bash
# Start services
docker-compose up

# Access at http://localhost:3000

# Stop services
docker-compose down
```

---

## Production Build

### Build for Production

```bash
# Create optimized production build
npm run build

# This creates a `build/` folder with optimized files
```

### Test Production Build Locally

```bash
# Install serve
npm install -g serve

# Serve the build folder
serve -s build -l 3000

# Open http://localhost:3000
```

---

## Configuration Reference

### Customizable Settings

**In `.env` file:**
- `REACT_APP_ENV` - `development` or `production`
- `REACT_APP_JIRA_BASE_URL` - Your JIRA instance URL
- `REACT_APP_GROQ_API_KEY` - GROQ API key
- `REACT_APP_GA_ID` - Google Analytics ID (optional)

**In App Settings Panel:**
- JIRA Base URL, Email, API Token (can be changed anytime)
- GROQ API Key (can be changed anytime)
- "Clear Configuration" button to reset everything

---

## Common Tasks

### Change JIRA Instance

1. Open app Settings tab
2. Update "JIRA Base URL"
3. Update "Email"
4. Paste new API token
5. Click "Validate JIRA Connection"
6. Click "Save Configuration"

### Change GROQ API Key

1. Open app Settings tab
2. Paste new GROQ API Key
3. Click "Validate GROQ Connection"
4. Click "Save Configuration"

### Switch Between Multiple JIRA Projects

1. In Generation tab, enter different JIRA issue ID
2. Click "Fetch Issue"
3. Click "Generate Test Plan"
4. Export as needed

### Clear Saved Configuration

1. Open Settings tab
2. Click "Clear Configuration"
3. All saved credentials will be deleted
4. You'll need to enter them again

---

## Performance Tips

### For Faster Performance

1. **Use Chrome/Firefox** - Better performance than Safari
2. **Close Other Apps** - More RAM available
3. **Larger GROQ Model** - More accurate but slower
4. **Batch Operations** - Generate multiple test plans together

### Monitor Performance

- Open DevTools (F12)
- Check "Performance" tab
- Look for slow operations
- File issues if generation takes > 1 minute

---

## Security Best Practices

1. **Never share `.env` file** - Contains credentials
2. **Never commit `.env` to Git** - Use `.gitignore`
3. **Rotate API tokens regularly** - Update in both JIRA and app
4. **Use strong passwords** - For JIRA/GROQ accounts
5. **Clear browser data** - If using on shared computer
6. **Use HTTPS** - Always in production

---

## Advanced Usage

### Using the Services Directly

You can import and use the services in your own code:

```javascript
import { JiraClient } from './src/services/jiraClient';
import { GroqClient } from './src/services/groqClient';
import { TestPlanGenerator } from './src/services/testPlanGenerator';

// Initialize clients
const jiraClient = new JiraClient({
  baseUrl: 'https://domain.atlassian.net',
  email: 'user@company.com',
  token: 'api-token'
});

const groqClient = new GroqClient({
  apiKey: 'gsk_...'
});

// Use services
const issue = await jiraClient.getIssue('PROJ-123');
const testPlan = await TestPlanGenerator.generateTestPlan(issue);
```

### Customizing the UI

React components are in `src/components/`:
- Modify styles in `.css` files
- Change component behavior in `.jsx` files
- Add new components as needed
- Follow existing patterns

---

## Getting Help

### Documentation Files

- **README.md** - Project overview and navigation
- **PHASE_4_COMPLETE_COMPONENTS.md** - Component specifications
- **PHASE_5_TRIGGER_DEPLOYMENT.md** - Deployment guide
- **PHASE_3_LAYER3_TOOLS_GUIDE.md** - API service documentation

### Common Issues

1. Check `connectivity-test.js` for connection errors
2. Review browser console (F12) for JavaScript errors
3. Check Network tab to see API calls
4. Read error messages - they're usually helpful!

### Debugging

```bash
# Run with debug logging
DEBUG=* npm start

# Check Node version
node --version

# Check npm version
npm --version

# List installed packages
npm list
```

---

## Next Steps

After opening the app:

1. ✅ **Configure credentials** (Settings tab)
2. ✅ **Test JIRA connection** (Validate button)
3. ✅ **Test GROQ connection** (Validate button)
4. ✅ **Generate test plan** (Generate tab)
5. ✅ **Export results** (Export buttons)
6. ✅ **Review quality** (Check test cases)
7. ✅ **Integrate with workflow** (Use in your QA process)

---

## Quick Reference Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Clean cache and reinstall
npm cache clean --force && rm -rf node_modules && npm install

# Check for vulnerabilities
npm audit

# Update packages
npm update

# Stop the server
Ctrl + C
```

---

## Support

**For issues or questions:**

1. Check this guide first
2. Review documentation files
3. Check browser console (F12 → Console tab)
4. Review connectivity test results
5. Check JIRA/GROQ API documentation

---

**Happy Testing! 🚀**

If the app loads and shows the Settings panel, you're ready to go!

Generated: June 11, 2026  
Framework: B.L.A.S.T. Protocol v1.0
