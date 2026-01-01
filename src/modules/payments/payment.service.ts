import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService } from './services/stripe.service';
import { InvoicingService } from './services/invoicing.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly invoicingService: InvoicingService,
  ) {}

  /**
   * Process job payment by creating and sending Stripe invoice
   * This is called when provider marks job as complete
   * Creates payment record if it doesn't exist
   */
  async processJobPayment(jobId: number) {
    this.logger.log(`Processing payment for job ${jobId}`);

    // Verify job exists and is in correct status
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        payment: true,
        service: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'completed') {
      throw new BadRequestException('Job must be completed before sending invoice');
    }

    // Create payment record if it doesn't exist (payment only created when job completes)
    let payment = job.payment;
    if (!payment) {
      payment = await this.prisma.payments.create({
        data: {
          job_id: jobId,
          amount: Number(job.price) || 0, // Use job price as payment amount
          status: 'pending',
        },
      });
      this.logger.log(`Created payment record for job ${jobId}: amount=${payment.amount}`);
    }

    // Check if invoice already exists
    const existingInvoice = await this.stripeService.getInvoiceByJobId(jobId);
    if (existingInvoice) {
      return {
        success: true,
        message: 'Invoice already exists',
        invoiceUrl: existingInvoice.hosted_invoice_url,
        invoiceId: existingInvoice.id,
        alreadyExists: true,
      };
    }

    // Generate and send invoice
    const invoice = await this.invoicingService.generateInvoiceForJob(jobId);

    // Update payment status to indicate invoice was sent
    await this.prisma.payments.update({
      where: { id: payment.id },
      data: {
        status: 'pending',
        notes: `Invoice ${invoice.invoiceId} sent to customer`,
      },
    });

    return {
      ...invoice,
      alreadyExists: false,
    };
  }

  /**
   * Get invoice details for a job
   */
  async getInvoiceDetails(jobId: number) {
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        payment: true,
        service: true,
        customer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const invoiceData = await this.invoicingService.getInvoiceByJobId(jobId);

    return {
      job: {
        id: job.id,
        service: job.service.name,
        status: job.status,
        price: Number(job.price),
        completedAt: job.completed_at,
      },
      customer: {
        name: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
        email: job.customer.user.email,
      },
      payment: job.payment
        ? {
            id: job.payment.id,
            amount: Number(job.payment.amount),
            status: job.payment.status,
            method: job.payment.method,
            markedAt: job.payment.marked_at,
          }
        : null,
      invoice: invoiceData.found ? invoiceData : null,
    };
  }

  /**
   * Resend invoice for a job
   */
  async resendInvoice(jobId: number) {
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return await this.invoicingService.resendInvoice(jobId);
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event: any) {
    this.logger.log(`Handling Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'invoice.paid':
        await this.invoicingService.handlePaymentSuccess(event.data.object.id);
        break;

      case 'invoice.payment_failed':
        await this.invoicingService.handlePaymentFailed(event.data.object.id);
        break;

      case 'invoice.finalized':
        this.logger.log(`Invoice ${event.data.object.id} finalized`);
        break;

      case 'invoice.sent':
        this.logger.log(`Invoice ${event.data.object.id} sent to customer`);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: number, role: string) {
    if (role === 'CUSTOMER') {
      const customer = await this.prisma.customers.findUnique({
        where: { user_id: userId },
      });

      if (!customer) {
        throw new NotFoundException('Customer profile not found');
      }

      const payments = await this.prisma.payments.findMany({
        where: {
          job: {
            customer_id: customer.id,
          },
        },
        include: {
          job: {
            include: {
              service: true,
              service_provider: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return payments.map((payment) => ({
        id: payment.id,
        jobId: payment.job_id,
        service: payment.job.service.name,
        provider: payment.job.service_provider.business_name || 
          `${payment.job.service_provider.user.first_name} ${payment.job.service_provider.user.last_name}`,
        amount: Number(payment.amount),
        status: payment.status,
        method: payment.method,
        paidAt: payment.marked_at,
        createdAt: payment.created_at,
      }));
    } else if (role === 'PROVIDER') {
      const provider = await this.prisma.service_providers.findUnique({
        where: { user_id: userId },
      });

      if (!provider) {
        throw new NotFoundException('Provider profile not found');
      }

      const payments = await this.prisma.payments.findMany({
        where: {
          job: {
            provider_id: provider.id,
          },
        },
        include: {
          job: {
            include: {
              service: true,
              customer: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return payments.map((payment) => ({
        id: payment.id,
        jobId: payment.job_id,
        service: payment.job.service.name,
        customer: `${payment.job.customer.user.first_name} ${payment.job.customer.user.last_name}`,
        amount: Number(payment.amount),
        status: payment.status,
        method: payment.method,
        paidAt: payment.marked_at,
        createdAt: payment.created_at,
      }));
    } else {
      throw new BadRequestException('Invalid role');
    }
  }

  /**
   * Calculate provider earnings
   * Find provider by user_id (authenticated user)
   */
  async calculateEarnings(userId: number) {
    // Find provider by user_id relationship
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found. Please complete your provider setup.');
    }

    const payments = await this.prisma.payments.findMany({
      where: {
        job: {
          provider_id: provider.id,
        },
        status: 'received',
      },
    });

    const totalEarnings = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    return {
      providerId: provider.id,
      totalEarnings,
      totalJobs: payments.length,
      currentBalance: Number(provider.earning),
    };
  }

  /**
   * Get all invoices for a provider
   * Optionally filter by payment status
   */
  async getProviderInvoices(providerId: number, status?: string) {
    this.logger.log(`Getting invoices for provider ${providerId}, status: ${status}`);

    // Get service provider
    const serviceProvider = await this.prisma.service_providers.findFirst({
      where: {
        user_id: providerId,
      },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    // Build query filter
    const whereClause: any = {
      job: {
        provider_id: serviceProvider.id,
      },
    };

    if (status) {
      whereClause.status = status;
    }

    // Get all payments/invoices for this provider
    const payments = await this.prisma.payments.findMany({
      where: whereClause,
      include: {
        job: {
          include: {
            customer: {
              include: {
                user: true,
              },
            },
            service: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Get Stripe invoice details for each payment
    const invoices = await Promise.all(
      payments.map(async (payment) => {
        let stripeInvoice = null;
        try {
          stripeInvoice = await this.stripeService.getInvoiceByJobId(
            payment.job_id,
          );
        } catch (error) {
          this.logger.warn(
            `Could not fetch Stripe invoice for job ${payment.job_id}`,
          );
        }

        return {
          id: payment.id,
          jobId: payment.job_id,
          jobService: payment.job.service.name,
          jobCategory: payment.job.service.category,
          customerName: payment.job.customer.user.first_name,
          customerEmail: payment.job.customer.user.email,
          amount: Number(payment.amount),
          status: payment.status,
          stripeInvoiceId: stripeInvoice?.id,
          stripeInvoiceUrl: stripeInvoice?.hosted_invoice_url,
          stripePdfUrl: stripeInvoice?.pdf,
          createdAt: payment.created_at,
          markedAt: payment.marked_at,
          notes: payment.notes,
        };
      }),
    );

    // Group by status if requested
    const summary = {
      total: invoices.length,
      pending: invoices.filter((inv) => inv.status === 'pending').length,
      received: invoices.filter((inv) => inv.status === 'received').length,
      disputed: invoices.filter((inv) => inv.status === 'disputed').length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    };

    return {
      summary,
      invoices,
    };
  }
}
