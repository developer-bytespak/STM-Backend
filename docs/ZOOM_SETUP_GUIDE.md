# Zoom Integration Setup Guide

## ✅ Changes Made

### Database Schema
- ✅ Updated `prisma/schema.prisma` - Already includes Zoom fields:
  - `zoom_meeting_id` (unique) - Critical for reschedule/delete
  - `zoom_join_url` - Provider join link
  - `zoom_start_url` - LSM start link
  - (other metadata fields)

### Code Changes
1. **Removed**: Google Calendar service dependency
2. **Added**: Two new Zoom services:
   - `src/modules/lsm/meetings/services/zoom.token.service.ts` - Manages OAuth token
   - `src/modules/lsm/meetings/services/zoom-client.service.ts` - Zoom API wrapper

3. **Updated**:
   - `meetings.service.ts` - Replaced Google logic with Zoom API calls
   - `meetings.module.ts` - Now imports Zoom services instead of Google
   - `meeting-response.dto.ts` - Uses Zoom fields instead of Google fields

### DTO Updates
`meeting-response.dto.ts` now returns:
```typescript
zoom_meeting_id        // Zoom Meeting ID
zoom_join_url          // Provider join link
zoom_start_url         // LSM start link
zoom_meeting_password  // Optional password
```

## 🔧 Setup Steps (3 steps only)

### Step 1: Get Zoom Server-to-Server Credentials
1. Visit: https://marketplace.zoom.us/develop/create
2. Create "Server-to-Server" OAuth app
3. Copy these values:
   - Client ID
   - Client Secret
   - Account ID

### Step 2: Update .env file
```bash
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_API_BASE=https://zoom.us
```

### Step 3: Test (optional but recommended)
```bash
npm run build
npm run start
# Check logs for: ✅ Zoom credentials initialized
```

## 📊 What's Removed

### ❌ No longer needed:
- `google-calendar.service.ts` - Can be deleted
- Google credentials (GOOGLE_CREDENTIALS_PATH, GOOGLE_CREDENTIALS_JSON) - No longer needed
- Google-specific DB columns (already replaced in Prisma)

## 🔄 API Flow

### Create Meeting
```
POST /lsm/meetings/schedule
{
  "provider_id": 1,
  "scheduled_start": "2024-01-20T15:00:00Z",
  "scheduled_end": "2024-01-20T15:30:00Z",
  "title": "Onboarding Meeting",
  "timezone": "America/Chicago"
}

Response includes:
- zoom_meeting_id: "123456789"
- zoom_join_url: "https://zoom.us/j/123456789..."
- zoom_start_url: "https://zoom.us/s/..." (LSM only)
```

### Reschedule Meeting
```
PATCH /lsm/meetings/:meetingId/reschedule
{
  "scheduled_start": "2024-01-21T15:00:00Z",
  "scheduled_end": "2024-01-21T15:30:00Z"
}

✨ Zoom URL stays the same (no need to resend link)
```

### Cancel Meeting
```
DELETE /lsm/meetings/:meetingId
```

## 🔐 Security Notes

1. **Token Management**: Automatic refresh 20 seconds before expiry
2. **Error Handling**: Graceful failures with proper logging
3. **Credentials**: Stored safely in environment variables only
4. **Logs**: Sensitive tokens never logged

## 📝 Notes

- Database migrations already done (check schema.prisma)
- Google Calendar integration completely replaced
- No dependencies on Google libraries
- Ready for production use after adding credentials

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing Zoom credentials" | Ensure all 3 env vars are set |
| "401 Unauthorized" | Check Client ID/Secret/Account ID |
| "Failed to create Zoom meeting" | Check Zoom account has API access enabled |
| Token expires | Automatically refreshed (no action needed) |

---

**Last Updated**: January 2, 2026
**Status**: ✅ Ready for Zoom API calls
