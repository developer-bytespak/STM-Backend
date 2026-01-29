import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { StripeService } from './services/stripe.service';
import { InvoicingService } from './services/invoicing.service';
import { WebhookController } from './webhook.controller';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => ChatModule), forwardRef(() => NotificationsModule)],
  controllers: [PaymentController, WebhookController],
  providers: [
    PaymentService,
    StripeService,
    InvoicingService,
    PrismaService,
  ],
  exports: [PaymentService, StripeService, InvoicingService],
})
export class PaymentsModule {}
