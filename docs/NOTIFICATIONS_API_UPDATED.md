# 🔔 Notifications API - Updated Documentation

## ✨ What Changed

### **Simplified & Combined Endpoints**

Previously had **9 endpoints** → Now have **7 endpoints** (cleaner!)

**Removed:**
- ❌ `GET /notifications/admin/all` 
- ❌ `GET /notifications/admin/user/:userId`

**Enhanced:**
- ✅ `GET /notifications` - Now **smart endpoint** that works for all users!

---

## 📡 All Endpoints (Updated)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/notifications` | **All Users** | Smart endpoint - see below |
| `GET` | `/notifications/unread-count` | All Users | Get unread count |
| `GET` | `/notifications/:id` | All Users | Get single notification |
| `PATCH` | `/notifications/:id/read` | All Users | Mark as read |
| `PATCH` | `/notifications/mark-all-read` | All Users | Mark all as read |
| `DELETE` | `/notifications/:id` | All Users | Delete notification |
| `DELETE` | `/notifications/clear-read` | All Users | Clear read notifications |

---

## 🎯 The Smart Endpoint: `GET /notifications`

### **How It Works:**

#### **For Regular Users (Customer, Provider, LSM):**
```bash
GET /notifications?type=job&is_read=false&limit=20
```
- **Behavior:** See ONLY their own notifications
- **Filters:** `type`, `is_read`, `limit`, `offset`
- **Ignores:** `recipient_type`, `recipient_id` (even if sent)

#### **For Admins (Viewing Their Own):**
```bash
GET /notifications?type=job&limit=20
```
- **Behavior:** See their own admin notifications
- **Same as regular users**

#### **For Admins (Platform Monitoring):**
```bash
# View all LSM notifications
GET /notifications?recipient_type=local_service_manager&type=system

# View specific user's notifications
GET /notifications?recipient_id=123

# View all customer payment notifications
GET /notifications?recipient_type=customer&type=payment

# Combine filters
GET /notifications?recipient_type=service_provider&is_read=false&limit=50
```
- **Behavior:** See platform-wide notifications based on filters
- **Trigger:** When admin uses `recipient_type` OR `recipient_id` parameter
- **Access:** All notifications matching the filter

---

## 📊 Query Parameters

### **For All Users:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | enum | `job`, `payment`, `message`, `system`, `feedback` |
| `is_read` | boolean | `true` or `false` |
| `limit` | number | Pagination limit (default: 20) |
| `offset` | number | Pagination offset (default: 0) |

### **Additional for Admins:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `recipient_type` | enum | `customer`, `service_provider`, `local_service_manager`, `admin` |
| `recipient_id` | number | Specific user ID |

---

## 🚀 Usage Examples

### **Customer Gets Their Notifications:**
```bash
curl -X GET "http://localhost:3000/notifications?is_read=false" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# Returns: Only customer's notifications
```

### **Provider Gets Payment Notifications:**
```bash
curl -X GET "http://localhost:3000/notifications?type=payment" \
  -H "Authorization: Bearer PROVIDER_TOKEN"

# Returns: Only provider's payment notifications
```

### **LSM Gets System Notifications:**
```bash
curl -X GET "http://localhost:3000/notifications?type=system" \
  -H "Authorization: Bearer LSM_TOKEN"

# Returns: Only LSM's system notifications
```

### **Admin Views Their Own Notifications:**
```bash
curl -X GET "http://localhost:3000/notifications" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Returns: Admin's personal notifications (no special filters)
```

### **Admin Views All LSM Update Logs:**
```bash
curl -X GET "http://localhost:3000/notifications?recipient_type=local_service_manager&type=system" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Returns: All LSM system notifications across platform
```

### **Admin Views Specific User's Notifications:**
```bash
curl -X GET "http://localhost:3000/notifications?recipient_id=456" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Returns: All notifications for user ID 456
```

### **Admin Views All Unread Payment Notifications:**
```bash
curl -X GET "http://localhost:3000/notifications?type=payment&is_read=false&recipient_type=service_provider" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Returns: All unread payment notifications for all providers
```

---

## 🔐 Security & Logic

### **Smart Detection:**

```typescript
// Pseudo-logic in the service:
if (user.role === 'admin' && (query.recipient_type || query.recipient_id)) {
  // Admin is monitoring platform - show filtered results
  return getPlatformNotifications(query);
} else {
  // Regular user OR admin viewing personal - show own notifications
  return getUserNotifications(user.id, user.role, query);
}
```

### **Security:**
- ✅ Regular users CANNOT access platform-wide notifications (parameters ignored)
- ✅ Only admins can use `recipient_type` and `recipient_id` filters
- ✅ No special guards needed - role-based logic in service layer
- ✅ Users still can only modify their own notifications (mark read, delete)

---

## 📝 Response Structure

**Same as before:**

```json
{
  "notifications": [
    {
      "id": "uuid",
      "recipient_type": "customer",
      "recipient_id": 123,
      "type": "job",
      "title": "New Job Request",
      "message": "Your job has been submitted",
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

**Note on `unread_count`:**
- For regular users/admin personal view: User's own unread count
- For admin platform view: Unread count within current filter

---

## 🎨 Frontend Integration

### **For All Users (Including Admin Personal View):**
```javascript
// Get my notifications
const { notifications, unread_count } = await fetch(
  '/notifications?limit=20',
  { headers: { 'Authorization': `Bearer ${token}` } }
).then(r => r.json());

// Badge count
setBadgeCount(unread_count);
```

### **For Admin Dashboard - Platform Monitoring:**
```javascript
// LSM Activity Monitor
const lsmLogs = await fetch(
  '/notifications?recipient_type=local_service_manager&type=system&limit=50',
  { headers: { 'Authorization': `Bearer ${adminToken}` } }
).then(r => r.json());

// Specific User Support
const userNotifications = await fetch(
  `/notifications?recipient_id=${userId}`,
  { headers: { 'Authorization': `Bearer ${adminToken}` } }
).then(r => r.json());

// All Unread Payments
const unreadPayments = await fetch(
  '/notifications?type=payment&is_read=false',
  { headers: { 'Authorization': `Bearer ${adminToken}` } }
).then(r => r.json());
```

---

## 🧪 Testing Guide

### **Test 1: Regular User Access**
```bash
# Customer should see only their notifications
curl -X GET "http://localhost:3000/notifications" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
  
# Customer tries admin filter (should be ignored)
curl -X GET "http://localhost:3000/notifications?recipient_type=admin" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
# Still returns only customer's notifications
```

### **Test 2: Admin Personal View**
```bash
# Admin gets their own notifications (no special filters)
curl -X GET "http://localhost:3000/notifications" \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Returns only admin's personal notifications
```

### **Test 3: Admin Platform View**
```bash
# Admin uses recipient_type filter
curl -X GET "http://localhost:3000/notifications?recipient_type=customer" \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Returns all customer notifications

# Admin uses recipient_id filter
curl -X GET "http://localhost:3000/notifications?recipient_id=123" \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Returns all notifications for user 123
```

---

## ✅ Benefits of Combined Endpoint

1. **Simpler API:** 7 endpoints instead of 9
2. **Intuitive:** Same endpoint for all users
3. **Flexible:** Admins can switch between personal and platform view easily
4. **Secure:** Non-admins cannot access platform data (filters ignored)
5. **Frontend-Friendly:** One API call, different query params

---

## 🔄 Migration from Old Endpoints

### **Old Way (Deprecated):**
```bash
# Regular user
GET /notifications

# Admin personal
GET /notifications

# Admin platform
GET /notifications/admin/all

# Admin specific user
GET /notifications/admin/user/:userId
```

### **New Way:**
```bash
# Regular user (no change)
GET /notifications

# Admin personal (no change)
GET /notifications

# Admin platform
GET /notifications?recipient_type=...

# Admin specific user
GET /notifications?recipient_id=...
```

---

## 📚 Summary

### **Endpoints Removed:**
- `GET /notifications/admin/all`
- `GET /notifications/admin/user/:userId`

### **Endpoints Enhanced:**
- `GET /notifications` - Now handles all use cases

### **Key Features:**
- ✅ Single smart endpoint
- ✅ Role-based behavior
- ✅ Admin can monitor platform
- ✅ Regular users unaffected
- ✅ Simpler API surface
- ✅ All security maintained

---

**The notification system is now even better!** 🎉

