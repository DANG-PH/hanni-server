import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ANALYZE_MAX, SENTENCE_MAX } from '../ai-tools.util';

export class SentenceCheckDto {
  @IsUUID()
  wordId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(SENTENCE_MAX)
  sentence!: string;
}

export class AnalyzeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(ANALYZE_MAX)
  text!: string;
}
