import { Module } from '@nestjs/common'
import { MailService } from '../payment/mail.service'

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
