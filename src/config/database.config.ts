import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { User } from '../entities/user.entity';
import { CourseCategory } from '../entities/course_category.entity';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';
import { CodeExample } from '../entities/code-example.entity';
import { PracticeExercise } from '../entities/practice-exercise.entity';
import { QCM } from '../entities/qcm.entity';
import { Roadmap } from '../entities/roadmap.entity';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [
    User,
    CourseCategory,
    Course,
    Lesson,
    CodeExample,
    PracticeExercise,
    QCM,
    Roadmap
  ],
  synchronize: process.env.NODE_ENV !== 'production', // Only true in development
  ssl: process.env.DB_SSL === 'true',
  logging: process.env.DB_LOGGING === 'true',
  connectTimeoutMS: 30000, // Changed from connectTimeout to connectTimeoutMS
  maxQueryExecutionTime: 10000, // Log queries taking longer than 10 seconds
}; 