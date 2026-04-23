# BetterStack Logging Setup

## Configuration
- **BetterStack Token**: `wBYGCzXtf9Q1hJ8V6KYzoWVe`
- **BetterStack Endpoint**: `https://in.logs.betterstack.com/v1/logs`
- **Source**: HTTP Source (JSON)

## What's Being Logged

### AppScript Logs (Server-Side)
All form submissions are logged with full execution traces:
- Request validation
- JSON parsing
- Source detection
- Sheet retrieval
- Row insertion
- CV file uploads (if applicable)
- Errors and warnings

**Log Levels Used:**
- `info` - Successful operations (✅)
- `warning` - Ambiguous decisions (⚠️)
- `error` - Failures (❌)

### Vercel API Logs (Middleware)
The API endpoint logs:
- Request receipt (payload size, keys)
- Request forwarding to AppScript
- Response status codes
- Response parsing
- Error handling

**Request Flow in Logs:**
```
Browser → Vercel /api/submit → AppScript → Google Sheets
↓         ↓                    ↓           ↓
Sends      Logs request        Logs        Logs sheet
form       to BetterStack      execution   update
```

## How to View Logs

### In BetterStack Dashboard
1. Go to https://betterstack.com/
2. Log in to your account
3. Navigate to **Logs** section
4. You'll see all logs from both:
   - `vercel-api` (Vercel function logs)
   - AppScript logs (step-by-step execution)

### Log Entry Example
```json
{
  "level": "info",
  "dt": "2026-04-23T10:30:45.123Z",
  "step": "handleCandidateSubmission",
  "message": "Step 4: Building row data",
  "data": {
    "rowColumns": 11,
    "sample": ["2026-04-23T10:30:45.123Z", "Apply Button", "https://example.com"]
  },
  "source": "appscript"
}
```

## Debugging Guide

### To trace a form submission:
1. Submit form from website
2. Open BetterStack Dashboard
3. Filter by timestamp (last few seconds)
4. Look for:
   - `vercel-api` - Vercel received it ✅
   - `doPost` - AppScript processing started ✅
   - `handleCompanySubmission` or `handleCandidateSubmission` - Form type routed ✅
   - `sheet.appendRow` - Data inserted ✅
   - `uploadCVToGoogleDrive` - CV uploaded (if applicable) ✅

### Common Issues to Check

**If Vercel logs don't appear:**
- Check Vercel deployment status
- Verify token is correct
- Check network requests in browser DevTools

**If AppScript logs don't appear:**
- Confirm AppScript is deployed
- Check if form is reaching Vercel
- Verify BetterStack token in AppScript

**If logs stop appearing:**
- Check if Vercel function is still deployed
- Check AppScript execution limits
- Verify BetterStack HTTP source is still active

## Log Query Examples

### Find all errors
```
level:error
```

### Find specific form type
```
source:Company
```

### Find CV uploads
```
step:uploadCVToGoogleDrive
```

### Find slow operations
```
duration:>5000
```

## Code Location References

- **AppScript Logging**: [AppscriptCode.gs](./Appscript%20Code/AppscriptCode.gs) - Lines 1-45
- **Vercel API Logging**: [api/submit.js](./api/submit.js) - Lines 1-50

## Monitoring Alerts (Optional)

You can set up alerts in BetterStack to notify you of:
- Any errors (level = error)
- High error rate
- CSV upload failures
- Sheet insertion delays

## Notes

- All logs include ISO timestamps for easy debugging
- Emoji prefixes (✅, ❌, ⚠️) make logs easy to scan
- All sensitive data (emails, names) is logged for debugging - ensure appropriate access controls
- Logs expire based on your BetterStack plan (typically 7-30 days)
