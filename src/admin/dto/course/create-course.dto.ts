import { IsNotEmpty, IsString, IsEnum, IsArray, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { DifficultyLevel } from '../../../entities/course.entity';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  categoryId: number;

  @IsNotEmpty()
  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsOptional()
  @IsArray()
  prerequisites: string[];

  @IsOptional()
  @IsArray()
  learningObjectives: string[];

  @IsOptional()
  @IsString()
  thumbnailUrl: string;

  @IsOptional()
  @IsBoolean()
  isPublished: boolean;

  @IsNumber()
  @Min(1)
  @Max(180)  // Maximum 3 hours
  examDuration: number;

  @IsNumber()
  @Min(0)
  @Max(100)  // Percentage between 0-100
  examPassScore: number;
} 