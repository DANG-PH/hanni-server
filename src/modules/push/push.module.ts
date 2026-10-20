import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { ReminderService } from './reminder.service';

@Module({
  controllers: [PushController],
  providers: [PushService, ReminderService],
  // Export để NotificationsModule đẩy được thông báo THẬT ra ngoài app (đóng
  // app vẫn nhận) — trước đây PushService chỉ ReminderService dùng.
  exports: [PushService],
})
export class PushModule {}
