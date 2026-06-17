# Phase 2: Quick Start Guide

## ✅ What's Been Created

| File | Purpose |
|------|---------|
| `.env.template` | Credential configuration template |
| `connectivity-test.js` | Node.js connectivity tester |
| `connectivity-test.py` | Python connectivity tester |
| `PHASE_2_LINK.md` | Full documentation |
| `phase-2-quickstart.md` | This guide |

---

## 🎯 Your Next Actions (3 Steps)

### Step 1: Prepare Credentials

**Get JIRA Credentials:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the generated token (you'll need it in 30 seconds!)
4. Note your JIRA email and account URL (e.g., `https://company.atlassian.net`)

**Get GROQ API Key:**
1. Go to https://console.groq.com
2. Navigate to API Keys section
3. Create a new API key
4. Copy it (only shown once!)

### Step 2: Configure Environment

**Create `.env` file:**
```bash
# Copy from template
cp .env.template .env

# Edit with your credentials
nano .env  # or use VS Code
```

**Fill in `.env` with:**
```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=paste_token_here
GROQ_API_KEY=paste_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
TEST_ISSUE_ID=VWO-48
```

### Step 3: Run Connectivity Tests

**Choose one method:**

**Option A: Using Node.js**
```bash
# Install dependency (first time only)
npm install dotenv

# Run test
node connectivity-test.js
```

**Option B: Using Python**
```bash
# Install dependency (first time only)
pip install python-dotenv

# Run test
python3 connectivity-test.py
```

---

## ✅ Expected Output (Success)

```
🔗 PHASE 2: LINK - Connectivity & Authentication Verification

============================================================
 Phase 2: Credential Validation
============================================================

 ✅ All required credentials are configured

============================================================
 Phase 2.1: JIRA API Connectivity Test
============================================================

 ℹ️  Testing JIRA endpoint: https://your-domain.atlassian.net/rest/api/3/issue/VWO-48
 ✅ JIRA connectivity verified ✓
 ℹ️  Issue Key: VWO-48
 ℹ️  Summary: [Your issue summary]

============================================================
 Phase 2.2: GROQ API Connectivity Test
============================================================

 ✅ GROQ connectivity verified ✓
 ℹ️  Response: GROQ API connectivity verified

============================================================
 Phase 2: Test Results Summary
============================================================

 ✅ ✓ All connectivity tests passed!

 📊 Summary:
   ✅ JIRA API: Connected
   ✅ GROQ API: Connected
   ✅ Authentication: Verified

 Ready for Phase 3: Architect
```

---

## ❌ Troubleshooting

**If you get a JIRA error (401/403/404):**
- Check email and token are correct
- Ensure token hasn't expired
- Verify you have access to VWO-48
- Try: Regenerate the API token

**If you get a GROQ error (401/429):**
- Check API key is correct
- May have hit rate limit (free tier)
- Try: Regenerate API key from console.groq.com

**If you get "Missing Configuration":**
- Verify `.env` file exists in this directory
- Check all variables are filled in
- Ensure no typos in variable names

---

## 📋 Files Reference

- **PHASE_2_LINK.md** - Complete documentation with all details
- **connectivity-test.js** - Source code (Node.js)
- **connectivity-test.py** - Source code (Python)
- **.env.template** - Copy this to .env and fill it in

---

## 🚀 After Phase 2 Succeeds

Once all tests pass:

1. ✅ Phase 2 is COMPLETE
2. → Proceed to **Phase 3: Architect**
   - Design React component structure
   - Plan API integration layers
   - Create data flow diagrams

---

## ⚠️ Security Reminders

- 🔒 Never commit `.env` file
- 🔒 Don't share your API tokens
- 🔒 Regenerate tokens if accidentally exposed
- 🔒 Use environment variables, never hardcode credentials

---

## ❓ Questions?

Refer to `PHASE_2_LINK.md` for:
- Detailed troubleshooting
- API documentation links
- Security best practices
- Complete test descriptions
