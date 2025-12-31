import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { StripeService } from './services/stripe.service';
import { InvoicingService } from './services/invoicing.service';
import { WebhookController } from './webhook.controller';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  imports: [],
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
