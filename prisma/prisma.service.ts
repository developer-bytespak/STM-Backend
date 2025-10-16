// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Build database URL with PgBouncer parameters
    const databaseUrl = process.env.DATABASE_URL || '';
    const separator = databaseUrl.includes('?') ? '&' : '?';
    const connectionString = `${databaseUrl}${separator}pgbouncer=true&statement_cache_size=0&connection_limit=8&pool_timeout=10`;

    super({
      log: ['error'], // keep Prisma logs minimal
      // Fix for PgBouncer transaction pooling (port 6543)
      // - Disables prepared statements (don't work in transaction mode)
      // - Limits connection pool to 8 (Supabase transaction pooler limit is 9)
      // - Leaves 1 connection as buffer for overhead
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}