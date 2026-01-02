import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ChatGateway } from '../../chat/chat.gateway';

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    @Optional()
    private readonly chatGateway?: ChatGateway,
  ) {}

  /**
   * Generate and send invoice for a completed job
   * This is called when provider marks job as complete
   */
  async generateInvoiceForJob(jobId: number) {
    this.logger.log(`Generating invoice for job ${jobId}`);

    // Get job with all related data
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        service: true,
        service_provider: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (!job.payment) {
      throw new NotFoundException('Payment record not found for this job');
    }

    // Get or create Stripe customer
    const stripeCustomer = await this.stripeService.getOrCreateCustomer(
      job.customer.user_id,
      job.customer.user.email,
      `${job.customer.user.first_name} ${job.customer.user.last_name}`,
    );

    // Create invoice description
    const description = `${job.service.name} - ${job.service.category}`;

    // DEBUG: Log all values before creating invoice
    const amountToSend = Number(job.price);
    this.logger.log('=== INVOICE CREATION DEBUG ===');
    this.logger.log(`Job ID: ${jobId}`);
    this.logger.log(`Job price (raw): ${job.price} (type: ${typeof job.price})`);
    this.logger.log(`Amount to send: ${amountToSend} (type: ${typeof amountToSend})`);
    this.logger.log(`Amount in cents: ${Math.round(amountToSend * 100)}`);
    this.logger.log(`Customer ID: ${stripeCustomer.id}`);
    this.logger.log(`Description: ${description}`);
    this.logger.log('=============================');

    // Create and send invoice
    const invoice = await this.stripeService.createInvoiceForJob(
      jobId,
      job.payment.id,
      stripeCustomer.id,
      amountToSend,
      description,
      7, // Due in 7 days
    );

    this.logger.log(`Invoice ${invoice.id} created for job ${jobId}`);

    // 🆕 Send payment link via chat to customer
    await this.sendPaymentLinkViaChat(
      jobId,
      job.customer.user_id,
      job.provider_id,
      invoice.hosted_invoice_url,
      amountToSend,
      job.customer.user.first_name,
    );

    // 🆕 Send notification to customer about invoice
    await this.sendPaymentNotification(
      job.customer.user_id,
      jobId,
      invoice.hosted_invoice_url,
      amountToSend,
    );

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      amountDue: invoice.amount_due / 100,
      dueDate: invoice.due_date,
    };
  }

  /**
   * Handle successful payment webhook
   * Updates payment and job status
   */
  async handlePaymentSuccess(invoiceId: string) {
    this.logger.log(`Processing payment success for invoice ${invoiceId}`);

    // Get invoice to extract metadata
    const invoice = await this.stripeService.getInvoice(invoiceId);

    if (!invoice.metadata.job_id || !invoice.metadata.payment_id) {
      this.logger.error('Invoice missing job_id or payment_id in metadata');
      throw new Error('Invalid invoice metadata');
    }

    const jobId = parseInt(invoice.metadata.job_id);
    const paymentId = parseInt(invoice.metadata.payment_id);

    // Update payment and job in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update payment status
      const payment = await tx.payments.update({
        where: { id: paymentId },
        data: {
          status: 'received',
          marked_at: new Date(),
          method: 'stripe_invoice',
          notes: `Paid via Stripe Invoice ${invoiceId}`,
        },
      });

      // Update job status
      const job = await tx.jobs.update({
        where: { id: jobId },
        data: {
          status: 'paid',
          paid_at: new Date(),
        },
        include: {
          service: true,
          customer: true,
          service_provider: {
            include: {
              user: true,
            },
          },
        },
      });

      // Update provider earnings
      await tx.service_providers.update({
        where: { id: job.provider_id },
        data: {
          earning: { increment: payment.amount },
          total_jobs: { increment: 1 },
        },
      });

      // Update LSM closed deals count if applicable
      if (job.service_provider.lsm_id) {
        await tx.local_service_managers.update({
          where: { id: job.service_provider.lsm_id },
          data: {
            closed_deals_count: { increment: 1 },
          },
        });
      }

      // Send notification to customer
      await tx.notifications.create({
        data: {
          recipient_type: 'customer',
          recipient_id: job.customer.user_id,
          type: 'payment',
          title: 'Payment Confirmed',
          message: `Your payment of $${Number(payment.amount).toFixed(2)} for ${job.service.name} has been received. Thank you!`,
        },
      });

      // Send notification to provider
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: job.service_provider.user_id,
          type: 'payment',
          title: 'Payment Received',
          message: `Payment of $${Number(payment.amount).toFixed(2)} received for job #${job.id} (${job.service.name})`,
        },
      });

      // 🆕 Send chat message to customer confirming payment
      await tx.messages.create({
        data: {
          chat_id: 'chat-id-placeholder', // Will be created separately
          sender_type: 'service_provider',
          sender_id: job.provider_id,
          message_type: 'text',
          message: `✅ Payment Received!\n\nThank you! Your payment of $${Number(payment.amount).toFixed(2)} has been successfully processed.\n\nInvoice: ${invoice.number}\nDate: ${new Date(invoice.created * 1000).toLocaleDateString()}\n\nWe appreciate your business!`,
        },
      });
    });

    this.logger.log(`Payment success processed for job ${jobId}`);

    return { success: true, jobId, paymentId };
  }

  /**
   * 🆕 Send payment link to customer via chat (Real-time via Socket.IO)
   */
  private async sendPaymentLinkViaChat(
    jobId: number,
    customerId: number,
    providerId: number,
    paymentLink: string,
    amount: number,
    customerName: string,
  ) {
    try {
      this.logger.log(`Sending payment link via chat for job ${jobId}`);

      // Get existing chat using job_id (chat already exists from job creation)
      const chat = await this.prisma.chat.findFirst({
        where: {
          job_id: jobId,
        },
      });

      if (!chat) {
        this.logger.warn(`Chat not found for job ${jobId}, skipping chat message`);
        return; // Chat doesn't exist yet, skip sending
      }

      // Create message with payment link in existing chat
      const message = await this.prisma.messages.create({
        data: {
          chat_id: chat.id,
          sender_type: 'service_provider',
          sender_id: providerId,
          message_type: 'text',
          message: `Hi ${customerName}! 👋\n\nYour invoice is ready for payment.\n\n💰 Amount Due: $${amount.toFixed(2)}\n\n🔗 Payment Link: ${paymentLink}\n\nPlease click the link above to complete the payment. You can pay securely using your credit/debit card.\n\nThank you!`,
        },
      });

      this.logger.log(`✅ Payment link saved to chat for job ${jobId}`);

      // 🆕 Emit real-time message via Socket.IO if ChatGateway is available
      if (this.chatGateway && this.chatGateway.server) {
        try {
          const messageData = {
            id: message.id,
            chatId: chat.id,
            sender_type: message.sender_type,
            sender_id: message.sender_id,
            sender_name: `Service Provider`,
            message: message.message,
            message_type: message.message_type,
            paymentLink: paymentLink, // 🆕 Include clickable payment link
            amount: amount,
            created_at: message.created_at,
          };

          // Emit to the specific chat room so customers see it in real-time
          this.chatGateway.server.to(chat.id).emit('new_message', messageData);
          
          // CRITICAL: Also emit to customer's personal room to ensure delivery
          this.chatGateway.server.to(`user:${customerId}`).emit('new_message', messageData);
          
          this.logger.log(`✅ Real-time payment link emitted via Socket.IO:`);
          this.logger.log(`  - Chat room: ${chat.id}`);
          this.logger.log(`  - Customer personal room: user:${customerId}`);
        } catch (socketError) {
          this.logger.warn(
            `Could not emit via Socket.IO: ${socketError.message}. Message is saved in DB.`,
          );
          // Continue - message is already saved to DB
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to send payment link via chat: ${error.message}`,
      );
      // Don't throw - invoice is already created, just log the error
    }
  }

  /**
   * 🆕 Send payment notification to customer
   */
  private async sendPaymentNotification(
    customerId: number,
    jobId: number,
    paymentLink: string,
    amount: number,
  ) {
    try {
      this.logger.log(`Sending payment notification to customer ${customerId}`);

      // Create notification
      await this.prisma.notifications.create({
        data: {
          recipient_type: 'customer',
          recipient_id: customerId,
          type: 'payment',
          title: 'Invoice Ready for Payment',
          message: `Your invoice for $${amount.toFixed(2)} is ready for payment.`,
        },
      });

      this.logger.log(`✅ Payment notification created for customer ${customerId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send payment notification: ${error.message}`,
      );
      // Don't throw - invoice is already created
    }
  }

  /**
   * Handle failed payment webhook
   */
  async handlePaymentFailed(invoiceId: string) {
    this.logger.log(`Processing payment failure for invoice ${invoiceId}`);

    // Get invoice to extract metadata
    const invoice = await this.stripeService.getInvoice(invoiceId);

    if (!invoice.metadata.payment_id) {
      this.logger.error('Invoice missing payment_id in metadata');
      return;
    }

    const paymentId = parseInt(invoice.metadata.payment_id);

    // Update payment status
    await this.prisma.payments.update({
      where: { id: paymentId },
      data: {
        status: 'pending', // Keep as pending, customer can retry
        notes: `Payment failed for invoice ${invoiceId}`,
      },
    });

    // Get job details for notification
    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
      include: {
        job: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
    });

    if (payment) {
      // Notify customer about failed payment
      await this.prisma.notifications.create({
        data: {
          recipient_type: 'customer',
          recipient_id: payment.job.customer.user_id,
          type: 'payment',
          title: 'Payment Failed',
          message: `Payment for ${payment.job.service.name} failed. Please try again or use another payment method.`,
        },
      });
    }

    this.logger.log(`Payment failure processed for payment ${paymentId}`);

    return { success: true, paymentId };
  }

  /**
   * Get invoice details by job ID
   */
  async getInvoiceByJobId(jobId: number) {
    const invoice = await this.stripeService.getInvoiceByJobId(jobId);

    if (!invoice) {
      return { found: false };
    }

    return {
      found: true,
      invoiceId: invoice.id,
      status: invoice.status,
      amountDue: invoice.amount_due / 100,
      amountPaid: invoice.amount_paid / 100,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      paid: invoice.paid,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      created: new Date(invoice.created * 1000),
    };
  }

  /**
   * Resend invoice email
   */
  async resendInvoice(jobId: number) {
    const invoice = await this.stripeService.getInvoiceByJobId(jobId);

    if (!invoice) {
      throw new NotFoundException('Invoice not found for this job');
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot resend a paid invoice');
    }

    await this.stripeService.sendInvoice(invoice.id);

    return {
      success: true,
      message: 'Invoice resent successfully',
    };
  }
}
