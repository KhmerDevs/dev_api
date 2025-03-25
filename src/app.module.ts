import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { UserModule } from './user/user.module';
import { FileUploadService } from './shared/file-upload.service';
import { MailService } from './shared/mail.service';
import { User } from './entities/user.entity';
import { CourseCategory } from './entities/course_category.entity';
import { Course } from './entities/course.entity';
import { Lesson } from './entities/lesson.entity';
import { CodeExample } from './entities/code-example.entity';
import { PracticeExercise } from './entities/practice-exercise.entity';
import { QCM } from './entities/qcm.entity';
import { Roadmap } from './entities/roadmap.entity';
import { Enrollment } from './entities/enrollment.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { LessonCompletion } from './entities/lesson-completion.entity';
import { PracticeExerciseAttempt } from './entities/practice-exercise-attempt.entity';
import { UserActivity } from './entities/user-activity.entity';
import { DatabaseSeederService } from './shared/database-seeder.service';
import { Certificate } from './entities/certificate.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...databaseConfig,
      entities: [
        User, 
        CourseCategory, 
        Course, 
        Lesson, 
        CodeExample, 
        PracticeExercise,
        QCM,
        Roadmap,
        Enrollment,
        ExamAttempt,
        LessonCompletion,
        PracticeExerciseAttempt,
        UserActivity,
        Certificate
      ],
      synchronize: process.env.NODE_ENV !== 'production', // Re-enable synchronization
    }),
    AuthModule,
    AdminModule,
    UserModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AppController],
  providers: [
    FileUploadService,
    MailService,
    Logger,
    DatabaseSeederService,
  ],
  exports: [
    MailService,
  ]
})
export class AppModule implements OnModuleInit {
  private logger = new Logger('AppModule');

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      // Update any NULL orderIndex values to 0
      await this.dataSource.query(`
        UPDATE practice_exercises 
        SET "orderIndex" = 0 
        WHERE "orderIndex" IS NULL
      `);
      
      this.logger.log('Successfully updated NULL orderIndex values to 0');
      
      // Now we can set the column to NOT NULL with a default value
      await this.dataSource.query(`
        ALTER TABLE practice_exercises 
        ALTER COLUMN "orderIndex" SET DEFAULT 0,
        ALTER COLUMN "orderIndex" SET NOT NULL
      `);
      
      this.logger.log('Successfully altered orderIndex column constraints');
    } catch (error) {
      this.logger.error(`Failed to update practice_exercises table: ${error.message}`);
    }
  }
}
