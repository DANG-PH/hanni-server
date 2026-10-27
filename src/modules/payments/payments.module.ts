import { Module } from '@nestjs/common';
import { MomoService } from './momo.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MomoService],
})
export class PaymentsModule {}
