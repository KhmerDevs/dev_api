import { IsNotEmpty, IsString, IsArray, IsNumber, Min, Max, ArrayMinSize, MaxLength, ArrayMaxSize, IsOptional } from 'class-validator';

export class CreateQcmDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  question: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  options: string[];

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  correctAnswer: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Course ID must be positive' })
  courseId: number;
  
  @IsOptional()
  @IsNumber()
  @IsOptional()
  orderIndex?: number;

  @IsOptional()
  @IsNumber()
  @IsOptional()
  questionNumber?: number;
} 