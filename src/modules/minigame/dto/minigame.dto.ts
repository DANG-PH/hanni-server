import { GameMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class MinigameAnswerDto {
  @IsUUID()
  wordId!: string;

  @IsInt()
  @Min(0)
  chosenIndex!: number;
}

export class FinishMinigameDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MinigameAnswerDto)
  answers!: MinigameAnswerDto[];

  @IsInt()
  @Min(0)
  durationMs!: number;
}

export class LeaderboardQueryDto {
  @IsOptional()
  @IsIn(['daily', 'weekly'])
  period?: 'daily' | 'weekly';

  @IsOptional()
  @IsEnum(GameMode)
  mode?: GameMode;
}

export class StartMinigameDto {
  @IsOptional()
  @IsEnum(GameMode)
  mode?: GameMode;
}
