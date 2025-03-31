import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../shared/redis.service';
import { ExamAttemptStatus } from '../../entities/exam-attempt.entity';

@Injectable()
export class ExamSecurityService {
  private readonly logger = new Logger(ExamSecurityService.name);
  private readonly EXAM_LOCK_PREFIX = 'exam_lock:';
  private readonly EXAM_SESSION_PREFIX = 'exam_session:';

  constructor(private readonly redisService: RedisService) {}

  async validateAndLockExam(userId: number, courseId: number): Promise<boolean> {
    const lockKey = `${this.EXAM_LOCK_PREFIX}${userId}:${courseId}`;
    const sessionKey = `${this.EXAM_SESSION_PREFIX}${userId}:${courseId}`;

    const existingSession = await this.redisService.get(sessionKey);
    if (existingSession) {
      return false;
    }

    const locked = await this.redisService.set(lockKey, 'locked', 300);
    return locked;
  }

  async trackExamSession(userId: number, courseId: number, examAttemptId: number): Promise<void> {
    const sessionKey = `${this.EXAM_SESSION_PREFIX}${userId}:${courseId}`;
    await this.redisService.set(sessionKey, examAttemptId.toString(), 7200);
  }

  async validateExamSubmission(userId: number, courseId: number, examAttemptId: number): Promise<boolean> {
    const sessionKey = `${this.EXAM_SESSION_PREFIX}${userId}:${courseId}`;
    const storedAttemptId = await this.redisService.get(sessionKey);
    return storedAttemptId === examAttemptId.toString();
  }

  async clearExamSession(userId: number, courseId: number): Promise<void> {
    const sessionKey = `${this.EXAM_SESSION_PREFIX}${userId}:${courseId}`;
    const lockKey = `${this.EXAM_LOCK_PREFIX}${userId}:${courseId}`;
    
    await Promise.all([
      this.redisService.del(sessionKey),
      this.redisService.del(lockKey)
    ]);
  }
} 