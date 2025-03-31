import { Injectable, Logger } from '@nestjs/common';
import { ExamService } from './exam.service';
import { EXAM_CONSTANTS } from '../../constants/app.constants';

@Injectable()
export class ExamManagerService {
  private readonly logger = new Logger(ExamManagerService.name);

  constructor(
    private readonly examService: ExamService,
  ) {}

  async validateAndStartExam(userId: number, courseId: number) {
    // Add validation logic here
    return this.examService.startExam(userId, courseId);
  }

  async validateAndSubmitExam(userId: number, courseId: number, examAttemptId: number, answers: { qcmId: number; answer: number }[]) {
    // Add validation logic here
    return this.examService.submitExam(userId, courseId, examAttemptId, answers);
  }

  async checkTimeRemaining(userId: number, courseId: number) {
    // Add validation logic here
    return this.examService.getExamTimeRemaining(userId, courseId);
  }

  async getActiveExamAttempt(userId: number, courseId: number) {
    return this.examService.getActiveExamAttempt(userId, courseId);
  }
} 