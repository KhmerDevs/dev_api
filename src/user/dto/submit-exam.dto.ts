import { IsArray, IsNotEmpty, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsNotEmpty()
  qcmId: number;

  @IsNotEmpty()
  answer: number;
}

export class SubmitExamDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one answer is required' })
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
} 