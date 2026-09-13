import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

export class MessagesPageQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}
