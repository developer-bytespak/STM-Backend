# ✅ Admin Provider Management Endpoints

**Created:** October 8, 2025  
**Endpoints:** `GET /admin/providers` and `GET /admin/providers/:id`

---

## 🎯 Overview

Two powerful endpoints for managing service providers from the admin dashboard.

---

## 1️⃣ GET /admin/providers

Get all service providers with advanced filtering, search, and pagination.

### **URL**
```
GET http://localhost:8000/admin/providers
```

### **Authentication**
- Required: Yes
- Role: Admin only
- Header: `Authorization: Bearer {adminToken}`

### **Query Parameters**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `search` | string | No | Search by business name, owner name, or email | `ABC Plumbing` |
| `region` | string | No | Filter by LSM region | `New York` |
| `status` | string | No | Filter by status: `pending`, `active`, `inactive`, `banned` | `active` |
| `minRating` | number | No | Minimum rating filter | `4.0` |
| `maxRating` | number | No | Maximum rating filter | `5.0` |
| `page` | number | No | Page number (default: 1) | `1` |
| `limit` | number | No | Items per page (default: 20) | `20` |
| `sortBy` | string | No | Sort field (default: `created_at`) | `rating` |
| `sortOrder` | string | No | Sort order: `asc` or `desc` (default: `desc`) | `desc` |

### **Example Requests**

#### Get all active providers
```http
GET http://localhost:8000/admin/providers?status=active
Authorization: Bearer {adminToken}
```

#### Search providers
```http
GET http://localhost:8000/admin/providers?search=ABC
Authorization: Bearer {adminToken}
```

#### Filter by region and rating
```http
GET http://localhost:8000/admin/providers?region=New%20York&minRating=4.5
Authorization: Bearer {adminToken}
```

#### Paginated results
```http
GET http://localhost:8000/admin/providers?page=2&limit=10
Authorization: Bearer {adminToken}
```

#### Sort by rating
```http
GET http://localhost:8000/admin/providers?sortBy=rating&sortOrder=desc
Authorization: Bearer {adminToken}
```

### **Response (200)**

```json
{
  "data": [
    {
      "id": 1,
      "businessName": "ABC Plumbing Services",
      "owner": {
        "id": 3,
        "name": "John Plumber",
        "email": "john.plumber@stm.com",
        "phoneNumber": "+11234567892"
      },
      "status": "active",
      "rating": 4.8,
      "location": "New York, NY",
      "zipcode": "10001",
      "experience": 5,
      "tier": "Gold",
      "totalJobs": 156,
      "activeServices": 3,
      "documentsCount": 2,
      "lsm": {
        "id": 1,
        "name": "Lisa Manager",
        "region": "New York"
      },
      "earnings": 45678.50,
      "warnings": 0,
      "lastLogin": "2025-10-08T10:00:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "businessName": "XYZ Electric",
      "owner": {
        "id": 5,
        "name": "Jane Electrician",
        "email": "jane@xyz.com",
        "phoneNumber": "+11234567893"
      },
      "status": "pending",
      "rating": 0.0,
      "location": "Los Angeles, CA",
      "zipcode": "90001",
      "experience": 3,
      "tier": "Bronze",
      "totalJobs": 0,
      "activeServices": 0,
      "documentsCount": 1,
      "lsm": {
        "id": 2,
        "name": "Bob Manager",
        "region": "Los Angeles"
      },
      "earnings": 0.00,
      "warnings": 0,
      "lastLogin": null,
      "createdAt": "2025-10-07T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### **Use Cases**

1. **Provider List Table**
   - Display all providers in a data table
   - Filter by status (show only active)
   - Search by name or business

2. **Provider Management Dashboard**
   - See all pending providers needing approval
   - Monitor providers by region
   - Track high-performing providers (rating > 4.5)

3. **Regional Analysis**
   - Filter providers by LSM region
   - Compare provider distribution

4. **Performance Tracking**
   - Sort by rating to find top performers
   - Filter low-rated providers for review

---

## 2️⃣ GET /admin/providers/:id

Get detailed information about a specific provider with comprehensive statistics.

### **URL**
```
GET http://localhost:8000/admin/providers/:id
```

### **Authentication**
- Required: Yes
- Role: Admin only
- Header: `Authorization: Bearer {adminToken}`

### **Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Provider ID |

### **Example Request**

```http
GET http://localhost:8000/admin/providers/1
Authorization: Bearer {adminToken}
```

### **Response (200)**

```json
{
  "id": 1,
  "businessName": "ABC Plumbing Services",
  "owner": {
    "id": 3,
    "name": "John Plumber",
    "email": "john.plumber@stm.com",
    "phoneNumber": "+11234567892",
    "isEmailVerified": true,
    "lastLogin": "2025-10-08T10:00:00.000Z",
    "joinedAt": "2025-01-01T00:00:00.000Z"
  },
  "status": "active",
  "rating": 4.8,
  "location": "New York, NY",
  "zipcode": "10001",
  "experience": 5,
  "experienceLevel": "5 years",
  "description": "Professional plumbing services",
  "tier": "Gold",
  "minPrice": 50.00,
  "maxPrice": 500.00,
  "earnings": 45678.50,
  "warnings": 0,
  "rejectionReason": null,
  "approvedAt": "2025-01-05T00:00:00.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-10-08T00:00:00.000Z",
  "lsm": {
    "id": 1,
    "name": "Lisa Manager",
    "email": "lsm.newyork@stm.com",
    "region": "New York"
  },
  "statistics": {
    "totalJobs": 156,
    "completedJobs": 145,
    "cancelledJobs": 8,
    "activeJobs": 3,
    "totalRevenue": 45678.50,
    "averageJobValue": 315.02,
    "averageRating": 4.8,
    "totalReviews": 145
  },
  "services": [
    {
      "id": 1,
      "name": "Toilet Clog",
      "category": "Plumber",
      "addedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Sink Repair",
      "category": "Plumber",
      "addedAt": "2025-01-02T00:00:00.000Z"
    },
    {
      "id": 3,
      "name": "Pipe Installation",
      "category": "Plumber",
      "addedAt": "2025-01-03T00:00:00.000Z"
    }
  ],
  "documents": [
    {
      "id": 1,
      "fileName": "business_license.pdf",
      "description": "Business License",
      "status": "verified",
      "verifiedAt": "2025-01-05T00:00:00.000Z",
      "uploadedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "fileName": "insurance.pdf",
      "description": "Insurance Certificate",
      "status": "verified",
      "verifiedAt": "2025-01-05T00:00:00.000Z",
      "uploadedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "recentJobs": [
    {
      "id": 156,
      "status": "completed",
      "service": "Toilet Clog",
      "category": "Plumber",
      "price": 150.00,
      "customer": "Jane Smith",
      "createdAt": "2025-10-08T00:00:00.000Z",
      "completedAt": "2025-10-08T14:00:00.000Z"
    },
    {
      "id": 155,
      "status": "completed",
      "service": "Sink Repair",
      "category": "Plumber",
      "price": 120.00,
      "customer": "John Doe",
      "createdAt": "2025-10-07T00:00:00.000Z",
      "completedAt": "2025-10-07T16:00:00.000Z"
    }
  ],
  "recentReviews": [
    {
      "id": 145,
      "rating": 5,
      "feedback": "Excellent service! Very professional.",
      "customer": "Jane Smith",
      "createdAt": "2025-10-08T15:00:00.000Z"
    },
    {
      "id": 144,
      "rating": 4,
      "feedback": "Good work, arrived on time.",
      "customer": "John Doe",
      "createdAt": "2025-10-07T17:00:00.000Z"
    }
  ]
}
```

### **Response (404)**

```json
{
  "statusCode": 404,
  "message": "Provider not found",
  "error": "Not Found"
}
```

### **Use Cases**

1. **Provider Details Page**
   - Complete provider profile
   - Performance metrics and statistics
   - Job history and reviews

2. **Provider Verification**
   - View all uploaded documents
   - Check verification status
   - Review LSM approval details

3. **Performance Analysis**
   - Total revenue and earnings
   - Job completion rate
   - Average rating and reviews
   - Customer feedback

4. **Service Management**
   - See which services provider offers
   - When services were added
   - Service performance

---

## 🎨 Frontend Integration Examples

### **Provider List Component**

```typescript
import { useState, useEffect } from 'react';

const ProvidersList = () => {
  const [providers, setProviders] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    region: 'all',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    fetchProviders();
  }, [filters]);

  const fetchProviders = async () => {
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.status !== 'all') queryParams.append('status', filters.status);
    if (filters.region !== 'all') queryParams.append('region', filters.region);
    queryParams.append('page', filters.page);
    queryParams.append('limit', filters.limit);

    const response = await fetch(
      `http://localhost:8000/admin/providers?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    setProviders(data.data);
  };

  return (
    <div>
      {/* Filters */}
      <div>
        <input 
          type="text"
          placeholder="Search providers..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
        
        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Business Name</th>
            <th>Owner</th>
            <th>Region</th>
            <th>Rating</th>
            <th>Jobs</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {providers.map(provider => (
            <tr key={provider.id}>
              <td>{provider.businessName}</td>
              <td>{provider.owner.name}</td>
              <td>{provider.lsm.region}</td>
              <td>{provider.rating}⭐</td>
              <td>{provider.totalJobs}</td>
              <td>
                <span className={`status-${provider.status}`}>
                  {provider.status}
                </span>
              </td>
              <td>
                <button onClick={() => viewProvider(provider.id)}>View</button>
                <button onClick={() => banProvider(provider.id)}>Ban</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### **Provider Details Component**

```typescript
const ProviderDetails = ({ providerId }) => {
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    fetchProviderDetails();
  }, [providerId]);

  const fetchProviderDetails = async () => {
    const response = await fetch(
      `http://localhost:8000/admin/providers/${providerId}`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }
    );

    const data = await response.json();
    setProvider(data);
  };

  if (!provider) return <div>Loading...</div>;

  return (
    <div>
      {/* Header */}
      <h1>{provider.businessName}</h1>
      <p>Owner: {provider.owner.name}</p>
      <p>Status: {provider.status}</p>

      {/* Statistics */}
      <div className="stats-grid">
        <StatCard label="Total Jobs" value={provider.statistics.totalJobs} />
        <StatCard label="Completed" value={provider.statistics.completedJobs} />
        <StatCard label="Revenue" value={`$${provider.statistics.totalRevenue}`} />
        <StatCard label="Rating" value={`${provider.statistics.averageRating}⭐`} />
      </div>

      {/* Services */}
      <section>
        <h2>Services Offered</h2>
        {provider.services.map(service => (
          <div key={service.id}>
            {service.name} - {service.category}
          </div>
        ))}
      </section>

      {/* Recent Jobs */}
      <section>
        <h2>Recent Jobs</h2>
        {provider.recentJobs.map(job => (
          <div key={job.id}>
            Job #{job.id} - {job.service} - ${job.price} - {job.status}
          </div>
        ))}
      </section>

      {/* Reviews */}
      <section>
        <h2>Recent Reviews</h2>
        {provider.recentReviews.map(review => (
          <div key={review.id}>
            <p>{review.rating}⭐ - {review.customer}</p>
            <p>{review.feedback}</p>
          </div>
        ))}
      </section>
    </div>
  );
};
```

---

## 🎯 Common Use Cases & Queries

### **Find pending providers**
```
GET /admin/providers?status=pending&page=1&limit=20
```

### **Find low-rated providers**
```
GET /admin/providers?maxRating=3&sortBy=rating&sortOrder=asc
```

### **Find top performers**
```
GET /admin/providers?minRating=4.5&sortBy=rating&sortOrder=desc
```

### **Search specific provider**
```
GET /admin/providers?search=ABC%20Plumbing
```

### **Providers by region**
```
GET /admin/providers?region=New%20York
```

### **Banned providers**
```
GET /admin/providers?status=banned
```

---

## ✅ Summary

### **What You Can Do Now:**

✅ **List all providers** with pagination  
✅ **Search** by business name, owner name, or email  
✅ **Filter** by region, status, and rating  
✅ **Sort** by any field (rating, jobs, created date)  
✅ **View detailed provider profile** with stats  
✅ **See provider performance** (jobs, revenue, ratings)  
✅ **Access job history** and recent reviews  
✅ **View documents** and verification status  
✅ **Monitor services** offered by each provider  

### **Ready for Dashboard:**
- Provider list page ✅
- Provider details page ✅
- Search & filter functionality ✅
- Performance analytics ✅
- Document verification oversight ✅

**Your admin dashboard can now fully manage providers!** 🎉

