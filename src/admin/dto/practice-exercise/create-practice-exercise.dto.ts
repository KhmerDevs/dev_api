import { IsNotEmpty, IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreatePracticeExerciseDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000, { message: 'Instructions cannot exceed 1000 characters' })
  instructions: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(15000, { message: 'Starter code cannot exceed 15000 characters' })
  starterCode: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(15000, { message: 'Solution cannot exceed 15000 characters' })
  solution: string;

  @IsOptional()
  @IsBoolean()
  isEnabled: boolean;
} 