import { Module } from '@nestjs/common';
import { RoleplayController } from './roleplay.controller';
import { RoleplayService } from './roleplay.service';

@Module({
  controllers: [RoleplayController],
  providers: [RoleplayService],
})
export class RoleplayModule {}
