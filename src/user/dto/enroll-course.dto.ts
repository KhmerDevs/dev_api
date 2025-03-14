import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class EnrollCourseDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Course ID must be positive' })
  courseId: number;
} 