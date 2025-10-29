import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from '../prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'] // reduce Nest logs
  });

  // Configure body parser for larger payloads (Base64 images)
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

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
    'http://localhost:3000', // Frontend on port 3000
    'http://127.0.0.1:3000', // Frontend on port 3000
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
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'Origin', 
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods'
    ],
    credentials: true, // Allow cookies/auth headers
    preflightContinue: false,
    optionsSuccessStatus: 200
  });

  // Setup Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('STM Backend API')
    .setDescription('Service Provider Management System API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('admin-offices', 'Admin Office Management')
    .addTag('provider-offices', 'Provider Office Browsing')
    .addTag('admin-bookings', 'Admin Booking Management')
    .addTag('provider-bookings', 'Provider Booking Management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
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
