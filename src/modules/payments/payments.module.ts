import { Module } from '@nestjs/common';
import { MomoService } from './momo.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PayosService } from './payos.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PayosService, MomoService],
})
export class PaymentsModule {}
