import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendVerificationEmail(email: string, verificationLink: string): Promise<void> {
    // In a real application, you would integrate with a mail provider like SendGrid, Mailgun, etc.
    this.logger.log(`Sending verification email to ${email} with link: ${verificationLink}`);
    
    // For development, just log the verification link
    this.logger.log(`Verification link for ${email}: ${verificationLink}`);
  }
} 