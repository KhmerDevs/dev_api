import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EmailLog, EmailStatus, EmailType } from '../../entities/email-log.entity';

@Injectable()
export class EmailMonitoringService {
  private readonly logger = new Logger(EmailMonitoringService.name);

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
  ) {}

  async getEmailLogs(options: {
    status?: EmailStatus;
    type?: EmailType;
    startDate?: Date;
    endDate?: Date;
    courseId?: number;
    page?: number;
    limit?: number;
  }) {
    const query = this.emailLogRepository.createQueryBuilder('emailLog')
      .leftJoinAndSelect('emailLog.recipient', 'recipient')
      .orderBy('emailLog.createdAt', 'DESC');

    if (options.status) {
      query.andWhere('emailLog.status = :status', { status: options.status });
    }

    if (options.type) {
      query.andWhere('emailLog.type = :type', { type: options.type });
    }

    if (options.startDate && options.endDate) {
      query.andWhere('emailLog.createdAt BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    }

    if (options.courseId) {
      query.andWhere('emailLog.relatedCourseId = :courseId', { courseId: options.courseId });
    }

    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [logs, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getEmailStats(days?: number) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Only subtract days if a valid number is provided
      if (days && !isNaN(days)) {
        startDate.setDate(startDate.getDate() - days);
      } else {
        // Default to last 30 days if no valid days parameter
        startDate.setDate(startDate.getDate() - 30);
      }

      // Use Date objects directly with Between operator
      const totalSent = await this.emailLogRepository.count({
        where: {
          status: EmailStatus.SENT,
          createdAt: Between(startDate, endDate),
        },
      });

      const totalFailed = await this.emailLogRepository.count({
        where: {
          status: EmailStatus.FAILED,
          createdAt: Between(startDate, endDate),
        },
      });

      const byType = await this.emailLogRepository
        .createQueryBuilder('emailLog')
        .select('emailLog.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('emailLog.createdAt BETWEEN :startDate AND :endDate', {
          startDate: startDate,
          endDate: endDate,
        })
        .groupBy('emailLog.type')
        .getRawMany();

      return {
        totalSent,
        totalFailed,
        byType,
        period: {
          start: startDate.toISOString(), // Convert to ISO string only for response
          end: endDate.toISOString(),     // Convert to ISO string only for response
        },
      };
    } catch (error) {
      this.logger.error(`Error getting email stats: ${error.message}`);
      throw new Error('Failed to retrieve email statistics');
    }
  }

  async getFailedEmails() {
    return this.emailLogRepository.find({
      where: { status: EmailStatus.FAILED },
      relations: ['recipient'],
      order: { createdAt: 'DESC' },
    });
  }
} 