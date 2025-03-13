import { IsString, IsNumber, IsUrl, IsOptional, Min } from 'class-validator';

export class CreateRoadmapDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  numberOfStages: number;

  @IsNumber()
  categoryId: number;

  @IsString()
  imageUrl: string;
} 