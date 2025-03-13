import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCourseCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}

