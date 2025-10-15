import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from '../prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'] // reduce Nest logs
  });

  // Enable validation and transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Enable CORS for frontend
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://*.vercel.app', // Allow all Vercel deployments
    'https://stm-frontend.vercel.app', // Your specific Vercel domain
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          // Handle wildcard domains
          const pattern = allowedOrigin.replace('*', '.*');
          return new RegExp(pattern).test(origin);
        }
        return origin === allowedOrigin;
      })) {
        return callback(null, true);
      }
      
      // For development, also allow any localhost port
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
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
  console.log(`STM Backend running at port ${port}`);
}
bootstrap();
