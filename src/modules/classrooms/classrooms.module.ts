import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomsService } from './classrooms.service';

@Module({
  imports: [PushModule],
  controllers: [ClassroomsController],
  providers: [ClassroomsService],
})
export class ClassroomsModule {}
