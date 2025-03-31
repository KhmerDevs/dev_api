import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { securityConfig } from './config/security.config';
import { CustomLogger } from './shared/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors(securityConfig.cors);
  app.use(compression());

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Start server
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}
bootstrap();
