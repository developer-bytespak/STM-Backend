import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('payments')
@ApiTags('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Process job payment - Generate and send invoice
   * Called when provider marks job as complete
   */
  @Post('jobs/:jobId/send-invoice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate and send invoice for completed job' })
  @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
  @ApiResponse({ status: 404, description: 'Job or payment not found' })
  async sendInvoice(@Param('jobId', ParseIntPipe) jobId: number) {
    return await this.paymentService.processJobPayment(jobId);
  }

  /**
   * Get invoice details for a job
   */
  @Get('jobs/:jobId/invoice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice details for a job' })
  @ApiResponse({ status: 200, description: 'Invoice details retrieved' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getInvoice(@Param('jobId', ParseIntPipe) jobId: number) {
    return await this.paymentService.getInvoiceDetails(jobId);
  }

  /**
   * Resend invoice email to customer
   */
  @Post('jobs/:jobId/resend-invoice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend invoice email' })
  @ApiResponse({ status: 200, description: 'Invoice resent successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async resendInvoice(@Param('jobId', ParseIntPipe) jobId: number) {
    return await this.paymentService.resendInvoice(jobId);
  }

  /**
   * Get payment history for current user
   */
  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved' })
  async getPaymentHistory(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    return await this.paymentService.getPaymentHistory(userId, role);
  }

  /**
   * Calculate provider earnings
   */
  @Get('provider/:providerId/earnings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate provider earnings' })
  @ApiResponse({ status: 200, description: 'Earnings calculated' })
  async getEarnings(@Param('providerId', ParseIntPipe) providerId: number) {
    return await this.paymentService.calculateEarnings(providerId);
  }

  /**
   * Get all invoices for provider
   * Shows all invoices sent by this provider with status filter
   */
  @Get('provider/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invoices sent by provider' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved' })
  async getProviderInvoices(
    @CurrentUser('id') userId: number,
    @Body('status') status?: string, // pending, received, disputed
  ) {
    return await this.paymentService.getProviderInvoices(userId, status);
  }

  /**
   * Stripe webhook handler
   * This endpoint receives events from Stripe
   * IMPORTANT: This endpoint must have raw body parsing enabled
   */
  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    // Note: This requires raw body parsing to be enabled in main.ts
    // The signature verification is handled in the service
    const event = await this.paymentService.handleStripeWebhook(
      req.rawBody || req.body,
    );
    return event;
  }
}
