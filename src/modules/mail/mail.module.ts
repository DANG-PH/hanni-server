import { Global, Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { WeeklyDigestService } from './weekly-digest.service';

@Global()
@Module({
  controllers: [MailController],
  providers: [MailService, WeeklyDigestService],
  exports: [MailService],
})
export class MailModule {}
