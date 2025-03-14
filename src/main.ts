import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  
  // Set security HTTP headers
  app.use(helmet());
  
  // Enable CORS with appropriate restrictions
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });
  
  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
    }),
  );
  
  // Registration rate limiter - stricter than general API limits
  const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registrations per hour per IP
    message: 'Too many registration attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Apply to registration routes
  app.use('/auth/register', registrationLimiter);
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // Serve static files securely
  app.useStaticAssets(join(__dirname, '..'), {
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
    },
  });
  
  try {
    await app.listen(process.env.PORT || 3000);
    Logger.log(`Application is running on port ${process.env.PORT || 3000}`);
    Logger.log('Database connection established successfully');
  } catch (error) {
    Logger.error('Error starting the application:', error);
    process.exit(1);
  }
}
bootstrap();
