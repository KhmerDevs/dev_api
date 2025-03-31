import { Controller, UseGuards, Post, Body, Param } from '@nestjs/common';
import { ExamService } from '../service/exam.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExamRateLimitGuard } from '../guards/exam-rate-limit.guard';
import { Throttle } from '@nestjs/throttler';
import { User } from '../../auth/decorators/user.decorator';
import { SubmitExamDto } from '../dto/submit-exam.dto';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private examService: ExamService) {}

  @Post('start/:courseId')
  @UseGuards(ExamRateLimitGuard)
  @Throttle({ default: { ttl: 3600, limit: 3 } }) // Fix throttle syntax
  async startExam(@Param('courseId') courseId: number, @User() user) {
    return this.examService.startExam(user.id, courseId);
  }

  @Post('submit/:courseId/:attemptId')
  @UseGuards(ExamRateLimitGuard)
  async submitExam(
    @Param('courseId') courseId: number,
    @Param('attemptId') attemptId: number,
    @Body() submitExamDto: SubmitExamDto,
    @User() user
  ) {
    return this.examService.submitExam(
      user.id, 
      courseId, 
      attemptId, 
      submitExamDto.answers
    );
  }
} 