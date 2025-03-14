import { IsString, IsNumber, IsUrl, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateRoadmapDto {
  @IsString()
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title: string;

  @IsString()
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description: string;

  @IsNumber()
  @Min(1, { message: 'Number of stages must be at least 1' })
  numberOfStages: number;

  @IsNumber()
  @Min(1, { message: 'Category ID must be positive' })
  categoryId: number;

  @IsString()
  @MaxLength(500, { message: 'Image URL cannot exceed 500 characters' })
  @IsUrl({}, { message: 'Invalid image URL format' })
  imageUrl: string;
} 