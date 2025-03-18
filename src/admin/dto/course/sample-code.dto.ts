import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SampleCodeDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  programmingLanguage: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  code: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  explanation: string;
} 