import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { CreateCodeExampleDto } from '../code-example/create-code-example.dto';
import { CreatePracticeExerciseDto } from '../practice-exercise/create-practice-exercise.dto';

export class CreateLessonDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsNumber()
  orderIndex: number;

  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @IsOptional()
  @IsArray()
  codeExamples: CreateCodeExampleDto[];

  @IsOptional()
  @IsArray()
  practiceExercises: CreatePracticeExerciseDto[];
} 