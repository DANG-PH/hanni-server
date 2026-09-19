import { Module } from '@nestjs/common';
import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';

@Module({
  controllers: [PremiumController],
  providers: [PremiumService],
})
export class PremiumModule {}
