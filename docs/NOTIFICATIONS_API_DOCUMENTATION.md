# 🔔 Notifications API Documentation

## Overview

Complete notification system with role-based access control (RBAC). All users can manage their own notifications, and admins have additional endpoints to view all platform notifications.

---

## 📋 Features Implemented

✅ **User Notifications**
- Get my notifications with filtering & pagination
- Get single notification
- Mark as read (single & bulk)
- Delete notifications (permanent)
- Clear all read notifications
- Get unread count

✅ **Admin Features**
- View all notifications across platform
- View notifications for specific users
- Filter by recipient type, type, read status

✅ **Security & RBAC**
- JWT authentication required for all endpoints
- Users can only access their own notifications
- Admin role required for admin endpoints
- Ownership verification on all actions

✅ **Future-Ready**
- Push notification metadata structure in responses
- Priority levels (high, normal, low)
- Deep link support for mobile apps
- Action metadata for notification handling

---

## 🔐 Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## 📡 API Endpoints

### 1. Get My Notifications

```http
GET /notifications
```

**Access:** All authenticated users

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum | No | Filter by type: `job`, `payment`, `message`, `system`, `feedback` |
| `is_read` | boolean | No | Filter by read status: `true` or `false` |
| `limit` | number | No | Pagination limit (default: 20, max recommended: 100) |
| `offset` | number | No | Pagination offset (default: 0) |

**Example Request:**
```bash
# Get all notifications
curl -X GET "http://localhost:3000/notifications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get unread job notifications
curl -X GET "http://localhost:3000/notifications?is_read=false&type=job" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Pagination - get next 20
curl -X GET "http://localhost:3000/notifications?limit=20&offset=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "recipient_type": "customer",
      "recipient_id": 123,
      "type": "job",
      "title": "New Job Request",
      "message": "Your job request has been submitted successfully.",
      "is_read": false,
      "created_at": "2025-10-16T10:30:00.000Z",
      "metadata": {
        "priority": "high",
        "deepLink": null,
        "action": null
      }
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0,
  "unread_count": 12
}
```

---

### 2. Get Unread Count

```http
GET /notifications/unread-count
```

**Access:** All authenticated users

**Example Request:**
```bash
curl -X GET "http://localhost:3000/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "count": 12
}
```

---

### 3. Get Single Notification

```http
GET /notifications/:id
```

**Access:** All authenticated users (must own the notification)

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Notification ID |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/notifications/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "recipient_type": "service_provider",
  "recipient_id": 456,
  "type": "payment",
  "title": "Payment Received",
  "message": "Payment of $150.00 has been received for job #789",
  "is_read": true,
  "created_at": "2025-10-16T09:15:00.000Z",
  "metadata": {
    "priority": "high",
    "deepLink": null,
    "action": null
  }
}
```

**Error Responses:**
- `404 Not Found` - Notification doesn't exist
- `403 Forbidden` - Notification belongs to another user

---

### 4. Mark Notification as Read

```http
PATCH /notifications/:id/read
```

**Access:** All authenticated users (must own the notification)

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/notifications/550e8400-e29b-41d4-a716-446655440000/read" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "recipient_type": "customer",
  "recipient_id": 123,
  "type": "job",
  "title": "New Job Request",
  "message": "Your job request has been submitted successfully.",
  "is_read": true,
  "created_at": "2025-10-16T10:30:00.000Z",
  "metadata": {
    "priority": "high",
    "deepLink": null,
    "action": null
  }
}
```

---

### 5. Mark All as Read

```http
PATCH /notifications/mark-all-read
```

**Access:** All authenticated users

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "count": 12
}
```

---

### 6. Delete Notification

```http
DELETE /notifications/:id
```

**Access:** All authenticated users (must own the notification)

**Note:** This is a **permanent delete** (not soft delete)

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/notifications/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "message": "Notification deleted successfully"
}
```

---

### 7. Clear All Read Notifications

```http
DELETE /notifications/clear-read
```

**Access:** All authenticated users

**Note:** Permanently deletes all **read** notifications for the current user

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/notifications/clear-read" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "count": 25
}
```

---

### 8. Admin: Get All Notifications

```http
GET /notifications/admin/all
```

**Access:** Admin only

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recipient_type` | enum | No | Filter by recipient: `customer`, `service_provider`, `local_service_manager`, `admin` |
| `recipient_id` | number | No | Filter by specific user ID |
| `type` | enum | No | Filter by type: `job`, `payment`, `message`, `system`, `feedback` |
| `is_read` | boolean | No | Filter by read status |
| `limit` | number | No | Pagination limit (default: 50) |
| `offset` | number | No | Pagination offset (default: 0) |

**Example Request:**
```bash
# Get all notifications
curl -X GET "http://localhost:3000/notifications/admin/all" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get all LSM system notifications
curl -X GET "http://localhost:3000/notifications/admin/all?recipient_type=local_service_manager&type=system" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get unread payment notifications
curl -X GET "http://localhost:3000/notifications/admin/all?type=payment&is_read=false" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "recipient_type": "local_service_manager",
      "recipient_id": 789,
      "type": "system",
      "title": "New Service Request",
      "message": "Provider John Doe submitted a new service request",
      "is_read": false,
      "created_at": "2025-10-16T11:45:00.000Z",
      "metadata": {
        "priority": "low",
        "deepLink": null,
        "action": null
      }
    }
  ],
  "total": 1250,
  "limit": 50,
  "offset": 0,
  "unread_count": 342
}
```

---

### 9. Admin: Get User's Notifications

```http
GET /notifications/admin/user/:userId
```

**Access:** Admin only

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | number | User ID from users table |

**Query Parameters:** Same as endpoint #8 (admin/all)

**Example Request:**
```bash
# Get all notifications for user ID 123
curl -X GET "http://localhost:3000/notifications/admin/user/123" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get unread notifications for user ID 123
curl -X GET "http://localhost:3000/notifications/admin/user/123?is_read=false" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "recipient_type": "customer",
      "recipient_id": 123,
      "type": "job",
      "title": "Job Completed",
      "message": "Your job has been marked as completed",
      "is_read": false,
      "created_at": "2025-10-16T14:20:00.000Z",
      "metadata": {
        "priority": "high",
        "deepLink": null,
        "action": null
      }
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0,
  "unread_count": 12
}
```

**Error Responses:**
- `404 Not Found` - User doesn't exist

---

## 🔐 RBAC (Role-Based Access Control)

### Role Permissions

| Endpoint | Customer | Provider | LSM | Admin |
|----------|----------|----------|-----|-------|
| `GET /notifications` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `GET /notifications/unread-count` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `GET /notifications/:id` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `PATCH /notifications/:id/read` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `PATCH /notifications/mark-all-read` | ✅ | ✅ | ✅ | ✅ |
| `DELETE /notifications/:id` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `DELETE /notifications/clear-read` | ✅ | ✅ | ✅ | ✅ |
| `GET /notifications/admin/all` | ❌ | ❌ | ❌ | ✅ |
| `GET /notifications/admin/user/:userId` | ❌ | ❌ | ❌ | ✅ |

**Legend:**
- ✅ = Can access
- ✅ Own = Can only access their own notifications
- ❌ = Access denied (403 Forbidden)

---

## 📊 Notification Types

| Type | Description | Priority |
|------|-------------|----------|
| `job` | Job-related notifications (new job, accepted, completed, etc.) | High |
| `payment` | Payment-related notifications (received, pending, etc.) | High |
| `message` | Chat message notifications | Normal |
| `system` | System notifications (LSM updates, admin notices) | Low |
| `feedback` | Rating and feedback notifications | Low |

---

## 📱 Push Notification Metadata

Every notification response includes a `metadata` object for future push notification integration:

```typescript
{
  "metadata": {
    "deepLink": string | null,      // URL to navigate to in app (e.g., "/jobs/123")
    "action": string | null,          // Action identifier (e.g., "view_job", "accept_job")
    "priority": "high" | "normal" | "low"  // Notification priority
  }
}
```

**Priority Mapping:**
- **High:** `job`, `payment`
- **Normal:** `message`
- **Low:** `system`, `feedback`

This structure is ready for integration with FCM, APNs, or web push services.

---

## 🔄 Automatic Role Mapping

The system automatically maps user roles to recipient types:

| User Role (from JWT) | Recipient Type (in DB) |
|----------------------|------------------------|
| `customer` | `customer` |
| `service_provider` | `service_provider` |
| `local_service_manager` | `local_service_manager` |
| `admin` | `admin` |

Users only see notifications where:
```sql
recipient_type = <their_role> AND recipient_id = <their_user_id>
```

---

## ⚠️ Error Codes

| Status Code | Description |
|-------------|-------------|
| `200 OK` | Request successful |
| `401 Unauthorized` | Missing or invalid JWT token |
| `403 Forbidden` | User trying to access another user's notification |
| `404 Not Found` | Notification or user not found |
| `400 Bad Request` | Invalid query parameters |

---

## 💡 Usage Examples

### Frontend Integration

#### Display Notification Badge
```javascript
// Get unread count for badge
const response = await fetch('/notifications/unread-count', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { count } = await response.json();
// Show badge with count
```

#### List Notifications
```javascript
// Get first 20 notifications
const response = await fetch('/notifications?limit=20&offset=0', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
// Display data.notifications in UI
```

#### Mark as Read When Clicked
```javascript
// User clicked notification
const response = await fetch(`/notifications/${notificationId}/read`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
// Update UI to show as read
```

#### Clear All Read
```javascript
// User wants to clear old notifications
const response = await fetch('/notifications/clear-read', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { count } = await response.json();
console.log(`Cleared ${count} notifications`);
```

---

## 🚀 Testing Commands

### 1. Get My Notifications
```bash
curl -X GET "http://localhost:3000/notifications" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Unread Count
```bash
curl -X GET "http://localhost:3000/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Mark All as Read
```bash
curl -X PATCH "http://localhost:3000/notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Clear Read Notifications
```bash
curl -X DELETE "http://localhost:3000/notifications/clear-read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Admin: View All Notifications
```bash
curl -X GET "http://localhost:3000/notifications/admin/all?recipient_type=local_service_manager&type=system" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📝 Notes

1. **Permanent Delete:** DELETE operations permanently remove notifications from the database
2. **Pagination:** Use `limit` and `offset` for pagination. Recommended limit: 20-50 per page
3. **Filtering:** Combine multiple filters (e.g., `type=job&is_read=false`)
4. **Security:** All endpoints verify ownership - users cannot access other users' notifications
5. **Admin Access:** Admins can see all notifications but also have their own personal notifications
6. **LSM Logs:** When LSM updates anything, notifications are sent to both admin and LSM (recipient_type based on their role)

---

## 🎯 Summary

✅ **9 endpoints** covering all notification operations
✅ **Full RBAC** with JWT authentication
✅ **Admin monitoring** capabilities
✅ **Future-ready** with push notification metadata
✅ **Secure** with ownership verification
✅ **Scalable** with pagination and filtering

**All notification APIs are ready to use!** 🚀

