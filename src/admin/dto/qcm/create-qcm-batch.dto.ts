import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQcmDto } from './create-qcm.dto';

export class CreateQcmBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQcmDto)
  questions: CreateQcmDto[];
} 