import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
