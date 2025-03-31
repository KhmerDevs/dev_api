import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Course } from '../../entities/course.entity';
import { MailService } from '../../shared/mail.service';
import { EmailType } from '../../entities/email-log.entity';

@Injectable()
export class EmailAdminService {
  private readonly logger = new Logger(EmailAdminService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private mailService: MailService,
  ) {}

  async sendCourseAnnouncement(
    courseId: number,
    subject: string,
    message: string,
  ) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['enrollments', 'enrollments.user'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const emailPromises = course.enrollments.map(enrollment =>
      this.mailService.sendCustomEmail(
        enrollment.user.email,
        subject,
        message,
        {
          userId: enrollment.user.id,
          courseId: courseId,
          type: EmailType.GENERAL_ANNOUNCEMENT,
        }
      )
    );

    await Promise.all(emailPromises);
    return { message: 'Course announcement sent successfully' };
  }

  async sendGeneralAnnouncement(
    subject: string,
    message: string,
    options?: { role?: string }
  ) {
    const query = this.userRepository.createQueryBuilder('user');

    if (options?.role) {
      query.where('user.role = :role', { role: options.role });
    }

    const users = await query.getMany();

    const emailPromises = users.map(user =>
      this.mailService.sendCustomEmail(
        user.email,
        subject,
        message,
        {
          userId: user.id,
          type: EmailType.GENERAL_ANNOUNCEMENT,
        }
      )
    );

    await Promise.all(emailPromises);
    return { message: 'General announcement sent successfully' };
  }

  async sendCourseCompletionCongratulations(userId: number, courseId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const course = await this.courseRepository.findOne({ where: { id: courseId } });

    if (!user || !course) {
      throw new NotFoundException('User or course not found');
    }

    await this.mailService.sendCustomEmail(
      user.email,
      `Congratulations on Completing ${course.title}!`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2C3E50; text-align: center;">🎉 Congratulations, ${user.name}! 🎉</h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="font-size: 16px; line-height: 1.5;">
              You've successfully completed the course <strong>${course.title}</strong>!
            </p>
            
            <p style="font-size: 16px; line-height: 1.5;">
              Your dedication to learning and improving your skills is commendable.
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #666;">
            <p>Keep up the great work!</p>
            <p>The KhmerDev Team</p>
          </div>
        </div>
      `,
      {
        userId,
        courseId,
        type: EmailType.EXAM_COMPLETION,
      }
    );

    return { message: 'Congratulations email sent successfully' };
  }
} 