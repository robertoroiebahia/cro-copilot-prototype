# Quick Test Checklist for rob@app.com

## 1. Check Subscription Loading

**Go to:** `/settings/billing`

**Should see:**
- Current Plan: Free
- Limits shown: 5 analyses/month, 50 insights

**If not showing:** Subscription data not loading

---

## 2. Check Usage Page

**Go to:** `/settings/usage`

**Should see:**
- Current Usage card
- Analyses: 0/5 (with progress bar at 0%)
- Insights: 0/50 (with progress bar at 0%)
- Themes: 0/10
- Hypotheses: 0/5
- Experiments: 0/2

**If completely blank:** Issue with subscription or usage API

**If stuck on loading:** Check browser console for errors

---

## 3. Test Analysis Creation

**Go to:** `/analyze`

**Steps:**
1. Enter URL: `https://www.example.com`
2. Click "Analyze"
3. Wait for completion

**Watch terminal logs for:**
```
🔵 trackResourceCreation called
✅ Successfully tracked analyses creation
```

**After completion:**
- Go to `/settings/usage`
- Should show: Analyses: 1/5

---

## 4. Browser Console Check

**Open console (F12):**
- Go to `/settings/usage`
- Look for errors
- Check Network tab for `/api/usage` request
- Should return: `{ analyses_count: 0, insights_count: 0, ... }`

---

## Current Account Info

**Email:** rob@app.com
**User ID:** 378228a0-54ab-4d63-9dbb-781e33ecd937
**Workspace ID:** 682ad780-98df-4d3f-832b-6cf60bf2b185
**Plan:** Free (5 analyses/month)
**Current Usage:** 0 analyses, 0 insights

---

## If Still Not Working

**Share with me:**
1. Screenshot of `/settings/usage` page
2. Browser console errors
3. Network tab showing `/api/usage` response
4. Terminal logs when you create an analysis
