import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule, NotificationsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
