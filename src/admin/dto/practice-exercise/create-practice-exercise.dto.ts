import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreatePracticeExerciseDto {
  @IsNotEmpty()
  @IsString()
  instructions: string;

  @IsNotEmpty()
  @IsString()
  starterCode: string;

  @IsNotEmpty()
  @IsString()
  solution: string;

  @IsOptional()
  @IsBoolean()
  isEnabled: boolean;
} 