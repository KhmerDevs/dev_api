import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { QCM } from '../entities/qcm.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Course, QCM, Enrollment, ExamAttempt]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {} 