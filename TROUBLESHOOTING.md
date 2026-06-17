# 🔧 Troubleshooting - Unable to Open localhost:3000

**Last Updated:** June 11, 2026

---

## Problem: Can't Access http://localhost:3000

---

## ✅ Step 1: Check if npm start Completed

### What to look for in terminal:

**Good (Successful):**
```
✨  Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Press q to quit.
```

**Bad (Failed Compilation):**
```
Failed to compile.

ERROR in ...
```

---

## 🔍 Diagnostic Checklist

### Issue 1: npm start command failed to run

**Symptoms:**
- `npm: command not found` error
- `npm ERR!` messages

**Solutions:**

```bash
# 1. Check if npm is installed
npm --version

# If not installed, install Node.js from https://nodejs.org

# 2. If installed, try clearing cache
npm cache clean --force

# 3. Reinstall everything
rm -rf node_modules
npm install

# 4. Try starting again
npm start
```

---

### Issue 2: npm install didn't complete

**Symptoms:**
- `Cannot find module 'react'`
- `Cannot find module '@react-dom'`
- Missing dependencies

**Solutions:**

```bash
# 1. Check if node_modules exists
ls -la | grep node_modules

# 2. If missing or empty, reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Wait for full completion (1-3 minutes)

# 4. Verify installation
npm list react react-dom

# 5. Try starting again
npm start
```

---

### Issue 3: Port 3000 already in use

**Symptoms:**
- `Port 3000 is already in use`
- `EADDRINUSE: address already in use :::3000`

**Solutions:**

**Option A: Kill the process using port 3000**

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell as admin)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Option B: Use a different port**

```bash
PORT=3001 npm start

# Then access at http://localhost:3001
```

**Option C: Stop all node processes**

```bash
killall node
```

---

### Issue 4: .env file issues

**Symptoms:**
- App starts but shows authentication errors
- "Invalid credentials" message

**Solutions:**

```bash
# 1. Check if .env file exists
ls -la | grep .env

# 2. If not, create it
cp .env.template .env

# 3. Edit it
nano .env

# 4. Make sure it has:
# REACT_APP_JIRA_BASE_URL=https://your-domain.atlassian.net
# REACT_APP_JIRA_EMAIL=your-email@company.com
# REACT_APP_JIRA_API_TOKEN=your-token
# REACT_APP_GROQ_API_KEY=gsk_your-key

# 5. Save and restart
npm start
```

---

### Issue 5: Browser can't connect to localhost

**Symptoms:**
- "This site can't be reached"
- "Connection refused"
- "ERR_CONNECTION_REFUSED"

**Solutions:**

```bash
# 1. Check if npm start is still running
# Look for output like:
# Local:  http://localhost:3000

# If not running, start it:
npm start

# 2. Verify the server is listening
# macOS/Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000

# 3. Check firewall
# Make sure localhost/127.0.0.1 is not blocked

# 4. Try different browser
# Chrome, Firefox, Safari, Edge

# 5. Try direct IP instead of localhost
# http://127.0.0.1:3000
```

---

### Issue 6: Compilation errors

**Symptoms:**
- "Failed to compile"
- "SyntaxError" or "Module not found"

**Solutions:**

```bash
# 1. Read the error message carefully
# It usually tells you what's wrong

# 2. Check for .env file issues
# Missing .env can cause errors

cp .env.template .env

# 3. Clear React cache
rm -rf node_modules/.cache

# 4. Restart npm
npm start

# 5. If still failing, try clean install
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## 🛠️ Complete Diagnostic Script

Create a file `diagnose.sh`:

```bash
#!/bin/bash

echo "🔍 JIRA Test Plan Generator - Diagnostic Check"
echo "═════════════════════════════════════════════════"
echo ""

# Check Node.js
echo "1️⃣  Checking Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
    echo "   Install from: https://nodejs.org"
fi

# Check npm
echo ""
echo "2️⃣  Checking npm..."
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm not found"
fi

# Check if in correct directory
echo ""
echo "3️⃣  Checking directory..."
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json not found"
    echo "   Make sure you're in: ~/Documents/AITester/chapter3_BLAST_FRAMEWORK"
fi

# Check node_modules
echo ""
echo "4️⃣  Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
    MODULE_COUNT=$(ls node_modules | wc -l)
    echo "   Contains $MODULE_COUNT packages"
else
    echo "❌ node_modules not found"
    echo "   Run: npm install"
fi

# Check .env file
echo ""
echo "5️⃣  Checking .env file..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
    if grep -q "REACT_APP_JIRA_BASE_URL" .env; then
        echo "   ✅ JIRA_BASE_URL configured"
    else
        echo "   ⚠️  JIRA_BASE_URL not found"
    fi
    if grep -q "REACT_APP_GROQ_API_KEY" .env; then
        echo "   ✅ GROQ_API_KEY configured"
    else
        echo "   ⚠️  GROQ_API_KEY not found"
    fi
else
    echo "❌ .env file not found"
    echo "   Run: cp .env.template .env"
fi

# Check if port 3000 is available
echo ""
echo "6️⃣  Checking port 3000..."
if command -v lsof &> /dev/null; then
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port 3000 is already in use"
        echo "   Kill it: lsof -ti:3000 | xargs kill -9"
        echo "   Or use: PORT=3001 npm start"
    else
        echo "✅ Port 3000 is available"
    fi
else
    echo "ℹ️  Cannot check port status"
fi

echo ""
echo "═════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Fix any ❌ errors shown above"
echo "2. Run: npm install (if dependencies missing)"
echo "3. Run: npm start"
echo "4. Open: http://localhost:3000"
```

Run the diagnostic:

```bash
chmod +x diagnose.sh
./diagnose.sh
```

---

## 📋 Step-by-Step Reset & Retry

If nothing else works, do a complete reset:

```bash
# 1. Stop npm if running (Ctrl+C in terminal)

# 2. Navigate to project
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK

# 3. Clean everything
rm -rf node_modules package-lock.json .eslintcache

# 4. Clear npm cache
npm cache clean --force

# 5. Reinstall from scratch
npm install

# 6. Make sure .env exists
if [ ! -f .env ]; then
    cp .env.template .env
fi

# 7. Start with verbose logging
npm start -- --verbose
```

---

## 🖥️ Windows-Specific Solutions

### If you're on Windows:

```powershell
# 1. Check Node.js
node --version
npm --version

# 2. Check port 3000
netstat -ano | findstr :3000

# 3. Kill process if needed
taskkill /PID <PID> /F

# 4. Use correct command
npm install

# 5. Start
npm start
```

---

## 🐳 Alternative: Use Docker

If the above doesn't work, try Docker:

```bash
# 1. Build image
docker build -t jira-test-generator .

# 2. Run container
docker run -p 3000:3000 \
  -e REACT_APP_JIRA_BASE_URL=https://your-domain.atlassian.net \
  -e REACT_APP_JIRA_EMAIL=your-email@company.com \
  -e REACT_APP_JIRA_API_TOKEN=your-token \
  -e REACT_APP_GROQ_API_KEY=gsk_your-key \
  jira-test-generator

# 3. Open http://localhost:3000
```

---

## 🔗 Manual Setup (Without npm)

If you have Node.js installed, try installing packages manually:

```bash
# Install key packages
npm install react react-dom axios tailwindcss postcss autoprefixer

# Then try starting
npm start
```

---

## 📞 Debug Information to Collect

If you're still stuck, provide this information:

```bash
# 1. Node & npm versions
node --version
npm --version

# 2. Current directory
pwd

# 3. Project files
ls -la

# 4. npm start output
npm start 2>&1 | tee npm-output.log

# 5. Check ports
netstat -ano | grep 3000

# 6. Check .env file
cat .env | grep -v "^#"
```

---

## 🆘 Common Error Messages & Solutions

### Error: "ENOENT: no such file or directory, open '.env'"

**Solution:**
```bash
cp .env.template .env
nano .env  # Add your credentials
npm start
```

---

### Error: "Cannot find module 'react'"

**Solution:**
```bash
npm install react react-dom
npm start
```

---

### Error: "Port 3000 is already in use"

**Solution:**
```bash
# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
PORT=3001 npm start
```

---

### Error: "npm: command not found"

**Solution:**
- Node.js is not installed
- Download from: https://nodejs.org
- Restart terminal after installation

---

### Error: "Failed to compile"

**Solution:**
```bash
# 1. Check .env exists
ls -la .env

# 2. Clear cache
rm -rf node_modules/.cache

# 3. Restart
npm start
```

---

## ✅ Verification Checklist

Before troubleshooting, verify:

- [ ] Node.js v18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] In correct directory (`pwd` shows chapter3_BLAST_FRAMEWORK)
- [ ] .env file exists (`ls -la .env`)
- [ ] .env has credentials (edit and check)
- [ ] Port 3000 is free (`lsof -i:3000` or `netstat -ano | findstr :3000`)
- [ ] node_modules folder exists (`ls -la node_modules`)
- [ ] package.json exists (`ls -la package.json`)

---

## 🚀 If Still Not Working

Try this nuclear option:

```bash
# 1. Delete everything related to Node
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK
rm -rf node_modules package-lock.json .cache

# 2. Clear global npm cache
npm cache clean --force

# 3. Reinstall Node.js from https://nodejs.org

# 4. Create new .env
cp .env.template .env
# (Edit with your credentials)

# 5. Fresh install
npm install

# 6. Start
npm start
```

---

## 📚 Related Files

- `GETTING_STARTED.md` - Setup guide
- `connectivity-test.js` - Test JIRA/GROQ connection
- `.env.template` - Environment template
- `quick-start.sh` - Automated setup

---

## 💡 Pro Tips

1. **Always check npm install completed** - Look for "added XX packages" message
2. **Check .env credentials** - Missing credentials cause silent failures
3. **Restart terminal** - After installing Node.js
4. **Use Chrome/Firefox** - Better debugging tools
5. **Check browser console** - Press F12, look for errors

---

## 📖 Need More Help?

1. Run diagnostic script: `./diagnose.sh`
2. Check browser console: Press F12
3. Read terminal output carefully
4. Try Docker approach if all else fails
5. Check internet connection for API calls

---

**Generated:** June 11, 2026  
**Framework:** B.L.A.S.T. Protocol v1.0
