import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule, JwtModule.register({})],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    NotificationsListener,
    NotificationsService,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
