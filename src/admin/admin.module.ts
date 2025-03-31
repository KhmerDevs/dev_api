import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserAdminService } from './service/user-admin.service';
import { CategoryAdminService } from './service/category-admin.service';
import { CourseAdminService } from './service/course-admin.service';
import { LessonAdminService } from './service/lesson-admin.service';
import { ExamAdminService } from './service/exam-admin.service';
import { RoadmapAdminService } from './service/roadmap-admin.service';
import { User } from '../entities/user.entity';
import { CourseCategory } from '../entities/course_category.entity';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';
import { CodeExample } from '../entities/code-example.entity';
import { PracticeExercise } from '../entities/practice-exercise.entity';
import { QCM } from '../entities/qcm.entity';
import { Roadmap } from '../entities/roadmap.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { FileUploadService } from '../shared/file-upload.service';
import { EmailAdminService } from './service/email-admin.service';
import { MailService } from '../shared/mail.service';
import { EmailLog } from '../entities/email-log.entity';
import { EmailMonitoringService } from './service/email-monitoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, 
      CourseCategory,
      Course,
      Lesson,
      CodeExample,
      PracticeExercise,
      QCM,
      Roadmap,
      ExamAttempt,
      EmailLog,
    ]),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    UserAdminService,
    CategoryAdminService,
    CourseAdminService,
    LessonAdminService,
    ExamAdminService,
    RoadmapAdminService,
    FileUploadService,
    EmailAdminService,
    MailService,
    EmailMonitoringService
  ],
})
export class AdminModule {} 