import { IsString, IsEnum, IsArray, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { DifficultyLevel } from '../../../entities/course.entity';

// Force recompilation with this comment
export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsArray()
  prerequisites?: string[];

  @IsOptional()
  @IsArray()
  learningObjectives?: string[];

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  lessonIds?: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  examDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  examPassScore?: number;
} 