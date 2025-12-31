import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });

    this.logger.log('Stripe service initialized');
  }

  /**
   * Get or create Stripe customer using metadata
   * Stores user_id in metadata to link Stripe customer to platform user
   */
  async getOrCreateCustomer(
    userId: number,
    email: string,
    name: string,
  ): Promise<Stripe.Customer> {
    try {
      // Search for existing customer by user_id metadata
      const existingCustomers = await this.stripe.customers.search({
        query: `metadata['user_id']:'${userId}'`,
      });

      if (existingCustomers.data.length > 0) {
        this.logger.log(`Found existing Stripe customer for user ${userId}`);
        return existingCustomers.data[0];
      }

      // Create new customer with metadata
      this.logger.log(`Creating new Stripe customer for user ${userId}`);
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          user_id: userId.toString(),
          platform: 'STM',
        },
      });

      return customer;
    } catch (error) {
      this.logger.error(`Failed to get/create customer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create invoice for a job with metadata linking
   * No database changes needed - all linking via Stripe metadata
   */
  async createInvoiceForJob(
    jobId: number,
    paymentId: number,
    customerId: string,
    amount: number,
    description: string,
    dueInDays: number = 7,
  ): Promise<Stripe.Invoice> {
    try {
      this.logger.log(`Creating invoice for job ${jobId}, payment ${paymentId}`);
      this.logger.log(`Amount: $${amount} (${Math.round(amount * 100)} cents)`);

      // Create invoice FIRST (in draft state)
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: dueInDays,
        auto_advance: false, // DON'T automatically finalize - we'll do it manually
        metadata: {
          job_id: jobId.toString(),
          payment_id: paymentId.toString(),
          platform: 'STM',
        },
      });

      this.logger.log(`Draft invoice created: ${invoice.id}`);

      // Now create invoice item and attach it to the invoice
      const invoiceItem = await this.stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id, // ✅ CRITICAL: Link item to specific invoice
        amount: Math.round(amount * 100), // Convert dollars to cents
        currency: 'usd',
        description,
        metadata: {
          job_id: jobId.toString(),
          payment_id: paymentId.toString(),
        },
      });

      this.logger.log(`Invoice item created: ${invoiceItem.id} with amount $${invoiceItem.amount / 100} attached to invoice ${invoice.id}`);

      // Finalize invoice (makes it ready for payment)
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(
        invoice.id,
      );

      this.logger.log(`Invoice finalized: ${finalizedInvoice.id}, status: ${finalizedInvoice.status}, amount: $${finalizedInvoice.amount_due / 100}`);

      // Try to send invoice email to customer (may fail due to Stripe restrictions)
      try {
        await this.stripe.invoices.sendInvoice(finalizedInvoice.id);
        this.logger.log(`Invoice email sent for ${finalizedInvoice.id}`);
      } catch (sendError) {
        this.logger.warn(`Could not send invoice email: ${sendError.message}`);
        this.logger.log(`Customer can still pay via URL: ${finalizedInvoice.hosted_invoice_url}`);
      }

      return finalizedInvoice;
    } catch (error) {
      this.logger.error(`Failed to create invoice: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get invoice by job ID using metadata search
   */
  async getInvoiceByJobId(jobId: number): Promise<Stripe.Invoice | null> {
    try {
      const invoices = await this.stripe.invoices.search({
        query: `metadata['job_id']:'${jobId}'`,
      });

      return invoices.data[0] || null;
    } catch (error) {
      this.logger.error(
        `Failed to get invoice for job ${jobId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get invoice by payment ID using metadata search
   */
  async getInvoiceByPaymentId(
    paymentId: number,
  ): Promise<Stripe.Invoice | null> {
    try {
      const invoices = await this.stripe.invoices.search({
        query: `metadata['payment_id']:'${paymentId}'`,
      });

      return invoices.data[0] || null;
    } catch (error) {
      this.logger.error(
        `Failed to get invoice for payment ${paymentId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Resend invoice email
   */
  async sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.sendInvoice(invoiceId);
      this.logger.log(`Invoice ${invoiceId} resent`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to resend invoice: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify and construct webhook event
   */
  verifyWebhook(payload: Buffer, signature: string): Stripe.Event {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );

      return event;
    } catch (error) {
      this.logger.error(`Webhook verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get invoice details by ID
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      this.logger.error(`Failed to get invoice ${invoiceId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Void/cancel an invoice
   */
  async voidInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.voidInvoice(invoiceId);
      this.logger.log(`Invoice ${invoiceId} voided`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to void invoice: ${error.message}`);
      throw error;
    }
  }
}
