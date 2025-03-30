import { Controller, Get, Res, Post, Body } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { MailService } from './shared/mail.service';

@Controller()
export class AppController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  serveIndex(@Res() res: Response) {
    res.sendFile(join(__dirname, '../index.html'));
  }

  @Post('test-mail')
  async testMail(@Body() body: { email: string }) {
    try {
      await this.mailService.sendVerificationEmail(
        body.email,
        'http://localhost:3000/verify'
      );
      return { message: 'Test email sent successfully' };
    } catch (error) {
      return { error: error.message };
    }
  }
}
