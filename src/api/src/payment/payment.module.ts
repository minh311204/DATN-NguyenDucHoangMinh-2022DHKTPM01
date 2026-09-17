import { Module } from '@nestjs/common'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { PrismaModule } from '../prisma/prima.module'
import { MailModule } from '../mail/mail.module'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [PrismaModule, MailModule, NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
