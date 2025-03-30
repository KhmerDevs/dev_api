import { IsNumber, IsPositive } from 'class-validator';

export class StartExamDto {
  @IsNumber()
  @IsPositive()
  courseId: number;
} 