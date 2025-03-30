import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
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
} 