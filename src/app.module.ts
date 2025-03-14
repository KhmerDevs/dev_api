import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
        ExamAttempt
      ]
    }),
    AuthModule,
    AdminModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    FileUploadService,
    MailService,
    Logger,
  ],
  exports: [
    MailService,
  ]
})
export class AppModule {}
