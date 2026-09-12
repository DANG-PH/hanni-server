import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    NotificationsListener,
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
