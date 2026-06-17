# 🔴 Connection Refused Error - Complete Fix Guide

**Error:** "Connection refused" or "ERR_CONNECTION_REFUSED"  
**Cause:** The app is not running on localhost:3000  
**Solution:** This guide will fix it

---

## ⚡ Quick Diagnostic

The "connection refused" error means **npm start is not running** or **failed to compile**.

### Step 1: Check if npm start is actually running

Look at your **terminal window** where you ran `npm start`:

**✅ GOOD - You should see:**
```
✨  Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Press q to quit.
```

**❌ BAD - You see errors like:**
```
Failed to compile

ERROR in ...
```

Or the terminal is empty/waiting.

---

## 🔧 Step-by-Step Fix

### Issue 1: npm install didn't complete

**Symptom:** You see "Cannot find module 'react'" or similar error

**Fix:**

```bash
# 1. Stop npm if running (Ctrl+C in terminal)

# 2. Go to project
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK

# 3. Delete node_modules
rm -rf node_modules package-lock.json

# 4. Clear cache
npm cache clean --force

# 5. Reinstall everything (wait 2-3 minutes)
npm install

# 6. Start the app
npm start
```

Expected output: `✨  Compiled successfully!`

---

### Issue 2: .env file is missing or wrong

**Symptom:** App crashes during startup or won't compile

**Fix:**

```bash
# 1. Check if .env exists
ls -la .env

# 2. If not found, create it
cp .env.template .env

# 3. Edit it with your credentials
nano .env

# Add these (with YOUR values):
# REACT_APP_JIRA_BASE_URL=https://your-domain.atlassian.net
# REACT_APP_JIRA_EMAIL=your-email@company.com
# REACT_APP_JIRA_API_TOKEN=your-token
# REACT_APP_GROQ_API_KEY=gsk_your-key

# 4. Save (Ctrl+X, Y, Enter)

# 5. Restart npm
npm start
```

---

### Issue 3: Port 3000 is already in use but app won't start on other port

**Fix:**

```bash
# 1. Kill anything using port 3000
lsof -ti:3000 | xargs kill -9

# 2. Try starting on different port
PORT=3001 npm start

# 3. Open http://localhost:3001
```

---

### Issue 4: App starts but immediately crashes

**Symptoms:**
- You see "Compiled successfully"
- But terminal shows error after
- Browser gets "connection refused"

**Fix:**

```bash
# 1. Stop npm (Ctrl+C)

# 2. Complete reset
rm -rf node_modules package-lock.json .cache

# 3. Clear everything
npm cache clean --force

# 4. Fresh install
npm install

# 5. Make sure .env exists
cp .env.template .env
# Edit with credentials

# 6. Start with verbose logging
npm start -- --verbose
```

Read the error message carefully - it tells you what's wrong.

---

## 🔍 Detailed Diagnostic - Run This

Create a file `diagnose-connection.sh`:

```bash
#!/bin/bash

echo "🔍 Diagnosing Connection Refused Error..."
echo ""

# Check 1: Is npm process running?
echo "1. Checking if npm is running..."
if pgrep -f "npm start" > /dev/null; then
    echo "   ✅ npm process is running"
else
    echo "   ❌ npm process is NOT running"
    echo "   → Run: npm start"
fi

# Check 2: Is port 3000 listening?
echo ""
echo "2. Checking if port 3000 is listening..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   ✅ Something IS listening on port 3000"
else
    echo "   ❌ Nothing is listening on port 3000"
    echo "   → npm start might not have completed"
fi

# Check 3: Can we connect?
echo ""
echo "3. Testing connection to localhost:3000..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Connection successful!"
else
    echo "   ❌ Connection failed (refused or no response)"
    echo "   → This is the error you're seeing"
fi

# Check 4: Look at npm output
echo ""
echo "4. Check your terminal where you ran 'npm start'"
echo "   Look for: '✨  Compiled successfully!'"
echo "   Or errors like: 'ERROR in ...'"

echo ""
echo "═════════════════════════════════════════════"
echo "Next steps:"
echo "1. Look at the terminal output from 'npm start'"
echo "2. If you see 'Failed to compile': run 'npm install' again"
echo "3. If terminal is empty: npm might have crashed"
echo "4. If you see 'Compiled': but still connection refused:"
echo "   Try: PORT=3001 npm start"
```

Run it:
```bash
chmod +x diagnose-connection.sh
./diagnose-connection.sh
```

---

## 🛠️ Complete Reset & Retry

**Nuclear option** - this almost always works:

```bash
# 1. Stop npm if running (Ctrl+C in terminal)

# 2. Navigate to project
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK

# 3. Delete everything related to node
rm -rf node_modules
rm -rf package-lock.json
rm -rf .cache
rm -rf .eslintcache

# 4. Clear npm cache completely
npm cache clean --force
npm cache verify

# 5. Reinstall everything from scratch (WAIT 3-5 minutes)
npm install

# 6. Verify .env exists
if [ ! -f .env ]; then
    cp .env.template .env
    echo "⚠️  Created .env - EDIT IT with your credentials!"
    echo "Run: nano .env"
fi

# 7. Try starting
npm start

# 8. If that works, open in browser:
# http://localhost:3000

# 9. If connection refused, try different port:
# PORT=3001 npm start
# Then: http://localhost:3001
```

---

## 📋 What to Check in Your Terminal

Look at the terminal where you typed `npm start`:

**Check for these signs:**

✅ **Good Signs:**
```
> jira-test-generator@1.0.0 start
> react-scripts start

Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.1.100:3000

Press q to quit.
```

❌ **Bad Signs:**
```
Failed to compile

ERROR in ./src/...
```

Or:
```
ENOENT: no such file or directory
```

Or:
```
Cannot find module 'react'
```

---

## 🖥️ Windows-Specific Solutions

### Command Prompt:

```cmd
# 1. Navigate
cd C:\Users\YourName\Documents\AITester\chapter3_BLAST_FRAMEWORK

# 2. Clean
rmdir /s /q node_modules
del package-lock.json

# 3. Clear cache
npm cache clean --force

# 4. Reinstall
npm install

# 5. Start
npm start

# 6. If connection refused, try:
set PORT=3001
npm start
```

### PowerShell:

```powershell
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK

rm -Recurse -Force node_modules
rm package-lock.json

npm cache clean --force
npm install

npm start

# Or with different port:
$env:PORT=3001
npm start
```

---

## 🎯 Step-by-Step (What to Do Right Now)

### Step 1: Look at your terminal

Where you ran `npm start`, what does it say?

**Option A: Shows "Compiled successfully!"**
→ Go to Step 2

**Option B: Shows errors**
→ Run the reset commands above

**Option C: Terminal is quiet/frozen**
→ Press Ctrl+C to stop
→ Run the reset commands

### Step 2: Open browser

Try: `http://localhost:3000`

**If it works:** Great! 🎉

**If connection refused:** 
→ Go to Step 3

### Step 3: Try different port

Stop npm (Ctrl+C), then:

```bash
PORT=3001 npm start
```

Open: `http://localhost:3001`

**If it works:** Great! 🎉

**If still connection refused:**
→ Go to Step 4

### Step 4: Check npm is actually running

```bash
ps aux | grep npm
```

If you don't see output with "npm start", npm is not running.

Solution:
```bash
npm install
npm start
```

### Step 5: Check .env file

```bash
ls -la .env
cat .env
```

If file doesn't exist:
```bash
cp .env.template .env
nano .env  # Add credentials
npm start
```

---

## ✅ Expected Workflow That Works

```bash
# 1. Navigate
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK

# 2. Install (first time only)
npm install
# Wait for: "added XXX packages"

# 3. Setup credentials
cp .env.template .env
nano .env
# Add JIRA and GROQ credentials
# Save (Ctrl+X, Y, Enter)

# 4. Start
npm start
# Wait for: "✨  Compiled successfully!"

# 5. Open browser
http://localhost:3000
# You should see Settings panel

# 6. If connection refused, try different port:
# (Stop npm with Ctrl+C first)
PORT=3001 npm start
http://localhost:3001
```

---

## 🆘 Provide This Info If Still Stuck

Copy everything from your terminal and provide:

1. **Full output of:** `npm start`
2. **Output of:** `npm --version`
3. **Output of:** `node --version`
4. **Output of:** `pwd`
5. **Does .env exist?** `ls -la .env`
6. **Any error messages** - copy all of them

---

## 🔑 Key Things to Remember

1. **"Connection refused" = npm is not running**
   - Check terminal for errors
   - Run `npm start` again

2. **"Cannot find module" = dependencies not installed**
   - Run `npm install`

3. **.env file is critical**
   - Must exist
   - Must have credentials

4. **"Failed to compile" = code error**
   - Read the error message
   - It tells you what's wrong

5. **Different port helps diagnose**
   - `PORT=3001 npm start`
   - If that works, port 3000 might be blocked

---

## 📚 Related Guides

- TROUBLESHOOTING.md - All error solutions
- GETTING_STARTED.md - Complete setup
- RUN_ON_DIFFERENT_PORT.md - Port alternatives

All in: `~/Documents/AITester/chapter3_BLAST_FRAMEWORK/`

---

**Generated:** June 11, 2026  
**Framework:** B.L.A.S.T. Protocol v1.0
