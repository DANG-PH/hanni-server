import { IsString } from 'class-validator';

export class CreatePremiumCheckoutDto {
  @IsString()
  planKey!: string;
}
