import { IsNotEmpty, IsString, IsEnum, IsArray, IsOptional, IsBoolean, IsNumber, Min, Max, MaxLength, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DifficultyLevel } from '../../../entities/course.entity';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Category ID must be positive' })
  categoryId: number;

  @IsNotEmpty()
  @IsEnum(DifficultyLevel, { message: 'Invalid difficulty level' })
  difficultyLevel: DifficultyLevel;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Maximum 20 prerequisites allowed' })
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Each prerequisite cannot exceed 100 characters' })
  prerequisites: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Maximum 20 learning objectives allowed' })
  @IsString({ each: true })
  @MaxLength(200, { each: true, message: 'Each learning objective cannot exceed 200 characters' })
  learningObjectives: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Thumbnail URL cannot exceed 500 characters' })
  thumbnailUrl: string;

  @IsOptional()
  @IsBoolean()
  isPublished: boolean;

  @IsNumber()
  @Min(1, { message: 'Exam duration must be at least 1 minute' })
  @Max(180, { message: 'Exam duration cannot exceed 180 minutes' })
  examDuration: number;

  @IsNumber()
  @Min(0, { message: 'Exam pass score cannot be negative' })
  @Max(100, { message: 'Exam pass score cannot exceed 100%' })
  examPassScore: number;
} 