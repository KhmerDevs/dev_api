import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailLog, EmailStatus, EmailType } from '../entities/email-log.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT),
      secure: process.env.MAIL_PORT === '465',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    // Verify connection configuration
    this.transporter.verify()
      .then(() => this.logger.log('Mail service ready'))
      .catch(err => this.logger.error('Mail service configuration error:', err));
  }

  private async logEmail(options: {
    recipientEmail: string,
    subject: string,
    content: string,
    type: EmailType,
    userId?: number,
    courseId?: number,
  }) {
    try {
      const emailLog = this.emailLogRepository.create({
        recipientEmail: options.recipientEmail,
        subject: options.subject,
        content: options.content,
        type: options.type,
        status: EmailStatus.PENDING,
        recipientId: options.userId || null,
        relatedCourseId: options.courseId || null,
      });

      return await this.emailLogRepository.save(emailLog);
    } catch (error) {
      this.logger.error(`Failed to log email: ${error.message}`);
      // Don't throw here - we don't want to prevent email sending just because logging failed
      return null;
    }
  }

  private async updateEmailStatus(
    logId: number, 
    status: EmailStatus, 
    errorMessage?: string
  ) {
    await this.emailLogRepository.update(logId, {
      status,
      errorMessage,
      sentAt: status === EmailStatus.SENT ? new Date() : null,
    });
  }

  async sendVerificationEmail(email: string, verificationLink: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'default@example.com',
        to: email,
        subject: 'Verify Your Email',
        html: `
          <h1>Email Verification</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationLink}">Verify Email</a>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
      
      this.logger.log(`Verification email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'default@example.com',
        to: email,
        subject: 'Reset Your Password',
        html: `
          <h1>Password Reset</h1>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <a href="${resetLink}">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
      
      this.logger.log(`Password reset email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendCertificateEmail(email: string, certificateUrl: string, courseName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'default@example.com',
        to: email,
        subject: `Your Certificate for ${courseName}`,
        html: `
          <h1>Congratulations!</h1>
          <p>You have successfully completed the course "${courseName}".</p>
          <p>Your certificate is ready. Click the link below to download it:</p>
          <a href="${certificateUrl}">Download Certificate</a>
        `,
      });
      
      this.logger.log(`Certificate email sent successfully to ${email} for course ${courseName}`);
    } catch (error) {
      this.logger.error(`Failed to send certificate email to ${email}:`, error);
      throw new Error('Failed to send certificate email');
    }
  }

  async sendExamCompletionEmail(
    email: string, 
    userName: string,
    courseName: string,
    score: number,
    userId: number,
    courseId: number,
    certificateUrl?: string
  ): Promise<void> {
    const emailLog = await this.logEmail({
      recipientEmail: email,
      subject: `Congratulations on Passing ${courseName}!`,
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2C3E50; text-align: center;">🎉 Congratulations, ${userName}! 🎉</h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="font-size: 16px; line-height: 1.5;">
              We're excited to inform you that you've successfully passed the exam for 
              <strong>${courseName}</strong> with a score of <strong>${score}%</strong>!
            </p>
            
            <p style="font-size: 16px; line-height: 1.5;">
              This is a significant achievement and demonstrates your dedication to learning 
              and mastering new skills.
            </p>
          </div>

          ${certificateUrl ? `
            <div style="margin: 20px 0;">
              <p>🏆 As recognition of your achievement, we've prepared your certificate:</p>
              <a href="${certificateUrl}" 
                 style="background-color: #4CAF50; 
                        color: white; 
                        padding: 10px 20px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        display: inline-block;">
                Download Your Certificate
              </a>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; text-align: center; color: #666;">
            <p>Keep up the great work!</p>
            <p>The KhmerDev Team</p>
          </div>
        </div>
      `,
      type: EmailType.EXAM_COMPLETION,
      userId: userId,
      courseId: courseId,
    });

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'default@example.com',
        to: email,
        subject: `Congratulations on Passing ${courseName}!`,
        html: emailLog.content,
      });
      
      await this.updateEmailStatus(emailLog.id, EmailStatus.SENT);
      this.logger.log(`Exam completion email sent successfully to ${email}`);
    } catch (error) {
      await this.updateEmailStatus(emailLog.id, EmailStatus.FAILED, error.message);
      this.logger.error(`Failed to send exam completion email to ${email}:`, error);
      throw new Error('Failed to send exam completion email');
    }
  }

  async sendCustomEmail(
    email: string,
    subject: string,
    htmlContent: string,
    options?: {
      userId?: number;
      courseId?: number;
      type?: EmailType;
    }
  ): Promise<void> {
    const emailLog = await this.logEmail({
      recipientEmail: email,
      subject: subject,
      content: htmlContent,
      type: options?.type || EmailType.GENERAL_ANNOUNCEMENT,
      userId: options?.userId,
      courseId: options?.courseId,
    });

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'default@example.com',
        to: email,
        subject: subject,
        html: htmlContent,
      });
      
      if (emailLog) {
        await this.updateEmailStatus(emailLog.id, EmailStatus.SENT);
      }
      this.logger.log(`Custom email sent successfully to ${email}`);
    } catch (error) {
      if (emailLog) {
        await this.updateEmailStatus(emailLog.id, EmailStatus.FAILED, error.message);
      }
      this.logger.error(`Failed to send custom email to ${email}:`, error);
      throw new Error('Failed to send custom email');
    }
  }
}