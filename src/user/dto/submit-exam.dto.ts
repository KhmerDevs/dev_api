import { IsArray, IsNumber, IsPositive, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsNumber()
  @IsPositive()
  qcmId: number;

  @IsNumber()
  @Min(0)
  answer: number;
}

export class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
} 