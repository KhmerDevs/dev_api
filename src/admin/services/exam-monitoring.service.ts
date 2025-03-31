import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamAttempt } from '../../entities/exam-attempt.entity';
import { RedisService } from '../../shared/redis.service';
import { ExamAttemptStatus } from '../../entities/exam-attempt.entity';

@Injectable()
export class ExamMonitoringService {
  private readonly logger = new Logger(ExamMonitoringService.name);

  constructor(
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
    private redisService: RedisService
  ) {}

  async detectSuspiciousActivity(userId: number, courseId: number): Promise<boolean> {
    // Implement suspicious activity detection
    const attempts = await this.examAttemptRepository.find({
      where: { userId, courseId },
      order: { createdAt: 'DESC' },
      take: 5
    });

    // Check for rapid attempts
    if (this.isRapidAttempts(attempts)) {
      await this.flagSuspiciousActivity(userId, courseId);
      return true;
    }

    return false;
  }

  private isRapidAttempts(attempts: ExamAttempt[]): boolean {
    // Implement logic to detect rapid attempts
    if (attempts.length < 2) return false;

    const timeThreshold = 5 * 60 * 1000; // 5 minutes
    for (let i = 1; i < attempts.length; i++) {
      const timeDiff = attempts[i-1].createdAt.getTime() - attempts[i].createdAt.getTime();
      if (timeDiff < timeThreshold) {
        return true;
      }
    }
    return false;
  }

  private async flagSuspiciousActivity(userId: number, courseId: number): Promise<void> {
    const key = `suspicious_activity:${userId}:${courseId}`;
    await this.redisService.set(key, 'true', 86400);
    
    this.logger.warn(`Suspicious exam activity detected for user ${userId} in course ${courseId}`);
    
    // Fix the status update by using enum
    await this.examAttemptRepository.update(
      { userId, courseId },
      { status: ExamAttemptStatus.FLAGGED }
    );
  }
} 