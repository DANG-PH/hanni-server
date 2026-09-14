import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DuelController } from './duel.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [DuelController],
})
export class DuelModule {}
