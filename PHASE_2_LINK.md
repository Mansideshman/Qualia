# Phase 2: Link - Connectivity & Authentication Verification

## Overview
Phase 2 verifies that both JIRA and GROQ APIs are accessible and properly authenticated before proceeding to the architecture phase.

## Objectives
- ✅ Verify JIRA API connectivity
- ✅ Verify GROQ API connectivity  
- ✅ Test authentication credentials
- ✅ Fetch sample JIRA issue data
- ✅ Confirm GROQ model availability

---

## Prerequisites

### Required Credentials
1. **JIRA Cloud Credentials:**
   - JIRA Base URL (e.g., `https://your-domain.atlassian.net`)
   - Email address associated with JIRA account
   - JIRA API Token (generate from https://id.atlassian.com/manage-profile/security/api-tokens)

2. **GROQ API Credentials:**
   - GROQ API Key (get from https://console.groq.com)
   - Model: `openai/gpt-oss-120b` (free tier available)

### Environment Setup
1. Copy `.env.template` to `.env`
2. Fill in all required credentials
3. Ensure `.env` is NOT committed to version control

---

## Implementation

### Option 1: Node.js (Recommended if npm available)
```bash
# Install dependencies
npm install dotenv

# Run connectivity test
node connectivity-test.js
```

**Output Example:**
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
 ℹ️  Issue ID: VWO-48
 ✅ JIRA connectivity verified ✓
 ℹ️  Issue Key: VWO-48
 ℹ️  Summary: [Issue Summary]
 ℹ️  Description Preview: [Issue Description]...

============================================================
 Phase 2.2: GROQ API Connectivity Test
============================================================

 ℹ️  Testing GROQ endpoint: https://api.groq.com/openai/v1/chat/completions
 ℹ️  Model: openai/gpt-oss-120b
 ✅ GROQ connectivity verified ✓
 ℹ️  Response: GROQ API connectivity verified
 ℹ️  Tokens used: 15

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

### Option 2: Python
```bash
# Install dependencies (if not already installed)
pip install python-dotenv

# Run connectivity test
python3 connectivity-test.py
```

---

## Test Details

### JIRA API Test
**Endpoint:** `GET /rest/api/3/issue/{issueId}`  
**Authentication:** Basic Auth (email:token)  
**Validates:**
- Server reachability
- Authentication credentials
- Issue availability
- Issue data structure (key, summary, description, type, priority)

### GROQ API Test
**Endpoint:** `POST /openai/v1/chat/completions`  
**Authentication:** Bearer token
**Validates:**
- Server reachability
- API key validity
- Model availability
- Response format
- Token usage tracking

---

## Troubleshooting

### JIRA Connection Issues
**Problem:** `JIRA API returned status 401`
- Solution: Verify email and API token are correct
- Check: Token hasn't expired (regenerate if needed)

**Problem:** `JIRA API returned status 404`
- Solution: Issue ID (VWO-48) doesn't exist or is private
- Check: You have permission to view the issue

**Problem:** `JIRA API returned status 403`
- Solution: Insufficient permissions
- Check: User has access to the project and issue

### GROQ Connection Issues
**Problem:** `GROQ API returned status 401`
- Solution: API key is invalid or expired
- Check: Key from https://console.groq.com is correct
- Try: Regenerate API key

**Problem:** `GROQ API returned status 429`
- Solution: Rate limit exceeded (free tier has limits)
- Check: API usage at https://console.groq.com
- Try: Wait and retry later

### General Issues
**Problem:** Missing environment variables
- Solution: Create `.env` file from `.env.template`
- Verify: All fields are filled with actual credentials

**Problem:** Network timeout
- Solution: Check internet connection
- Try: Run from different network if corporate proxy present

---

## Success Criteria (Phase 2 Complete)

✅ All required environment variables configured  
✅ JIRA API responds with status 200  
✅ JIRA issue data successfully retrieved  
✅ GROQ API responds with status 200  
✅ GROQ model generates valid response  
✅ Both tests pass without errors  

---

## Next Steps (Phase 3: Architect)

Once Phase 2 is complete:

1. **Layer 1: Architecture SOPs**
   - Define data flow between React → JIRA → GROQ
   - Create component structure
   - Plan state management

2. **Layer 2: Navigation Logic**
   - React component hierarchy
   - User flow (settings → fetch → generate → export)
   - Error handling paths

3. **Layer 3: Tools & Implementation**
   - JIRA client wrapper (Node.js/JavaScript)
   - GROQ client wrapper
   - Test plan generation logic

---

## Files Generated

- `.env.template` - Credential template (edit and rename to `.env`)
- `connectivity-test.js` - Node.js connectivity tester
- `connectivity-test.py` - Python connectivity tester
- `PHASE_2_LINK.md` - This documentation

---

## Security Notes

⚠️ **DO NOT commit `.env` file to version control**  
⚠️ **DO NOT share API credentials**  
⚠️ **Rotate JIRA API tokens periodically**  
⚠️ **Never hardcode secrets in source code**  

---

## Reference

- [JIRA API Documentation](https://developer.atlassian.com/cloud/jira/rest/v3)
- [GROQ API Documentation](https://console.groq.com/docs)
- [JIRA API Token Guide](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
- [GROQ Console](https://console.groq.com)
