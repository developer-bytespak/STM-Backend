# Office Booking APIs - Postman Collection

## 🚀 Quick Setup

### 1. Import Collection
- Download the JSON file: `office-booking-apis.postman_collection.json`
- Import into Postman: `File > Import > Upload Files`

### 2. Set Environment Variables
Create a new environment with these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:8000` | Backend server URL |
| `admin_token` | `your_admin_jwt_token` | Admin JWT token |
| `provider_token` | `your_provider_jwt_token` | Provider JWT token |
| `office_id` | `office_uuid_here` | Office ID for testing |
| `booking_id` | `booking_uuid_here` | Booking ID for testing |

### 3. Authentication Setup
- **Admin APIs**: Use `{{admin_token}}` in Authorization header
- **Provider APIs**: Use `{{provider_token}}` in Authorization header
- **Format**: `Bearer {{admin_token}}` or `Bearer {{provider_token}}`

---

## 📋 Collection Structure

### 🔐 Authentication
- **Login Admin** - Get admin JWT token
- **Login Provider** - Get provider JWT token

### 🏢 Admin Office Management (5 APIs)
- **Create Office** - POST `/admin/offices`
- **List All Offices** - GET `/admin/offices`
- **Get Office Details** - GET `/admin/offices/:id`
- **Update Office** - PUT `/admin/offices/:id`
- **Delete Office** - DELETE `/admin/offices/:id`

### 👥 Provider Office Browsing (2 APIs)
- **Browse Available Offices** - GET `/provider/offices`
- **Get Office Details** - GET `/provider/offices/:id`

### 📅 Admin Booking Management (3 APIs)
- **List All Bookings** - GET `/admin/bookings`
- **Confirm Booking** - PUT `/admin/bookings/:id/confirm`
- **Complete Booking** - PUT `/admin/bookings/:id/complete`

### 📝 Provider Booking Management (3 APIs)
- **Create Booking** - POST `/provider/bookings`
- **List My Bookings** - GET `/provider/bookings`
- **Get Booking Details** - GET `/provider/bookings/:id`

---

## 🔧 API Details

### 1. Create Office (Admin)
```http
POST {{base_url}}/admin/offices
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name": "Premium Office Space",
  "description": "Modern office with great amenities",
  "type": "private_office",
  "location": {
    "address": "123 Business St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "capacity": 10,
  "area": 1200,
  "dailyPrice": 150.00,
  "availability": {
    "monday": {"start": "09:00", "end": "18:00"},
    "tuesday": {"start": "09:00", "end": "18:00"},
    "wednesday": {"start": "09:00", "end": "18:00"},
    "thursday": {"start": "09:00", "end": "18:00"},
    "friday": {"start": "09:00", "end": "18:00"}
  },
  "images": [
    "https://example.com/office1.jpg",
    "https://example.com/office2.jpg"
  ]
}
```

### 2. List All Offices (Admin)
```http
GET {{base_url}}/admin/offices
Authorization: Bearer {{admin_token}}
```

### 3. Get Office Details (Admin)
```http
GET {{base_url}}/admin/offices/{{office_id}}
Authorization: Bearer {{admin_token}}
```

### 4. Update Office (Admin)
```http
PUT {{base_url}}/admin/offices/{{office_id}}
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name": "Updated Office Name",
  "description": "Updated description",
  "dailyPrice": 175.00,
  "status": "available"
}
```

### 5. Delete Office (Admin)
```http
DELETE {{base_url}}/admin/offices/{{office_id}}
Authorization: Bearer {{admin_token}}
```

### 6. Browse Available Offices (Provider)
```http
GET {{base_url}}/provider/offices
Authorization: Bearer {{provider_token}}
```

### 7. Get Office Details (Provider)
```http
GET {{base_url}}/provider/offices/{{office_id}}
Authorization: Bearer {{provider_token}}
```

### 8. List All Bookings (Admin)
```http
GET {{base_url}}/admin/bookings
Authorization: Bearer {{admin_token}}
```

### 9. Confirm Booking (Admin)
```http
PUT {{base_url}}/admin/bookings/{{booking_id}}/confirm
Authorization: Bearer {{admin_token}}
```

### 10. Complete Booking (Admin)
```http
PUT {{base_url}}/admin/bookings/{{booking_id}}/complete
Authorization: Bearer {{admin_token}}
```

### 11. Create Booking (Provider)
```http
POST {{base_url}}/provider/bookings
Authorization: Bearer {{provider_token}}
Content-Type: application/json

{
  "officeSpaceId": "{{office_id}}",
  "startDate": "2024-01-15T09:00:00Z",
  "endDate": "2024-01-15T18:00:00Z",
  "specialRequests": "Need parking space"
}
```

### 12. List My Bookings (Provider)
```http
GET {{base_url}}/provider/bookings
Authorization: Bearer {{provider_token}}
```

### 13. Get Booking Details (Provider)
```http
GET {{base_url}}/provider/bookings/{{booking_id}}
Authorization: Bearer {{provider_token}}
```

---

## 🧪 Testing Workflow

### Step 1: Get Authentication Tokens
1. Run **Login Admin** to get admin token
2. Run **Login Provider** to get provider token
3. Set tokens in environment variables

### Step 2: Test Admin Office Management
1. **Create Office** - Create a new office
2. **List All Offices** - Verify office appears
3. **Get Office Details** - Check office details
4. **Update Office** - Modify office information
5. **Delete Office** - Remove office (optional)

### Step 3: Test Provider Office Browsing
1. **Browse Available Offices** - See available offices
2. **Get Office Details** - View specific office details

### Step 4: Test Booking Flow
1. **Create Booking** (Provider) - Book an office
2. **List All Bookings** (Admin) - See all bookings
3. **Confirm Booking** (Admin) - Approve booking
4. **List My Bookings** (Provider) - Check booking status
5. **Complete Booking** (Admin) - Mark as completed

---

## 📊 Expected Responses

### Success Responses
- **200 OK**: Successful GET/PUT operations
- **201 Created**: Successful POST operations
- **204 No Content**: Successful DELETE operations

### Error Responses
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Business rule violation

---

## 🔍 Troubleshooting

### Common Issues
1. **401 Unauthorized**: Check if token is valid and properly formatted
2. **403 Forbidden**: Verify user has correct role (admin/provider)
3. **404 Not Found**: Ensure office/booking ID exists
4. **400 Bad Request**: Check request body format and required fields

### Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Date Format
```
ISO 8601: 2024-01-15T09:00:00Z
```

---

## 📁 Collection Files

1. **office-booking-apis.postman_collection.json** - Main collection
2. **office-booking-environment.postman_environment.json** - Environment template
3. **office-booking-tests.postman_collection.json** - Automated tests

---

## 🚀 Quick Start Commands

### Start Backend Server
```bash
cd STM-Backend
npm run start:dev
```

### Access Swagger Documentation
```
http://localhost:8000/api/docs
```

### Test Collection
1. Import collection into Postman
2. Set environment variables
3. Run collection tests
4. Verify all APIs work correctly

---

**🎉 You're all set! Import the collection and start testing your office booking APIs!**
