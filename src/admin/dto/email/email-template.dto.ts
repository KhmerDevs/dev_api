import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export enum EmailType {
  EXAM_COMPLETION = 'exam_completion',
  COURSE_ENROLLMENT = 'course_enrollment',
  CERTIFICATE_ISSUED = 'certificate_issued',
  COURSE_ANNOUNCEMENT = 'course_announcement',
  GENERAL_ANNOUNCEMENT = 'general_announcement'
}

export class EmailTemplateDto {
  @IsNotEmpty()
  @IsEnum(EmailType)
  type: EmailType;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  template: string;

  @IsOptional()
  @IsString()
  description?: string;
} 