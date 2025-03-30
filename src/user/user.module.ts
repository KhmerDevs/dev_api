import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { EnrollmentService } from './service/enrollment.service';
import { CourseProgressService } from './service/course-progress.service';
import { ExamService } from './service/exam.service';
import { LessonService } from './service/lesson.service';
import { RoadmapService } from './service/roadmap.service';
import { CertificateService } from './service/certificate.service';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { QCM } from '../entities/qcm.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { Lesson } from '../entities/lesson.entity';
import { PracticeExercise } from '../entities/practice-exercise.entity';
import { LessonCompletion } from '../entities/lesson-completion.entity';
import { PracticeExerciseAttempt } from '../entities/practice-exercise-attempt.entity';
import { UserActivity } from '../entities/user-activity.entity';
import { Roadmap } from '../entities/roadmap.entity';
import { Certificate } from '../entities/certificate.entity';
import { FirebaseStorageService } from '../shared/firebase-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, 
      Course, 
      QCM, 
      Enrollment, 
      ExamAttempt, 
      Lesson, 
      PracticeExercise,
      LessonCompletion,
      PracticeExerciseAttempt,
      UserActivity,
      Roadmap,
      Certificate,
    ]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    EnrollmentService,
    CourseProgressService,
    ExamService,
    LessonService,
    RoadmapService,
    CertificateService,
    FirebaseStorageService,
  ],
})
export class UserModule {} 