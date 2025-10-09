import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from '../prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'] // reduce Nest logs
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow frontend origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // Allow cookies/auth headers
  });

  // Enable graceful shutdown via Prisma
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  // Global request timeout ~12s to avoid long-hanging requests
  app.getHttpAdapter().getInstance().setTimeout?.(12000);

  const port = process.env.PORT ? Number(process.env.PORT) : 8000;
  await app.listen(port);
  // Use console to ensure message appears even with reduced Nest logger levels
  // eslint-disable-next-line no-console
  console.log('STM Backend running at port  http://localhost:8000');
}
bootstrap();
