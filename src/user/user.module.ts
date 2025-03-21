import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
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
      UserActivity
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {} 