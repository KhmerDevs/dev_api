import { IsString, IsNotEmpty } from 'class-validator';

export class SubmitPracticeExerciseDto {
  @IsString()
  @IsNotEmpty()
  submittedCode: string;
} 