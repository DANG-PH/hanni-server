import { IsString, MaxLength, MinLength } from 'class-validator';

export class StartRoleplayDto {
  @IsString()
  scenarioKey!: string;
}

export class ReplyRoleplayDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}
