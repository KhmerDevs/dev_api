import { IsNotEmpty, IsString, IsNumber, MinLength, MaxLength, Min, Max } from 'class-validator';

export class CreateCodeExampleDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50, { message: 'Programming language name cannot exceed 50 characters' })
  programmingLanguage: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(10000, { message: 'Code cannot exceed 10000 characters' })
  code: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'Explanation must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Explanation cannot exceed 5000 characters' })
  explanation: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Order index cannot be negative' })
  @Max(1000, { message: 'Order index cannot exceed 1000' })
  orderIndex: number;
} 