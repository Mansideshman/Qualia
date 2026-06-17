# ⚡ QUICK START GUIDE

## Status: ✅ Ready to Use (Phase 3 Complete)

---

## 1️⃣ Start the App (30 seconds)

```bash
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK
npm start
```

Browser opens automatically → **http://localhost:3000**

---

## 2️⃣ Configure (60 seconds)

Click **⚙️ Settings** tab

**Pre-filled from .env.local:**
- ✅ JIRA Base URL: https://mdeshman0429.atlassian.net
- ✅ JIRA Email: mdeshman0429@gmail.com
- ✅ JIRA Token: (pre-filled)
- ✅ GROQ API Key: (pre-filled)

**Actions:**
1. Click **🧪 Test Connections** → See results
2. Click **💾 Save Configuration**

---

## 3️⃣ Generate Test Plan (90 seconds)

Click **⚡ Generate Plan** tab

**Pre-filled:**
- Issue Key: KAN-1

**Actions:**
1. Click **🚀 Generate Test Plan**
2. Wait for AI to generate (20-30 seconds)
3. View test plan with 5 scenario types:
   - ✅ Positive Scenarios
   - ❌ Negative Scenarios  
   - 🔧 Edge Cases
   - 🔐 Security Tests
   - ⚙️ Performance Tests

---

## 4️⃣ Export (30 seconds)

Bottom of test plan:

- **📄 Markdown** - Professional documentation format
- **🌐 HTML** - Standalone webpage
- **⚙️ JSON** - Machine-readable format

Click any button → File downloads

---

## 📊 That's It!

You now have an AI-generated, comprehensive test plan from your JIRA issue.

**What was generated:**
- 3-5 test cases per scenario type
- Professional test steps
- Expected results for each test
- Ready to use in QA process

---

## ❓ If Something Goes Wrong

### "Connection refused" at http://localhost:3000
```bash
# Stop npm (Ctrl+C)
# Try different port:
PORT=3001 npm start
# Then open: http://localhost:3001
```

### "Test Connections Failed"
1. Check internet connection
2. Verify .env.local has correct credentials
3. Check JIRA token is active (Atlassian)
4. Check GROQ API key is valid

### "Generate Test Plan Hangs"
1. Wait 30-60 seconds (AI processing)
2. Check browser console (F12) for errors
3. Try with different issue key

---

## 🎯 Common Issue Keys to Try

```
KAN-1      (default pre-filled)
KAN-2      (if exists)
KAN-3      (if exists)
```

Or use any issue from your JIRA project!

---

## 📚 Learn More

- **IMPLEMENTATION_SUMMARY.md** - Full technical guide
- **LLM.md** - Architecture & specifications
- **progress.md** - What was built & how

---

## 🚀 You're All Set!

Everything is ready to use. The app:
- ✅ Connects to JIRA Cloud
- ✅ Uses GROQ AI for test generation
- ✅ Exports to 3 formats
- ✅ Handles errors gracefully

**Start at:** http://localhost:3000

**Questions?** Read IMPLEMENTATION_SUMMARY.md

---

Built with B.L.A.S.T. Framework | June 11, 2026
