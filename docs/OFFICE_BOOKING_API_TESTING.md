# Office Booking System - API Testing Guide

**Status:** ✅ Implementation Complete  
**Date:** October 17, 2025  
**Total Endpoints:** 13 (8 Admin + 5 Provider)

---

## 🚀 Quick Start

### Base URL
```
http://localhost:3000/api
```

### Authentication
All endpoints require JWT Bearer token:
```
Authorization: Bearer <your_jwt_token>
```

### Required Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

---

## 📋 API Endpoints Summary

### Admin Endpoints (8)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/offices` | List all offices |
| POST | `/admin/offices` | Create office |
| GET | `/admin/offices/:id` | Get office details |
| PUT | `/admin/offices/:id` | Update office |
| DELETE | `/admin/offices/:id` | Delete office |
| GET | `/admin/office-bookings` | List all bookings |
| PUT | `/admin/office-bookings/:id/confirm` | Confirm booking |
| PUT | `/admin/office-bookings/:id/complete` | Complete booking |

### Provider Endpoints (5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/provider/offices` | Browse available offices |
| GET | `/provider/offices/:id` | Get office details |
| POST | `/provider/office-bookings` | Create booking |
| GET | `/provider/office-bookings` | Get my bookings |
| GET | `/provider/office-bookings/:id` | Get booking details |

---

## 🔐 Admin Office APIs

### 1. Create Office Space

**POST** `/admin/offices`

**Request Body:**
```json
{
  "name": "Executive Private Office",
  "description": "Modern workspace in the heart of Miami with stunning city views",
  "type": "private_office",
  "location": {
    "address": "123 Main St, Suite 500",
    "city": "Miami",
    "state": "FL",
    "zipCode": "33101"
  },
  "capacity": 10,
  "area": 500,
  "dailyPrice": 350.00,
  "availability": {
    "monday": { "start": "09:00", "end": "18:00", "available": true },
    "tuesday": { "start": "09:00", "end": "18:00", "available": true },
    "wednesday": { "start": "09:00", "end": "18:00", "available": true },
    "thursday": { "start": "09:00", "end": "18:00", "available": true },
    "friday": { "start": "09:00", "end": "18:00", "available": true },
    "saturday": { "start": "00:00", "end": "00:00", "available": false },
    "sunday": { "start": "00:00", "end": "00:00", "available": false }
  },
  "images": []
}
```

**Success Response (201):**
```json
{
  "id": "uuid-here",
  "name": "Executive Private Office",
  "description": "Modern workspace in the heart of Miami with stunning city views",
  "type": "private_office",
  "status": "available",
  "address": "123 Main St, Suite 500",
  "city": "Miami",
  "state": "FL",
  "zipCode": "33101",
  "capacity": 10,
  "area": 500,
  "dailyPrice": 350.00,
  "availability": { ... },
  "rating": 0.00,
  "reviewsCount": 0,
  "totalBookings": 0,
  "images": [],
  "createdAt": "2025-10-17T10:00:00Z",
  "updatedAt": "2025-10-17T10:00:00Z",
  "createdBy": 1
}
```

**Validation Rules:**
- `name`: 2-255 characters
- `description`: minimum 10 characters
- `capacity`: 1-1000
- `area`: 10-100000
- `dailyPrice`: 0.01-10000
- `location.address`: minimum 5 characters
- `location.city`: 2-100 characters
- `location.state`: 2-50 characters
- `location.zipCode`: numeric string

---

### 2. Get All Offices

**GET** `/admin/offices`

**Success Response (200):**
```json
{
  "success": true,
  "offices": [
    {
      "id": "uuid-1",
      "name": "Executive Private Office",
      "type": "private_office",
      "status": "available",
      "city": "Miami",
      "state": "FL",
      "capacity": 10,
      "area": 500,
      "dailyPrice": 350.00,
      "rating": 4.5,
      "totalBookings": 12,
      "createdAt": "2025-10-17T10:00:00Z",
      "creator": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "total": 1
}
```

---

### 3. Get Office by ID

**GET** `/admin/offices/:id`

**Success Response (200):**
```json
{
  "success": true,
  "office": {
    "id": "uuid-here",
    "name": "Executive Private Office",
    "description": "Modern workspace...",
    "type": "private_office",
    "status": "available",
    "address": "123 Main St, Suite 500",
    "city": "Miami",
    "state": "FL",
    "zipCode": "33101",
    "capacity": 10,
    "area": 500,
    "dailyPrice": 350.00,
    "availability": { ... },
    "rating": 0.00,
    "reviewsCount": 0,
    "totalBookings": 0,
    "images": [],
    "createdAt": "2025-10-17T10:00:00Z",
    "updatedAt": "2025-10-17T10:00:00Z",
    "createdBy": 1,
    "creator": { ... },
    "bookings": [ ... ]
  }
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "Office space with ID uuid-here not found",
  "error": "Not Found"
}
```

---

### 4. Update Office Space

**PUT** `/admin/offices/:id`

**Request Body (All fields optional):**
```json
{
  "name": "Updated Office Name",
  "status": "occupied",
  "dailyPrice": 400.00,
  "description": "Updated description"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Office space updated successfully",
  "office": { ... }
}
```

**Status Values:**
- `available`
- `occupied`
- `booked`
- `maintenance`

---

### 5. Delete Office Space

**DELETE** `/admin/offices/:id`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Office space deleted successfully"
}
```

**Error Response (400):**
```json
{
  "statusCode": 400,
  "message": "Cannot delete office space with active or pending bookings",
  "error": "Bad Request"
}
```

---

### 6. Get All Bookings (Admin)

**GET** `/admin/office-bookings`

**Success Response (200):**
```json
{
  "success": true,
  "bookings": [
    {
      "id": "booking-uuid",
      "officeSpaceId": "office-uuid",
      "providerId": 5,
      "officeName": "Executive Private Office",
      "providerName": "John Doe",
      "providerEmail": "john@example.com",
      "startDate": "2025-11-01T09:00:00Z",
      "endDate": "2025-11-05T17:00:00Z",
      "duration": 4,
      "durationType": "daily",
      "dailyRate": 350.00,
      "totalAmount": 1400.00,
      "status": "pending",
      "paymentStatus": "pending",
      "specialRequests": "Need parking space",
      "createdAt": "2025-10-17T10:00:00Z",
      "updatedAt": "2025-10-17T10:00:00Z",
      "officeSpace": {
        "id": "office-uuid",
        "name": "Executive Private Office",
        "city": "Miami",
        "state": "FL"
      },
      "provider": {
        "id": 5,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      }
    }
  ],
  "total": 1
}
```

---

### 7. Confirm Booking

**PUT** `/admin/office-bookings/:id/confirm`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking confirmed successfully",
  "booking": {
    "id": "booking-uuid",
    "status": "confirmed",
    "paymentStatus": "paid",
    "updatedAt": "2025-10-17T11:00:00Z",
    ...
  }
}
```

**Error Response (400):**
```json
{
  "statusCode": 400,
  "message": "Booking is already confirmed and cannot be confirmed",
  "error": "Bad Request"
}
```

---

### 8. Complete Booking

**PUT** `/admin/office-bookings/:id/complete`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking completed successfully",
  "booking": {
    "id": "booking-uuid",
    "status": "completed",
    "updatedAt": "2025-10-17T12:00:00Z",
    ...
  }
}
```

**Business Rules:**
- Only `confirmed` bookings can be marked as `completed`
- Completing a booking increments the office's `totalBookings` counter

---

## 👤 Provider Office APIs

### 9. Browse Available Offices

**GET** `/provider/offices`

**Success Response (200):**
```json
{
  "success": true,
  "offices": [
    {
      "id": "uuid-1",
      "name": "Executive Private Office",
      "description": "Modern workspace...",
      "type": "private_office",
      "status": "available",
      "address": "123 Main St, Suite 500",
      "city": "Miami",
      "state": "FL",
      "zipCode": "33101",
      "capacity": 10,
      "area": 500,
      "dailyPrice": 350.00,
      "availability": { ... },
      "rating": 4.5,
      "reviewsCount": 10,
      "totalBookings": 12,
      "images": []
    }
  ]
}
```

**Note:** Only returns offices with `status = 'available'`

---

### 10. Get Office Details (Provider)

**GET** `/provider/offices/:id`

Same response as Admin Get Office by ID (endpoint #3)

---

## 📅 Provider Booking APIs

### 11. Create Booking

**POST** `/provider/office-bookings`

**Request Body:**
```json
{
  "officeSpaceId": "uuid-of-office",
  "startDate": "2025-11-01T09:00:00Z",
  "endDate": "2025-11-05T17:00:00Z",
  "specialRequests": "Need parking space"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "booking": {
    "id": "booking-uuid",
    "officeSpaceId": "office-uuid",
    "providerId": 5,
    "officeName": "Executive Private Office",
    "providerName": "John Doe",
    "providerEmail": "john@example.com",
    "startDate": "2025-11-01T09:00:00Z",
    "endDate": "2025-11-05T17:00:00Z",
    "duration": 4,
    "durationType": "daily",
    "dailyRate": 350.00,
    "totalAmount": 1400.00,
    "status": "pending",
    "paymentStatus": "pending",
    "specialRequests": "Need parking space",
    "createdAt": "2025-10-17T10:00:00Z",
    "updatedAt": "2025-10-17T10:00:00Z"
  }
}
```

**Validation Rules:**
- `startDate` must be in the future
- `endDate` must be after `startDate`
- Office must have `status = 'available'`
- Duration is automatically calculated
- `totalAmount = duration * dailyRate` (auto-calculated)
- Provider details auto-populated from authenticated user

**Error Responses:**

400 - Start date in past:
```json
{
  "statusCode": 400,
  "message": "Start date cannot be in the past",
  "error": "Bad Request"
}
```

400 - Invalid dates:
```json
{
  "statusCode": 400,
  "message": "End date must be after start date",
  "error": "Bad Request"
}
```

400 - Office not available:
```json
{
  "statusCode": 400,
  "message": "Office space is not available for booking",
  "error": "Bad Request"
}
```

404 - Office not found:
```json
{
  "statusCode": 404,
  "message": "Office space not found",
  "error": "Not Found"
}
```

---

### 12. Get My Bookings

**GET** `/provider/office-bookings`

**Success Response (200):**
```json
{
  "success": true,
  "bookings": [
    {
      "id": "booking-uuid-1",
      "officeName": "Executive Private Office",
      "startDate": "2025-11-01T09:00:00Z",
      "endDate": "2025-11-05T17:00:00Z",
      "duration": 4,
      "durationType": "daily",
      "totalAmount": 1400.00,
      "status": "confirmed",
      "paymentStatus": "paid",
      "specialRequests": "Need parking space",
      "createdAt": "2025-10-17T10:00:00Z",
      "officeSpace": {
        "id": "office-uuid",
        "name": "Executive Private Office",
        "address": "123 Main St, Suite 500",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
        "capacity": 10,
        "area_sqft": 500,
        "images": []
      }
    }
  ]
}
```

**Note:** Returns only bookings for the authenticated provider

---

### 13. Get Booking Details

**GET** `/provider/office-bookings/:id`

**Success Response (200):**
```json
{
  "success": true,
  "booking": {
    "id": "booking-uuid",
    "officeSpaceId": "office-uuid",
    "providerId": 5,
    "officeName": "Executive Private Office",
    "providerName": "John Doe",
    "providerEmail": "john@example.com",
    "startDate": "2025-11-01T09:00:00Z",
    "endDate": "2025-11-05T17:00:00Z",
    "duration": 4,
    "durationType": "daily",
    "dailyRate": 350.00,
    "totalAmount": 1400.00,
    "status": "confirmed",
    "paymentStatus": "paid",
    "specialRequests": "Need parking space",
    "createdAt": "2025-10-17T10:00:00Z",
    "updatedAt": "2025-10-17T11:00:00Z",
    "officeSpace": { ... },
    "provider": {
      "id": 5,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    }
  }
}
```

**Error Response (403):**
```json
{
  "statusCode": 403,
  "message": "You do not have access to this booking",
  "error": "Forbidden"
}
```

**Note:** Providers can only view their own bookings. Admins can view all bookings.

---

## 📊 Booking Status Flow

```
1. Provider creates booking
   ↓
   status: "pending"
   paymentStatus: "pending"

2. Admin confirms booking
   ↓
   status: "confirmed"
   paymentStatus: "paid" (auto-marked for MVP)

3. Booking period ends
   ↓
   status: "completed"
   office.totalBookings++
```

---

## 🧪 Testing Workflow

### Step 1: Create Office (Admin)
```bash
POST /admin/offices
# Save the returned office ID
```

### Step 2: Browse Offices (Provider)
```bash
GET /provider/offices
# Verify the office appears in the list
```

### Step 3: Create Booking (Provider)
```bash
POST /provider/office-bookings
{
  "officeSpaceId": "<office-id-from-step-1>",
  "startDate": "2025-12-01T09:00:00Z",
  "endDate": "2025-12-05T17:00:00Z",
  "specialRequests": "Test booking"
}
# Save the returned booking ID
```

### Step 4: View All Bookings (Admin)
```bash
GET /admin/office-bookings
# Verify the booking appears with status "pending"
```

### Step 5: Confirm Booking (Admin)
```bash
PUT /admin/office-bookings/<booking-id>/confirm
# Verify status changes to "confirmed" and payment_status to "paid"
```

### Step 6: View My Bookings (Provider)
```bash
GET /provider/office-bookings
# Verify the booking shows as "confirmed"
```

### Step 7: Complete Booking (Admin)
```bash
PUT /admin/office-bookings/<booking-id>/complete
# Verify status changes to "completed"
```

### Step 8: Verify Office Stats Updated
```bash
GET /admin/offices/<office-id>
# Verify totalBookings incremented
```

---

## 🔍 Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Validation error | Check request body format |
| 401 | Unauthorized | Provide valid JWT token |
| 403 | Forbidden | Check user role/permissions |
| 404 | Not found | Verify ID exists |
| 409 | Conflict | Resource already exists |
| 500 | Internal server error | Check server logs |

---

## ✅ Testing Checklist

### Admin Office Endpoints
- [ ] Create office with valid data
- [ ] Create office with invalid data (test validation)
- [ ] List all offices
- [ ] Get single office by ID
- [ ] Update office details
- [ ] Update office status
- [ ] Delete office (no bookings)
- [ ] Try to delete office with active bookings (should fail)

### Provider Office Endpoints
- [ ] Browse available offices only
- [ ] Get office details

### Admin Booking Endpoints
- [ ] List all bookings from all providers
- [ ] Confirm pending booking
- [ ] Try to confirm already confirmed booking (should fail)
- [ ] Complete confirmed booking
- [ ] Try to complete pending booking (should fail)
- [ ] Verify totalBookings incremented after completion

### Provider Booking Endpoints
- [ ] Create booking with valid dates
- [ ] Try to create booking with past start date (should fail)
- [ ] Try to create booking with invalid date range (should fail)
- [ ] Try to book unavailable office (should fail)
- [ ] View own bookings
- [ ] View specific booking details
- [ ] Try to view another provider's booking (should fail 403)

### Business Logic
- [ ] Verify duration is auto-calculated correctly
- [ ] Verify totalAmount = duration * dailyPrice
- [ ] Verify provider details auto-populated
- [ ] Verify status transitions work correctly
- [ ] Verify payment status auto-marked on confirmation

---

## 📝 Sample cURL Commands

### Create Office (Admin)
```bash
curl -X POST http://localhost:3000/api/admin/offices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Test Office",
    "description": "Test office description for API testing",
    "type": "private_office",
    "location": {
      "address": "123 Test St",
      "city": "Miami",
      "state": "FL",
      "zipCode": "33101"
    },
    "capacity": 5,
    "area": 300,
    "dailyPrice": 200,
    "availability": {
      "monday": {"start": "09:00", "end": "18:00", "available": true},
      "tuesday": {"start": "09:00", "end": "18:00", "available": true},
      "wednesday": {"start": "09:00", "end": "18:00", "available": true},
      "thursday": {"start": "09:00", "end": "18:00", "available": true},
      "friday": {"start": "09:00", "end": "18:00", "available": true},
      "saturday": {"start": "00:00", "end": "00:00", "available": false},
      "sunday": {"start": "00:00", "end": "00:00", "available": false}
    },
    "images": []
  }'
```

### Create Booking (Provider)
```bash
curl -X POST http://localhost:3000/api/provider/office-bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PROVIDER_TOKEN" \
  -d '{
    "officeSpaceId": "OFFICE_UUID_HERE",
    "startDate": "2025-12-01T09:00:00Z",
    "endDate": "2025-12-05T17:00:00Z",
    "specialRequests": "Testing API"
  }'
```

---

**Status:** ✅ All 13 endpoints implemented and ready for testing!

