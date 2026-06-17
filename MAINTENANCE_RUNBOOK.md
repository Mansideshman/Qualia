# 📖 Maintenance Runbook

**Document:** JIRA Test Plan Generator - Production Maintenance  
**Created:** June 11, 2026  
**Last Updated:** June 11, 2026  
**Version:** 1.0  

---

## 📋 Quick Reference

### Critical Commands
```bash
# Start local development
cd ~/Documents/AITester/chapter3_BLAST_FRAMEWORK
npm start

# Build for production
npm run build

# Update dependencies
npm update
npm audit
npm audit fix

# Check logs (if deployed)
vercel logs  # For Vercel
netlify deploy:log  # For Netlify
```

### Key Contacts
- **Project Owner:** [TBD]
- **Technical Lead:** [TBD]
- **On-Call Support:** [TBD]

### Critical Alerting Thresholds
- Error Rate: > 5% in 15 minutes
- API Response Time: > 5 seconds
- JIRA Connection Failures: > 3 in 1 hour
- GROQ API Failures: > 3 in 1 hour

---

## 🔍 Daily Maintenance

### Morning Checklist (5 minutes)
```bash
# 1. Check application status
curl https://your-deployment-url/
# Should return HTTP 200

# 2. Verify API connectivity
# Check Vercel/Netlify dashboard for errors
# Check error tracking (Sentry, etc.)

# 3. Review overnight logs
# Look for any critical errors
```

### Evening Checklist (5 minutes)
```bash
# 1. Check error rate
# Should be < 1% for the day

# 2. Verify no pending issues
# Check issue tracker

# 3. Backup important data (if applicable)
```

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "Connection Refused" Error

**Symptoms:**
- Users see "Connection refused" when opening app
- Browser shows "ERR_CONNECTION_REFUSED"

**Root Causes:**
1. App not running
2. Port blocked
3. Server crashed
4. Deployment failed

**Resolution:**
```bash
# Step 1: Check if app is running
lsof -i :3000  # For local
# OR check hosting dashboard

# Step 2: Check for errors
npm start  # Try local
# OR check deployment logs

# Step 3: Restart
# Local: npm start
# Vercel: Redeploy
# Netlify: Redeploy

# Step 4: If still failing
# Clear cache: npm cache clean --force
# Reinstall: npm install
# Rebuild: npm run build
```

---

### Issue 2: "Test Connections Failed" (JIRA)

**Symptoms:**
- Settings tab shows JIRA connection failed
- Error: "401 Unauthorized" or "400 Bad Request"

**Root Causes:**
1. Invalid JIRA credentials
2. JIRA token expired
3. JIRA API outage
4. Network blocked

**Resolution:**
```bash
# Step 1: Verify credentials in .env.local
cat ~/.env.local | grep REACT_APP_JIRA

# Step 2: Test JIRA connection manually
curl -u email:token https://your-jira-url/rest/api/3/myself

# Step 3: Check JIRA status
# Visit https://status.atlassian.com/

# Step 4: Regenerate token (if expired)
# Go to: https://id.atlassian.com/manage-profile/security/api-tokens
# Create new token
# Update in app Settings

# Step 5: Update environment variable
# Edit .env.local or hosting platform env vars
# Redeploy if needed
```

---

### Issue 3: "Test Connections Failed" (GROQ)

**Symptoms:**
- Settings tab shows GROQ connection failed
- Error: "401 Unauthorized" or "429 Rate Limited"

**Root Causes:**
1. Invalid GROQ API key
2. API quota exceeded
3. GROQ API outage
4. Network blocked

**Resolution:**
```bash
# Step 1: Verify API key
cat ~/.env.local | grep REACT_APP_GROQ

# Step 2: Test GROQ connection
curl -H "Authorization: Bearer your-key" \
  https://api.groq.com/openai/v1/models

# Step 3: Check GROQ status
# Visit https://status.groq.com/

# Step 4: Check API quota
# Log into https://console.groq.com/
# View API usage and limits

# Step 5: If quota exceeded, wait or upgrade plan

# Step 6: Update API key (if revoked)
# Generate new key at https://console.groq.com/
# Update in app Settings
```

---

### Issue 4: "Generate Test Plan Hangs"

**Symptoms:**
- Generate button shows "Generating..." indefinitely
- No response after 60+ seconds

**Root Causes:**
1. GROQ API slow/timeout
2. JIRA API slow
3. Network connectivity issue
4. Browser issue

**Resolution:**
```bash
# Step 1: Check browser console (F12)
# Look for error messages
# Note any error details

# Step 2: Check API status
# JIRA: https://status.atlassian.com/
# GROQ: https://status.groq.com/

# Step 3: Test different issue key
# May be specific to one issue

# Step 4: Try refreshing browser
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# Step 5: Try from different network
# To isolate if it's a network issue

# Step 6: Check app logs (if deployed)
# Vercel: vercel logs
# Netlify: netlify deploy:log

# Step 7: If GROQ too slow, consider fallback
# Fallback generates in < 2 seconds
# Fallback activates if GROQ fails
```

---

### Issue 5: "Export Not Downloading"

**Symptoms:**
- Click export button, nothing happens
- File doesn't appear in Downloads

**Root Causes:**
1. Browser blocked downloads
2. File name conflict
3. JavaScript error
4. Browser cache issue

**Resolution:**
```bash
# Step 1: Check browser console (F12)
# Look for JavaScript errors

# Step 2: Check Downloads folder
# File might be there with different name

# Step 3: Check browser download settings
# Ensure downloads are allowed
# Check if folder is full

# Step 4: Try different browser
# To isolate browser-specific issue

# Step 5: Hard refresh browser
# Ctrl+Shift+R or Cmd+Shift+R

# Step 6: Check file format
# Try different export format (Markdown, HTML, JSON)
```

---

### Issue 6: "Dark Mode Not Working"

**Symptoms:**
- Dark mode toggle doesn't change theme
- Colors remain light

**Root Causes:**
1. CSS not loaded
2. localStorage issue
3. Browser cache
4. CSS classes not applied

**Resolution:**
```bash
# Step 1: Check browser console (F12)
# Look for CSS errors

# Step 2: Hard refresh
# Ctrl+Shift+R or Cmd+Shift+R

# Step 3: Clear localStorage
# Open console: localStorage.clear()

# Step 4: Check CSS files loaded
# In Network tab, verify CSS loaded

# Step 5: Check element inspection
# Right-click → Inspect
# Check if [data-theme="dark"] applied
```

---

## 📊 Performance Monitoring

### Key Metrics to Track
```
1. Page Load Time (LCP)
   - Target: < 2.5 seconds
   - Alert if: > 5 seconds

2. API Response Time
   - Target: < 1 second
   - Alert if: > 3 seconds

3. Error Rate
   - Target: < 1%
   - Alert if: > 5%

4. API Usage
   - GROQ: Monitor quota
   - JIRA: Monitor rate limit
```

### Monitoring Tools
- **Vercel Analytics:** https://vercel.com/analytics
- **Netlify Analytics:** https://www.netlify.com/analytics/
- **Google Analytics:** https://analytics.google.com/
- **Sentry (Error Tracking):** https://sentry.io/

---

## 🔄 Weekly Maintenance

### Monday Morning Checklist
```bash
# 1. Review past week logs
# Check for patterns in errors

# 2. Check dependency updates
npm outdated

# 3. Security audit
npm audit

# 4. Performance review
# Check metrics dashboard

# 5. User feedback review
# Check issue tracker
```

### Wednesday Mid-Week Check
```bash
# 1. Verify backups
# If running self-hosted

# 2. Check API quotas
# GROQ and JIRA

# 3. Verify monitoring alerts
# All alerts configured?
```

### Friday Pre-Weekend
```bash
# 1. Deploy any fixes
# If in staging

# 2. Final health check
# All systems operational?

# 3. Prepare handoff notes
# For on-call person
```

---

## 📦 Dependency Management

### Update Dependencies
```bash
# Check for outdated packages
npm outdated

# Update all to latest compatible
npm update

# Update to latest (breaking changes)
npm upgrade

# Check security vulnerabilities
npm audit

# Auto-fix vulnerabilities
npm audit fix
```

### Test After Updates
```bash
# Run local development
npm start

# Test all features:
# 1. Settings → Test Connections
# 2. Generate Plan
# 3. All export formats
# 4. Dark mode
# 5. Responsive design
```

---

## 🔐 Security Maintenance

### Monthly Security Review
```bash
# 1. Run security audit
npm audit

# 2. Review environment variables
# Ensure secrets not in code
cat .env.local | grep -i secret

# 3. Rotate API tokens (if policy requires)
# JIRA token: Regenerate annually
# GROQ API key: Regenerate semi-annually

# 4. Check for hardcoded secrets
grep -r "password\|secret\|token" src/ --include="*.js"

# 5. Update security headers
# In hosting platform: Set security headers
```

### Quarterly Security Audit
```bash
# 1. Full dependency audit
npm audit

# 2. Code review for vulnerabilities
# Check for unsafe patterns

# 3. Check for exposed secrets
# Using: https://github.com/gitleaks/gitleaks

# 4. Review access controls
# Who can deploy?
# Who can access logs?

# 5. Backup verification
# Ensure backups working
```

---

## 📋 Operational Tasks

### Backup Procedure
```bash
# If self-hosted:

# 1. Backup application code
tar -czf jira-test-plan-backup-$(date +%Y%m%d).tar.gz \
  ~/Documents/AITester/chapter3_BLAST_FRAMEWORK/

# 2. Backup configuration
cp .env.local .env.local.backup

# 3. Store off-site
# Copy to cloud storage or external drive

# 4. Verify backup
tar -tzf jira-test-plan-backup-*.tar.gz | head -10
```

### Restore Procedure
```bash
# If needed to restore:

# 1. Stop current application
npm stop

# 2. Extract backup
tar -xzf jira-test-plan-backup-YYYYMMDD.tar.gz

# 3. Restore configuration
cp .env.local.backup .env.local

# 4. Reinstall dependencies
npm install

# 5. Restart
npm start

# 6. Verify functionality
# Test all features
```

---

## 📈 Scaling Considerations

### When to Scale
- Error rate increases
- Response time degrades
- API quota exhausted
- User complaints increase

### Scaling Options
```
1. Upgrade hosting tier
   - Vercel: Increase compute
   - Netlify: Higher tier plan
   - AWS: Increase capacity

2. Upgrade API quotas
   - GROQ: Upgrade plan
   - JIRA: Already enterprise

3. Add caching
   - Browser cache (already implemented)
   - Server-side caching (if needed)

4. Optimize code
   - Minify assets (done in build)
   - Lazy load components
   - Code splitting
```

---

## 🎯 Regular Review Schedule

### Daily
- [ ] Check error logs
- [ ] Verify app responsive
- [ ] Monitor API usage

### Weekly
- [ ] Review metrics
- [ ] Check dependencies
- [ ] Security audit

### Monthly
- [ ] Full performance review
- [ ] Update documentation
- [ ] Plan improvements

### Quarterly
- [ ] Security audit
- [ ] Dependency major update check
- [ ] Architecture review

### Annually
- [ ] Full system review
- [ ] Update runbook
- [ ] Plan next year improvements

---

## 📞 Escalation Procedures

### Level 1: Automated Alerts
- Monitor system
- Alert on thresholds
- Automatic logs

### Level 2: On-Call Engineer
- Receive alert
- Investigate issue
- Apply fix
- Update team

### Level 3: Engineering Team
- Complex issues
- Multiple services down
- Security incidents

### Level 4: Management
- Extended downtime
- Data loss
- Security breach

---

## 📝 Change Log

### Version 1.0 (June 11, 2026)
- Initial production release
- Baseline metrics established
- Monitoring configured

### Version 1.1 (Future)
- Performance optimizations
- Additional features
- Enhanced monitoring

---

## 🔗 Useful Resources

- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **React Docs:** https://react.dev
- **JIRA API:** https://developer.atlassian.com/
- **GROQ Docs:** https://console.groq.com/docs
- **Node.js Docs:** https://nodejs.org/docs/

---

## 📞 Support Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Project Lead | [TBD] | [TBD] | [TBD] |
| Tech Lead | [TBD] | [TBD] | [TBD] |
| DevOps | [TBD] | [TBD] | [TBD] |
| QA Lead | [TBD] | [TBD] | [TBD] |

---

Built with B.L.A.S.T. Framework | June 11, 2026
