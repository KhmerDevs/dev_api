import { IsString, IsArray, IsNumber, Min, ArrayMinSize, MaxLength, ArrayMaxSize, IsOptional } from 'class-validator';

export class CreateQcmDto {
  @IsString()
  @MaxLength(1000)
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  options: string[];

  @IsNumber()
  @Min(0)
  correctAnswer: number;

  @IsNumber()
  @Min(1, { message: 'Course ID must be positive' })
  courseId: number;
  
  @IsNumber()
  @IsOptional()
  orderIndex?: number;

  @IsNumber()
  @IsOptional()
  questionNumber?: number;
} 