import { IsString, IsArray, IsNumber, Min, ArrayMinSize } from 'class-validator';

export class CreateQcmDto {
  @IsString()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @IsNumber()
  @Min(0)
  correctAnswer: number;

  @IsNumber()
  courseId: number;
} 