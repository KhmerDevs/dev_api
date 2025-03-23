import { IsString, IsEnum, IsArray, IsOptional, IsBoolean, IsNumber, Min, Max, MaxLength, Matches } from 'class-validator';
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
  @IsString({ each: true })
  prerequisites?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  sampleCodes?: string[];

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

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Background color must be a valid hex color (e.g., #FF5500)'
  })
  backgroundColor?: string;
} 