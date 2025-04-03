import { Controller, Post, Body, Param, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExamManagerService } from '../service/exam-manager.service';
import { SubmitExamDto } from '../dto/submit-exam.dto';

@Controller('exam-manager')
@UseGuards(JwtAuthGuard)
export class ExamManagerController {
  constructor(private readonly examManagerService: ExamManagerService) {}

  @Post('start/:courseId')
  async startExam(
    @Request() req,
    @Param('courseId') courseId: number
  ) {
    return this.examManagerService.validateAndStartExam(
      req.user.userId,
      courseId
    );
  }

  @Post('submit/:courseId')
  async submitExam(
    @Request() req,
    @Param('courseId') courseId: number,
    @Body() submitExamDto: SubmitExamDto
  ) {
    const examAttempt = await this.examManagerService.getActiveExamAttempt(
      req.user.userId,
      courseId
    );

    if (!examAttempt) {
      throw new ForbiddenException('No active exam attempt found. Please start an exam first.');
    }

    return this.examManagerService.validateAndSubmitExam(
      req.user.userId,
      courseId,
      examAttempt.id,
      submitExamDto.answers
    );
  }
} 