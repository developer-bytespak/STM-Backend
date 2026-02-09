# Customizable Message Template Implementation Guide

## Overview

Service Providers can now customize an automatic welcome message that is sent to customers when a job request is created. This message appears in the chat immediately after the customer initiates the job.

## Feature Architecture

### Frontend Flow

```
Customer Creates Job
    ↓
Job Request Created (Backend)
    ↓
Chat Opens Automatically
    ↓
1. Initial message from Customer (job details)
2. Auto-message from Provider (customizable template)
    ↓
Chat Ready for Communication
```

### Business Logic

- **Message Sender**: System (on behalf of provider)
- **Message Type**: Auto-generated from provider's customizable template
- **Variables**: Dynamic placeholders replaced with actual job data
- **Default**: If provider hasn't set a template, NO auto-message is sent

---

## API Endpoints for Frontend

### 1. Get Provider's Message Template

**Endpoint**: `GET /provider/email-templates`

**Authentication**: JWT Bearer Token (Provider role required)

**Response**:
```json
{
  "id": 1,
  "provider_id": 45,
  "first_message_template": "Hi [CUSTOMER_NAME]! Thanks for choosing us for your [SERVICE_NAME]. We're reviewing your request and will respond shortly.",
  "job_accepted_subject": "✅ Your [SERVICE_NAME] is Ready!",
  "job_accepted_body": "<p>Hi [CUSTOMER_NAME],</p><p>We're excited to work on your [SERVICE_NAME]!</p>",
  "negotiation_subject": "💡 Better Solution for Your [SERVICE_NAME]",
  "negotiation_body": "<p>How about this instead?</p>",
  "created_at": "2026-02-10T12:00:00Z",
  "updated_at": "2026-02-10T12:30:00Z"
}
```

### 2. Update Message Template

**Endpoint**: `PUT /provider/email-templates`

**Authentication**: JWT Bearer Token (Provider role required)

**Request Body** (all fields optional):
```json
{
  "first_message_template": "Hey [CUSTOMER_NAME]! Thanks for your [SERVICE_NAME] request. We're checking our schedule for [LOCATION]. Reply ASAP!",
  "job_accepted_subject": "We're Ready for Your [SERVICE_NAME]!",
  "job_accepted_body": "<p>Hi [CUSTOMER_NAME],</p><p>Your [SERVICE_NAME] starts soon!</p>"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email templates updated successfully",
  "data": { /* Updated template */ }
}
```

### 3. Reset to Default Templates

**Endpoint**: `DELETE /provider/email-templates`

**Authentication**: JWT Bearer Token (Provider role required)

**Response**:
```json
{
  "success": true,
  "message": "Email templates reset to defaults"
}
```

---

## Available Variables for Templates

### For Initial Auto-Message (`first_message_template`)

Use these placeholders to include dynamic data:

| Variable | Description | Example |
|----------|-------------|---------|
| `[CUSTOMER_NAME]` | Full name of customer | "John Smith" |
| `[SERVICE_NAME]` | Name of requested service | "House Cleaning" |
| `[LOCATION]` | Job location/address | "123 Main St, New York" |
| `[SCHEDULED_DATE]` | Preferred date for service | "2026-02-15" |

### For Accepted Email (`job_accepted_subject`, `job_accepted_body`)

| Variable | Description | Example |
|----------|-------------|---------|
| `[CUSTOMER_NAME]` | Full name of customer | "John Smith" |
| `[SERVICE_NAME]` | Service name | "House Cleaning" |
| `[PROVIDER_NAME]` | Business/provider name | "Clean Pro Services" |
| `[PRICE]` | Job price | "150" |
| `[JOB_ID]` | Job reference number | "12345" |

### For Negotiation Email (`negotiation_subject`, `negotiation_body`)

| Variable | Description | Example |
|----------|-------------|---------|
| `[CUSTOMER_NAME]` | Full name of customer | "John Smith" |
| `[PROVIDER_NAME]` | Business/provider name | "Clean Pro Services" |
| `[SERVICE_NAME]` | Service name | "House Cleaning" |
| `[ORIGINAL_PRICE]` | Initial quoted price | "150" |
| `[NEW_PRICE]` | New proposed price | "120" |
| `[NEW_SCHEDULE]` | New proposed schedule | "2026-02-20" |
| `[PROVIDER_NOTES]` | Notes from provider | "Special discount available" |
| `[JOB_ID]` | Job reference number | "12345" |

---

## Frontend Implementation Steps

### Step 1: Settings Page - Message Template Section

Create a UI section under Provider Settings:

```
📧 Welcome Message Template
├─ Description: "Auto-message sent when customer creates a job"
├─ Textarea Input:
│  ├─ Placeholder: "Hi [CUSTOMER_NAME]! Thanks for your [SERVICE_NAME] request..."
│  ├─ Max Length: 2000 characters
│  ├─ Character Counter: "1250/2000"
│  └─ Available Variables: [Show dropdown or help text]
├─ Variable Helper:
│  └─ Clickable buttons for: [CUSTOMER_NAME] [SERVICE_NAME] [LOCATION] [SCHEDULED_DATE]
└─ Action Buttons:
   ├─ Save Changes
   └─ Reset to Default
```

### Step 2: Fetch Existing Template on Page Load

```javascript
// Get current templates
async function loadMessageTemplate() {
  const response = await fetch('/api/provider/email-templates', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  const templates = await response.json();
  
  // Populate form with existing values or show placeholders
  document.getElementById('messageTemplate').value = 
    templates.first_message_template || '';
}
```

### Step 3: Save Template

```javascript
async function saveMessageTemplate() {
  const template = document.getElementById('messageTemplate').value;
  
  const response = await fetch('/api/provider/email-templates', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      first_message_template: template
    })
  });
  
  if (response.ok) {
    showSuccessMessage('Message template saved!');
  } else {
    showErrorMessage('Failed to save template');
  }
}
```

### Step 4: Reset to Defaults

```javascript
async function resetMessageTemplate() {
  if (!confirm('Reset to default message?')) return;
  
  const response = await fetch('/api/provider/email-templates', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (response.ok) {
    document.getElementById('messageTemplate').value = '';
    showSuccessMessage('Reset to default message');
  }
}
```

---

## Real-Time Chat Display

### When Job is Created

After a customer creates a job:

1. **Chat Opens** with job details message from customer
2. **Auto-Message Appears** from provider (if template is set)
3. **Message Format** in chat:
   ```
   [Provider Avatar] | Provider Name
   ────────────────────────
   Hi John! Thanks for your House Cleaning request. 
   We're available at your location and will start soon!
   12:47 PM
   ```

### Socket Events

Listen for new messages via WebSocket:

```javascript
// In chat component
socket.on('new_message', (messageData) => {
  // messageData = {
  //   id: 1,
  //   chatId: "abc123",
  //   sender_type: "service_provider",
  //   sender_id: 45,
  //   sender_name: "Clean Pro Services",
  //   message: "Hi John! Thanks...",
  //   message_type: "text",
  //   created_at: "2026-02-10T12:47:31Z"
  // }
  
  displayMessage(messageData);
});
```

---

## Validation Rules

### Frontend Validation

Before sending to API:

- **Field**: `first_message_template`
- **Type**: String (required if provided)
- **Max Length**: 2000 characters
- **Min Content**: At least 1 character if provided
- **Allowed**: Plain text + HTML tags (no scripts)

### Backend Validation

- Max Length: 2000 characters (enforced)
- Required: Optional field (can be null)
- Special chars: URL-encoded automatically

### Error Handling

```javascript
try {
  // Validate frontend
  if (template.length > 2000) {
    throw new Error('Message too long (max 2000 characters)');
  }
  
  // Send to API
  const response = await fetch('/api/provider/email-templates', {
    method: 'PUT',
    headers: { /* ... */ },
    body: JSON.stringify({ first_message_template: template })
  });
  
  if (response.status === 400) {
    const error = await response.json();
    showErrorMessage(`Validation Error: ${error.message}`);
  } else if (!response.ok) {
    showErrorMessage('Server error. Please try again.');
  }
} catch (error) {
  showErrorMessage(error.message);
}
```

---

## Example Workflows

### Workflow 1: Set Up Welcome Message

1. Provider navigates to Settings → Message Template
2. Sees input field with example: "Hi [CUSTOMER_NAME]! Thanks for your [SERVICE_NAME]..."
3. Clicks variable buttons to insert: `[CUSTOMER_NAME]`, `[SERVICE_NAME]`
4. Types: "Hey, thanks for choosing us! We'll be at [LOCATION] on [SCHEDULED_DATE]"
5. Clicks Save
6. Gets confirmation: "Your message template has been saved!"

### Workflow 2: Message Appears in Chat

1. Customer creates job for "House Cleaning"
2. Chat opens immediately
3. Customer sees their job details message
4. Provider's welcome message appears below:
   - "Hey, thanks for choosing us! We'll be at 123 Main St on Feb 15, 2026"
5. Variables automatically replaced with actual job data
6. Customer reads message and starts communicating

### Workflow 3: Reset to Default

1. Provider clicks "Reset to Default"
2. Confirmation dialog: "This will remove your custom message template"
3. Provider confirms
4. Template cleared
5. Future jobs will not have auto-message (system default applies)

---

## Testing Checklist

- [ ] API endpoint returns current template (GET)
- [ ] Can update template (PUT)
- [ ] Can reset template (DELETE)
- [ ] Variables are replaced correctly in chat
- [ ] Message appears for new jobs with template set
- [ ] No message appears if no template is set
- [ ] Message displays in both provider and customer chat views
- [ ] Socket emission triggers message display in real-time
- [ ] Length validation works (max 2000 chars)
- [ ] Special characters are handled correctly
- [ ] Multiple jobs with same provider show same message
- [ ] Resetting template removes it from subsequent jobs

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Message not appearing | No template set OR socket not connected | Check if template exists via GET endpoint; verify WebSocket connection |
| Variables not replaced | Template not found | Ensure template has exact placeholder names like `[CUSTOMER_NAME]` |
| Long message truncated | Display width issue | Use word-wrap CSS; test responsive design |
| Update doesn't persist | Auth token expired | Re-authenticate and retry |
| Socket message delayed | Network lag | Cache message in UI; update when socket event arrives |

---

## API Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Display confirmation |
| 201 | Created | Display success (new template) |
| 204 | No Content | Reset successful |
| 400 | Bad Request | Show validation error message |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Show "Access Denied" |
| 500 | Server Error | Show generic error, retry |

---

## Real-Time Updates

### Socket Events Structure

**Event Name**: `new_message`

**Payload**:
```json
{
  "id": 123,                          // Message database ID
  "chatId": "abc-123",                // Chat room ID
  "sender_type": "service_provider",  // Who sent it
  "sender_id": 45,                    // Provider user ID
  "sender_name": "Clean Pro",         // Display name
  "message": "Hi John!...",           // Actual message text
  "message_type": "text",             // Always "text" for auto-messages
  "created_at": "2026-02-10T12:47Z"   // ISO timestamp
}
```

---

## Notes for Frontend Team

1. **Message Template is Optional**: If provider doesn't set one, no auto-message is sent to customers
2. **One Template Per Provider**: All jobs for a provider use the same template
3. **HTML Support**: Email templates support HTML, but chat messages are plain text (HTML stripped)
4. **Timezone Awareness**: `[SCHEDULED_DATE]` uses customer's browser locale
5. **Mobile Friendly**: Keep messages under 160 characters for mobile display
6. **Accessibility**: Ensure variable buttons have proper ARIA labels

---

## Rate Limiting

- GET `/provider/email-templates`: 60 requests/minute
- PUT `/provider/email-templates`: 10 requests/minute
- DELETE `/provider/email-templates`: 10 requests/minute

Handle 429 (Too Many Requests) with exponential backoff.
