import { IsNumber, IsOptional, Min } from 'class-validator';

export class MarkLessonViewedDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  timeSpentSeconds?: number;
} 