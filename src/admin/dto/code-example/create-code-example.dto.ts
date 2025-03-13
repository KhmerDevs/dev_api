import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateCodeExampleDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  programmingLanguage: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  explanation: string;

  @IsNotEmpty()
  @IsNumber()
  orderIndex: number;
} 