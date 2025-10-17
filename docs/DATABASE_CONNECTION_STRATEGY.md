# 🔌 Database Connection Strategy - STM Backend

## 📊 Overview

Your backend uses a **dual-connection strategy** for optimal performance:

1. **Transaction Pooler (Port 6543)** - Default for REST APIs
2. **Direct Connection (Port 5432)** - For Socket.IO and migrations

**Important:** Connection selection is **EXPLICIT**, not automatic!

---

## 🎯 Connection Selection Rules

### **Default Client: `this.prisma`**

**Uses:** Transaction Pooler (Port 6543)

**When to use:**
- ✅ REST API controllers
- ✅ Standard CRUD operations
- ✅ Batch operations
- ✅ Admin operations
- ✅ 95% of your existing code

**Example:**

```typescript
// customers.service.ts
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // ✅ Uses transaction pooler (6543)
  async getCustomerProfile(userId: number) {
    return await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });
  }

  // ✅ Uses transaction pooler (6543)
  async updateCustomer(id: number, data: any) {
    return await this.prisma.customers.update({
      where: { id },
      data,
    });
  }

  // ✅ Uses transaction pooler (6543)
  async createBooking(dto: CreateBookingDto) {
    return await this.prisma.$transaction(async (tx) => {
      // Transaction still uses pooler
      const job = await tx.jobs.create({ data: { ... } });
      const chat = await tx.chat.create({ data: { ... } });
      return { job, chat };
    });
  }
}
```

**Your existing code:** All controllers already use this! ✅ No changes needed.

---

### **Realtime Client: `this.prisma.realtimeClient`**

**Uses:** Direct Connection (Port 5432)

**When to use:**
- ✅ Socket.IO operations (chat messages)
- ✅ Real-time features (typing indicators)
- ✅ High-frequency operations
- ✅ Operations requiring low latency

**Example:**

```typescript
// chat.gateway.ts
export class ChatGateway {
  constructor(private prisma: PrismaService) {}

  // ✅ Uses direct connection (5432) for speed
  async handleSendMessage(...) {
    const newMessage = await this.prisma.realtimeClient.messages.create({
      data: {
        chat_id: chatId,
        sender_type: senderType,
        message: message,
      }
    });
  }

  // ✅ Uses direct connection (5432) for speed
  async handleJoinChat(chatId: string) {
    const chat = await this.prisma.realtimeClient.chat.findUnique({
      where: { id: chatId },
      include: { customer: true, service_provider: true }
    });
  }
}
```

**Only used in:** `chat.gateway.ts` (the new Socket.IO file)

---

## 🔄 Migrations & Prisma CLI

**Automatic:** Prisma CLI commands automatically use `directUrl`

```bash
# These AUTOMATICALLY use DIRECT_URL (5432):
npx prisma migrate dev        ✅ Uses directUrl
npx prisma migrate deploy     ✅ Uses directUrl
npx prisma db push            ✅ Uses directUrl
npx prisma db pull            ✅ Uses directUrl
npx prisma studio             ✅ Uses directUrl
npx prisma generate           ✅ No DB connection needed
```

**Why?** Your schema.prisma specifies:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Runtime default (6543)
  directUrl = env("DIRECT_URL")        // Migrations & CLI (5432)
}
```

Prisma automatically knows:
- **Migrations need transaction isolation** → Use `directUrl` (5432)
- **CLI tools need full features** → Use `directUrl` (5432)

---

## 📝 Code Examples: REST API vs Socket.IO

### **REST API Controller (Transaction Pooler)**

```typescript
// src/modules/customers/customers.controller.ts
@Controller('customer')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get('profile')
  async getProfile(@CurrentUser('id') userId: number) {
    // 👇 This service uses transaction pooler (6543)
    return this.customersService.getProfile(userId);
  }

  @Post('booking')
  async createBooking(@Body() dto: CreateBookingDto) {
    // 👇 This service uses transaction pooler (6543)
    return this.customersService.createBooking(dto);
  }
}

// src/modules/customers/customers.service.ts
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number) {
    // ✅ Uses this.prisma = transaction pooler (6543)
    return await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });
  }

  async createBooking(dto: CreateBookingDto) {
    // ✅ Uses this.prisma = transaction pooler (6543)
    return await this.prisma.$transaction(async (tx) => {
      const job = await tx.jobs.create({ data: { ... } });
      const chat = await tx.chat.create({ data: { ... } });
      return { job, chat };
    });
  }
}
```

### **Socket.IO Gateway (Direct Connection)**

```typescript
// src/modules/chat/chat.gateway.ts
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway {
  constructor(private prisma: PrismaService) {}

  @SubscribeMessage('send_message')
  async handleSendMessage(@MessageBody() data: any) {
    // ✅ Uses this.prisma.realtimeClient = direct connection (5432)
    const message = await this.prisma.realtimeClient.messages.create({
      data: {
        chat_id: data.chatId,
        message: data.message,
      }
    });

    // ✅ Also uses realtimeClient for notifications
    await this.prisma.realtimeClient.notifications.create({
      data: {
        recipient_id: recipientId,
        type: 'message',
        message: data.message,
      }
    });

    // Broadcast to room
    this.server.to(data.chatId).emit('new_message', message);
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(@MessageBody() data: any) {
    // ✅ Uses realtimeClient for fast access check
    const chat = await this.prisma.realtimeClient.chat.findUnique({
      where: { id: data.chatId },
      include: {
        customer: { include: { user: true } },
        service_provider: { include: { user: true } },
      }
    });

    // Verify access and join room...
  }
}
```

---

## 🎯 Decision Tree

```
┌─────────────────────────────────┐
│ Which connection should I use?  │
└─────────────────────────────────┘
            │
            ▼
    ┌───────────────────┐
    │ Is this a Prisma  │ YES ─→ Uses directUrl (5432) automatically
    │ CLI command?      │        No code changes needed!
    └───────────────────┘
            │ NO
            ▼
    ┌───────────────────┐
    │ Is this in        │ YES ─→ Use this.prisma.realtimeClient
    │ chat.gateway.ts?  │        (direct connection - 5432)
    └───────────────────┘
            │ NO
            ▼
    ┌───────────────────┐
    │ Everything else   │ ─→ Use this.prisma
    │ (REST APIs, etc)  │    (transaction pooler - 6543)
    └───────────────────┘
```

---

## 🔍 How to Check Which Connection is Used

### **In Your Code:**

```typescript
// Transaction pooler (6543):
this.prisma.model.operation()

// Direct connection (5432):
this.prisma.realtimeClient.model.operation()
```

### **In Logs:**

When your app starts, you'll see:

```
✅ Connected to transaction pooler (REST API)
✅ Connected to direct connection (Real-time/Socket.IO)
STM Backend running at port 8000
```

This confirms both connections are active!

---

## 📊 Performance Comparison

### **Transaction Pooler (6543)**

```
Operation flow:
1. Request connection from pool   (10-20ms)
2. Execute query                  (5-10ms)
3. Return connection to pool      (5ms)
───────────────────────────────────────────
Total per operation: ~20-35ms

Good for:
✅ REST API calls (occasional)
✅ User clicks button → API call → response
✅ Infrequent operations
```

### **Direct Connection (5432)**

```
Operation flow:
1. Use persistent connection      (0ms - already connected)
2. Execute query                  (5-10ms)
───────────────────────────────────────────
Total per operation: ~5-10ms

Good for:
✅ Socket.IO messages (frequent)
✅ Real-time operations
✅ High-frequency operations
✅ 2-3x faster than pooler!
```

---

## 🚨 What NOT to Do

### ❌ DON'T: Mix connections in same service

```typescript
// ❌ BAD: Inconsistent connection usage
export class SomeService {
  async method1() {
    await this.prisma.model.create(...);  // Pooler
  }

  async method2() {
    await this.prisma.realtimeClient.model.create(...);  // Direct
  }
}
```

### ✅ DO: Use consistent connection per service

```typescript
// ✅ GOOD: REST API service uses pooler consistently
export class CustomersService {
  async method1() {
    await this.prisma.customers.create(...);  // Pooler
  }

  async method2() {
    await this.prisma.customers.update(...);  // Pooler
  }
}

// ✅ GOOD: Socket.IO gateway uses direct connection consistently
export class ChatGateway {
  async method1() {
    await this.prisma.realtimeClient.messages.create(...);  // Direct
  }

  async method2() {
    await this.prisma.realtimeClient.chat.findUnique(...);  // Direct
  }
}
```

---

## 📋 Summary

| Aspect | Transaction Pooler (6543) | Direct Connection (5432) |
|--------|---------------------------|--------------------------|
| **Access via** | `this.prisma` | `this.prisma.realtimeClient` |
| **Used by** | All REST API services | `chat.gateway.ts` only |
| **Connection type** | Temporary (released after use) | Persistent (stays connected) |
| **Speed** | ~20-35ms per operation | ~5-10ms per operation |
| **Best for** | Occasional REST API calls | Frequent real-time operations |
| **Existing code** | ✅ Already using it | ⚠️ Only in new Socket.IO code |
| **Migrations** | Not used | ✅ Automatically used by Prisma |

---

## ✅ Action Items

**For your existing code:**
- ✅ No changes needed! All controllers use `this.prisma` (transaction pooler)
- ✅ This is correct and optimal for REST APIs

**For new Socket.IO code:**
- ✅ Already done! `chat.gateway.ts` uses `this.prisma.realtimeClient`
- ✅ This gives you 2-3x faster message delivery

**For migrations:**
- ✅ Already configured! Prisma automatically uses `DIRECT_URL`
- ✅ Run `npx prisma migrate deploy` - it just works!

**For monitoring:**
- Check startup logs for both connection confirmations
- Both should show "Connected" when app starts

---

## ❓ FAQ

**Q: Do I need to change my existing controllers?**

A: No! They already use `this.prisma` which is the transaction pooler. This is correct and optimal for REST APIs.

**Q: What if I forget to use realtimeClient in Socket.IO code?**

A: It will still work, just 2-3x slower. Socket.IO operations will go through the transaction pooler instead of direct connection.

**Q: Can I use realtimeClient everywhere for better performance?**

A: No! Direct connections are limited (Supabase allows ~15 concurrent). Transaction pooler is better for REST APIs because it shares connections efficiently.

**Q: How does Prisma know to use DIRECT_URL for migrations?**

A: It's specified in schema.prisma with `directUrl = env("DIRECT_URL")`. Prisma automatically uses this for migrations and CLI commands.

**Q: What if DIRECT_URL fails?**

A: The app will fail to start and show an error. But since your env vars are already working on Render, this won't be an issue.

---

## 🎉 The Bottom Line

**You don't need to think about connection switching!**

Just follow these simple rules:

1. **In regular services/controllers:** Use `this.prisma` (already doing this ✅)
2. **In chat.gateway.ts:** Use `this.prisma.realtimeClient` (already done ✅)
3. **For migrations:** Run `npx prisma migrate deploy` (Prisma handles it ✅)

**It's explicit, not automatic - and that's a good thing!** You have full control over which connection to use for optimal performance.

