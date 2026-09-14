import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { WeeklyDigestService } from './weekly-digest.service';

@Global()
@Module({
  providers: [MailService, WeeklyDigestService],
  exports: [MailService],
})
export class MailModule {}
