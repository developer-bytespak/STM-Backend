import {
  Controller,
  Post,
  Req,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { InvoicingService } from './services/invoicing.service';
import { StripeService } from './services/stripe.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private invoicingService: InvoicingService,
    private stripeService: StripeService,
    private prisma: PrismaService,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(@Req() request: Request) {
    try {
      const sig = request.headers['stripe-signature'] as string;
      
      // Get raw body - express.raw() returns Buffer in request.body
      let body = request.body;
      
      // If it's a Buffer, keep it as is; if it's already a string, use it
      if (!body) {
        this.logger.error('Missing request body');
        throw new BadRequestException('Missing request body');
      }

      if (!sig) {
        this.logger.error('Missing stripe-signature header');
        throw new BadRequestException('Missing stripe-signature header');
      }

      this.logger.log(`Raw body type: ${typeof body}, is Buffer: ${Buffer.isBuffer(body)}`);

      const event = this.stripeService.verifyWebhook(body, sig);
      this.logger.log(`✅ Received webhook event: ${event.type}`);

      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'invoice.finalized':
          this.logger.log(`Invoice finalized: ${event.data.object.id}`);
          break;
        case 'invoice.created':
          this.logger.log(`Invoice created: ${event.data.object.id}`);
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`);
      throw new BadRequestException(`Webhook Error: ${error.message}`);
    }
  }

  private async handlePaymentSucceeded(invoice: any) {
    try {
      this.logger.log(`Processing payment succeeded for invoice: ${invoice.id}`);
      this.logger.log(`Invoice metadata: ${JSON.stringify(invoice.metadata)}`);

      // Get payment ID from invoice metadata
      const paymentId = invoice.metadata?.payment_id;
      
      if (!paymentId) {
        this.logger.error(`❌ No payment_id in invoice metadata: ${invoice.id}`);
        this.logger.error(`Full metadata: ${JSON.stringify(invoice.metadata)}`);
        return;
      }

      this.logger.log(`Found paymentId: ${paymentId}`);

      // Find payment by ID (from metadata)
      const payment = await this.prisma.payments.findUnique({
        where: { id: parseInt(paymentId) },
        include: { job: true },
      });

      if (!payment) {
        this.logger.error(`❌ Payment not found for ID: ${paymentId}`);
        return;
      }

      this.logger.log(`Found payment, updating job ${payment.job_id}`);

      // Update payment status
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: {
          status: 'received',
          marked_at: new Date(),
        },
      });

      // Update job status to 'paid'
      await this.prisma.jobs.update({
        where: { id: payment.job_id },
        data: {
          status: 'paid',
          paid_at: new Date(),
        },
      });

      this.logger.log(
        `✅ Payment marked as paid for job ${payment.job_id}`,
      );
    } catch (error) {
      this.logger.error(`Error handling payment succeeded: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
    }
  }

  private async handlePaymentFailed(invoice: any) {
    try {
      this.logger.log(`Processing payment failed for invoice: ${invoice.id}`);

      // Get payment ID from invoice metadata
      const paymentId = invoice.metadata?.payment_id;
      
      if (!paymentId) {
        this.logger.warn(`No payment_id in invoice metadata: ${invoice.id}`);
        return;
      }

      // Find payment by ID (from metadata)
      const payment = await this.prisma.payments.findUnique({
        where: { id: parseInt(paymentId) },
        include: { job: true },
      });

      if (!payment) {
        this.logger.warn(`Payment not found for ID: ${paymentId}`);
        return;
      }

      // Update payment status
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: {
          status: 'disputed',
          marked_at: new Date(),
        },
      });

      this.logger.log(`❌ Payment marked as failed for job ${payment.job_id}`);
    } catch (error) {
      this.logger.error(`Error handling payment failed: ${error.message}`);
    }
  }
}
