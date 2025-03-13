import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCourseCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}

