import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..'));
  
  try {
    await app.listen(process.env.PORT);
    Logger.log(`Application is running on port ${process.env.PORT}`);
    Logger.log('Database connection established successfully');
  } catch (error) {
    Logger.error('Error starting the application:', error);
  }
}
bootstrap();
