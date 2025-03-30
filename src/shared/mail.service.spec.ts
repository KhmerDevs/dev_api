import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let mockTransporter: any;

  beforeEach(async () => {
    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
      }),
    };

    // Mock nodemailer.createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        Logger,
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const email = 'test@example.com';
      const verificationLink = 'http://example.com/verify';

      await service.sendVerificationEmail(email, verificationLink);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.MAIL_FROM || 'default@example.com',
        to: email,
        subject: 'Verify Your Email',
        html: expect.stringContaining(verificationLink),
      });
    });

    it('should handle email sending failure', async () => {
      const email = 'test@example.com';
      const verificationLink = 'http://example.com/verify';
      
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('Failed to send'));

      await expect(service.sendVerificationEmail(email, verificationLink))
        .rejects
        .toThrow('Failed to send verification email');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';
      const resetLink = 'http://example.com/reset';

      await service.sendPasswordResetEmail(email, resetLink);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.MAIL_FROM || 'default@example.com',
        to: email,
        subject: 'Reset Your Password',
        html: expect.stringContaining(resetLink),
      });
    });
  });

  describe('sendCertificateEmail', () => {
    it('should send certificate email successfully', async () => {
      const email = 'test@example.com';
      const certificateUrl = 'http://example.com/certificate.pdf';
      const courseName = 'Test Course';

      await service.sendCertificateEmail(email, certificateUrl, courseName);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.MAIL_FROM || 'default@example.com',
        to: email,
        subject: `Your Certificate for ${courseName}`,
        html: expect.stringContaining(certificateUrl),
      });
    });
  });
}); 