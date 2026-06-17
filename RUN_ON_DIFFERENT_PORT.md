# 🔧 Running on Different Port - Quick Guide

**Quick Solution for Port 3000 Issues**

---

## ⚡ Quick Commands

### Use Port 3001
```bash
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK
PORT=3001 npm start
```
Then open: **http://localhost:3001**

### Use Port 3002
```bash
PORT=3002 npm start
```
Then open: **http://localhost:3002**

### Use Port 8000
```bash
PORT=8000 npm start
```
Then open: **http://localhost:8000**

### Use Port 8080
```bash
PORT=8080 npm start
```
Then open: **http://localhost:8080**

---

## 📋 Step-by-Step (Different Port)

```bash
# 1. Navigate to project
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK

# 2. Start on different port (choose any unused port)
PORT=3001 npm start

# 3. Wait for compilation message:
#    ✨  Compiled successfully!
#    Local:  http://localhost:3001

# 4. Open browser to:
#    http://localhost:3001

# 5. You should see Settings panel ✅
```

---

## 🔢 Suggested Ports (If 3000 is busy)

| Port | Status | Command |
|------|--------|---------|
| 3000 | Busy? | `PORT=3001 npm start` |
| 3001 | Try this | `PORT=3001 npm start` |
| 3002 | Or this | `PORT=3002 npm start` |
| 8000 | Or this | `PORT=8000 npm start` |
| 8080 | Or this | `PORT=8080 npm start` |
| 9000 | Or this | `PORT=9000 npm start` |

---

## 🖥️ Different Operating Systems

### macOS/Linux
```bash
PORT=3001 npm start
```

### Windows (Command Prompt)
```cmd
set PORT=3001
npm start
```

### Windows (PowerShell)
```powershell
$env:PORT=3001
npm start
```

### Windows (Git Bash)
```bash
PORT=3001 npm start
```

---

## ✅ Expected Output

When successful, you'll see:

```
> jira-test-generator@1.0.0 start
> react-scripts start

Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3001
  On Your Network:  http://192.168.1.100:3001

Press q to quit.
```

---

## 🌐 Then Open Your Browser

Click the link shown, or manually type:
```
http://localhost:3001
```

Replace `3001` with whatever port you chose.

---

## 🔍 Check if Port is in Use

### Before starting, check if your chosen port is free:

**macOS/Linux:**
```bash
lsof -i :3001
# If it shows nothing, port is free
# If it shows a process, port is in use
```

**Windows:**
```cmd
netstat -ano | findstr :3001
```

---

## 💡 Alternative: Kill Process on Port 3000

If you want to use port 3000, kill whatever is using it:

### macOS/Linux:
```bash
lsof -ti:3000 | xargs kill -9
npm start
# Opens on http://localhost:3000
```

### Windows:
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
npm start
```

---

## 🎯 Complete Workflow (Different Port)

```bash
# 1. Go to project
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK

# 2. Install dependencies (if not done)
npm install

# 3. Setup .env (if not done)
cp .env.template .env
nano .env
# Add JIRA and GROQ credentials
# Save (Ctrl+X, Y, Enter)

# 4. Start on different port
PORT=3001 npm start

# 5. Wait for "Compiled successfully!"

# 6. Open http://localhost:3001 in browser

# 7. You should see Settings panel with:
#    - JIRA Configuration form
#    - GROQ Configuration form
```

---

## ✨ What You Should See

### In Terminal:
```
✨  Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3001
  On Your Network:  http://192.168.1.xxx:3001

Press q to quit.
```

### In Browser (http://localhost:3001):
```
┌─────────────────────────────────────────┐
│     JIRA Test Plan Generator            │
│                                         │
│  Settings Tab (active)  | Generation   │
│                                         │
│  JIRA Configuration                    │
│  ┌─────────────────────────────────┐  │
│  │ Base URL: [_________________]   │  │
│  │ Email: [_____________________]  │  │
│  │ API Token: [________________]   │  │
│  │ [Validate JIRA Connection]      │  │
│  └─────────────────────────────────┘  │
│                                         │
│  GROQ Configuration                    │
│  ┌─────────────────────────────────┐  │
│  │ API Key: [___________________]  │  │
│  │ [Validate GROQ Connection]      │  │
│  └─────────────────────────────────┘  │
│                                         │
│  [Save Configuration]                  │
└─────────────────────────────────────────┘
```

---

## 🎉 You're All Set!

Once you see the Settings panel:

1. ✅ Enter JIRA Base URL
2. ✅ Enter JIRA Email
3. ✅ Enter JIRA API Token
4. ✅ Click "Validate JIRA Connection"
5. ✅ Enter GROQ API Key
6. ✅ Click "Validate GROQ Connection"
7. ✅ Click "Save Configuration"
8. ✅ Click "Generation" tab
9. ✅ Enter a JIRA issue ID
10. ✅ Click "Fetch Issue"
11. ✅ Click "Generate Test Plan"

---

## 🆘 Still Having Issues?

1. Try ports in order: 3001, 3002, 8000, 8080
2. Check if npm is running: `ps aux | grep npm`
3. Kill all node processes: `killall node`
4. Try complete reset:
   ```bash
   rm -rf node_modules
   npm cache clean --force
   npm install
   PORT=3001 npm start
   ```

---

**Try this now:**
```bash
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK
PORT=3001 npm start
```

Then open: **http://localhost:3001** ✅

