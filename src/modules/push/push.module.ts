import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { ReminderService } from './reminder.service';

@Module({
  controllers: [PushController],
  providers: [PushService, ReminderService],
  // Export để NotificationsModule/MessagesModule đẩy được thông báo THẬT ra
  // ngoài app. Trước đây PushService chỉ ReminderService dùng (nhắc học theo
  // lịch), nên đóng app là không nhận được gì — kể cả tin nhắn mới.
  exports: [PushService],
})
export class PushModule {}
