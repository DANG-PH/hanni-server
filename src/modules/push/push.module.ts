import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { ReminderService } from './reminder.service';

@Module({
  controllers: [PushController],
  providers: [PushService, ReminderService],
})
export class PushModule {}
