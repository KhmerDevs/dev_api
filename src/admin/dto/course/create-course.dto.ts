import { IsNotEmpty, IsString, IsEnum, IsArray, IsOptional, IsBoolean, IsNumber, Min, Max, MaxLength, ArrayMaxSize } from 'class-validator';
import { DifficultyLevel } from '../../../entities/course.entity';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  categoryId: number;

  @IsNotEmpty()
  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  prerequisites?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  learningObjectives?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  sampleCodes?: string[];  // Array of code snippets

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(180)
  examDuration: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  examPassScore: number;
} 