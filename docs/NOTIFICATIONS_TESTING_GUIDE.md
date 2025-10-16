# 🧪 Notifications API - Testing Guide

## Quick Testing Commands

### Prerequisites
1. Start the server: `npm run start:dev`
2. Have valid JWT tokens for different roles (customer, service_provider, local_service_manager, admin)
3. Use Postman, Thunder Client, or curl

---

## 🔑 Get JWT Tokens

First, login as different users to get tokens:

```bash
# Login as Customer
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'

# Login as Service Provider
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider@example.com",
    "password": "password123"
  }'

# Login as LSM
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lsm@example.com",
    "password": "password123"
  }'

# Login as Admin
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

Save the `access_token` from each response!

---

## 📝 Test Scenarios

### Scenario 1: Customer Views Notifications

```bash
# 1. Get all notifications
curl -X GET "http://localhost:3000/notifications" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# 2. Get unread count
curl -X GET "http://localhost:3000/notifications/unread-count" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# 3. Filter unread job notifications
curl -X GET "http://localhost:3000/notifications?is_read=false&type=job" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# 4. Get with pagination
curl -X GET "http://localhost:3000/notifications?limit=10&offset=0" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### Scenario 2: Mark Notifications as Read

```bash
# Get a notification ID first
NOTIFICATION_ID="<uuid from previous response>"

# 1. Mark single notification as read
curl -X PATCH "http://localhost:3000/notifications/$NOTIFICATION_ID/read" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# 2. Mark all as read
curl -X PATCH "http://localhost:3000/notifications/mark-all-read" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### Scenario 3: Delete Notifications

```bash
# 1. Delete single notification
curl -X DELETE "http://localhost:3000/notifications/$NOTIFICATION_ID" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# 2. Clear all read notifications
curl -X DELETE "http://localhost:3000/notifications/clear-read" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### Scenario 4: Service Provider Notifications

```bash
# Service providers see only their notifications automatically

# 1. Get provider notifications
curl -X GET "http://localhost:3000/notifications" \
  -H "Authorization: Bearer PROVIDER_TOKEN"

# 2. Filter payment notifications
curl -X GET "http://localhost:3000/notifications?type=payment" \
  -H "Authorization: Bearer PROVIDER_TOKEN"

# 3. Get unread count
curl -X GET "http://localhost:3000/notifications/unread-count" \
  -H "Authorization: Bearer PROVIDER_TOKEN"
```

### Scenario 5: LSM Notifications

```bash
# LSMs see only their notifications

# 1. Get LSM notifications
curl -X GET "http://localhost:3000/notifications" \
  -H "Authorization: Bearer LSM_TOKEN"

# 2. Filter system notifications
curl -X GET "http://localhost:3000/notifications?type=system" \
  -H "Authorization: Bearer LSM_TOKEN"
```

### Scenario 6: Admin Views All Platform Notifications

```bash
# Admin has special endpoints

# 1. Get ALL platform notifications
curl -X GET "http://localhost:3000/notifications/admin/all" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 2. Filter by recipient type (LSM logs)
curl -X GET "http://localhost:3000/notifications/admin/all?recipient_type=local_service_manager&type=system" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 3. Filter by specific user
curl -X GET "http://localhost:3000/notifications/admin/all?recipient_id=123" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 4. Get notifications for specific user
curl -X GET "http://localhost:3000/notifications/admin/user/123" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 5. Admin's personal notifications
curl -X GET "http://localhost:3000/notifications" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 🔒 Security Tests

### Test 1: Unauthorized Access (Should Fail)

```bash
# Try to access without token (should return 401)
curl -X GET "http://localhost:3000/notifications"

# Expected: 401 Unauthorized
```

### Test 2: Access Another User's Notification (Should Fail)

```bash
# Customer tries to access provider's notification
curl -X GET "http://localhost:3000/notifications/PROVIDER_NOTIFICATION_ID" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# Expected: 403 Forbidden or 404 Not Found
```

### Test 3: Non-Admin Accessing Admin Endpoints (Should Fail)

```bash
# Customer tries admin endpoint (should return 403)
curl -X GET "http://localhost:3000/notifications/admin/all" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# Expected: 403 Forbidden
```

---

## 📊 Expected Responses

### Success: Get Notifications
```json
{
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "recipient_type": "customer",
      "recipient_id": 123,
      "type": "job",
      "title": "New Job Request",
      "message": "Your job request has been submitted",
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

### Success: Unread Count
```json
{
  "count": 12
}
```

### Success: Mark All as Read
```json
{
  "count": 5
}
```

### Success: Delete
```json
{
  "message": "Notification deleted successfully"
}
```

### Error: Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Error: Forbidden
```json
{
  "statusCode": 403,
  "message": "Access denied to this notification"
}
```

### Error: Not Found
```json
{
  "statusCode": 404,
  "message": "Notification not found"
}
```

---

## 🎯 Verification Checklist

- [ ] Customer can see only their own notifications
- [ ] Provider can see only their own notifications
- [ ] LSM can see only their own notifications
- [ ] Admin can see their own notifications via `/notifications`
- [ ] Admin can see all platform notifications via `/notifications/admin/all`
- [ ] Admin can filter LSM logs via `?recipient_type=local_service_manager&type=system`
- [ ] Filtering by `type` works (job, payment, message, system, feedback)
- [ ] Filtering by `is_read` works (true/false)
- [ ] Pagination works (limit & offset)
- [ ] Mark as read updates `is_read` to `true`
- [ ] Mark all as read updates all unread notifications
- [ ] Delete permanently removes notification
- [ ] Clear read only deletes read notifications
- [ ] Unread count is accurate
- [ ] Users cannot access other users' notifications (403/404)
- [ ] Non-admins cannot access admin endpoints (403)
- [ ] No token = 401 Unauthorized
- [ ] Response includes push notification metadata

---

## 🐛 Debugging Tips

### Check Database Directly

```sql
-- See all notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Count by recipient type
SELECT recipient_type, COUNT(*) FROM notifications GROUP BY recipient_type;

-- Check unread count for user
SELECT COUNT(*) FROM notifications 
WHERE recipient_id = 123 AND recipient_type = 'customer' AND is_read = false;
```

### Common Issues

**Issue:** No notifications returned
- Check if notifications exist in database for that user
- Verify `recipient_id` matches `user.id` (not customer.id or provider.id)
- Check `recipient_type` matches user's role

**Issue:** Wrong notifications returned
- Verify role mapping: `customer` → `customer`, `service_provider` → `service_provider`
- Check JWT token has correct role

**Issue:** Admin can't access admin endpoints
- Verify user role is `'admin'` in database
- Check JWT token contains role: `'admin'`
- Ensure both guards are applied: `@UseGuards(JwtAuthGuard, RolesGuard)`

---

## 📱 Postman Collection Template

```json
{
  "info": {
    "name": "Notifications API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get My Notifications",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/notifications?limit=20&offset=0",
          "host": ["{{baseUrl}}"],
          "path": ["notifications"],
          "query": [
            {"key": "limit", "value": "20"},
            {"key": "offset", "value": "0"}
          ]
        }
      }
    }
  ]
}
```

---

## ✅ All Tests Passing?

If all tests pass:
- ✅ Notifications API is working correctly
- ✅ RBAC is properly enforced
- ✅ Security checks are in place
- ✅ Ready for production!

**Next Steps:**
1. Test with real user flows (job creation → notification)
2. Load test with many notifications
3. Frontend integration
4. Push notification service integration (future)

---

**Happy Testing!** 🚀

