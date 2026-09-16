import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DuelService } from '../duel/duel.service';
import { TeamDuelService } from '../duel/team-duel.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';

// DuelService/TeamDuelService "sống" ở đây (không phải module duel/) để
// NotificationsGateway gọi thẳng được (xử lý sự kiện WebSocket
// duel:*/teamduel:*) mà không tạo phụ thuộc vòng giữa 2 module — DuelModule
// chỉ import NotificationsModule để lấy lại 2 service này cho phần REST
// (rating/leaderboard/queue-size), không đi chiều ngược lại.
@Module({
  imports: [JwtModule.register({})],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    NotificationsListener,
    NotificationsService,
    DuelService,
    TeamDuelService,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    DuelService,
    TeamDuelService,
  ],
})
export class NotificationsModule {}
