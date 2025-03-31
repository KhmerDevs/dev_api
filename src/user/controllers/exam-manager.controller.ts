import { Controller, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExamManagerService } from '../service/exam-manager.service';
import { SubmitExamDto } from '../dto/submit-exam.dto';

@Controller('exam-manager')
@UseGuards(JwtAuthGuard)
export class ExamManagerController {
  constructor(private readonly examManagerService: ExamManagerService) {}

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

    return this.examManagerService.validateAndSubmitExam(
      req.user.userId,
      courseId,
      examAttempt.id,
      submitExamDto.answers
    );
  }
} 