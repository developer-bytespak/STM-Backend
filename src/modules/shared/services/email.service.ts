import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly isDevelopment: boolean;
  private readonly testCustomerEmail: string | null;
  private readonly testProviderEmail: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('✅ SendGrid API key configured');
    } else {
      this.logger.warn('⚠️ SENDGRID_API_KEY not found in environment variables');
    }
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
      'noreply@stmapp.com';
    
    // Check if we're in development mode
    this.isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    this.testCustomerEmail = this.configService.get<string>('TEST_CUSTOMER_EMAIL') || null;
    this.testProviderEmail = this.configService.get<string>('TEST_PROVIDER_EMAIL') || null;

    if (this.isDevelopment) {
      this.logger.log('🔧 Development mode: Using test emails for notifications');
      if (this.testCustomerEmail) {
        this.logger.log(`   Test Customer Email: ${this.testCustomerEmail}`);
      }
      if (this.testProviderEmail) {
        this.logger.log(`   Test Provider Email: ${this.testProviderEmail}`);
      }
    }
  }

  /**
   * Get the actual email address to use (test email in dev, real email in production)
   * @param actualEmail - The email from database
   * @param recipientType - 'customer' or 'provider'
   * @returns The email address to use
   */
  private getEmailAddress(actualEmail: string | null | undefined, recipientType: 'customer' | 'provider'): string | null {
    // If no email provided, return null
    if (!actualEmail) {
      return null;
    }

    // In development, use test emails if configured
    if (this.isDevelopment) {
      if (recipientType === 'customer' && this.testCustomerEmail) {
        this.logger.debug(`📧 Using test customer email: ${this.testCustomerEmail} (instead of ${actualEmail})`);
        return this.testCustomerEmail;
      }
      if (recipientType === 'provider' && this.testProviderEmail) {
        this.logger.debug(`📧 Using test provider email: ${this.testProviderEmail} (instead of ${actualEmail})`);
        return this.testProviderEmail;
      }
    }

    // In production or if test emails not configured, use actual email
    return actualEmail;
  }

  /**
   * Replace template variables with actual values
   * e.g., [CUSTOMER_NAME] → John, [PRICE] → 200
   * Converts camelCase keys to UPPER_SNAKE_CASE for template matching
   * e.g., customerName → [CUSTOMER_NAME], jobId → [JOB_ID]
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    Object.entries(variables).forEach(([key, value]) => {
      // Convert camelCase to UPPER_SNAKE_CASE
      // e.g., customerName → CUSTOMER_NAME, jobId → JOB_ID, newPrice → NEW_PRICE
      const snakeCase = key.replace(/([A-Z])/g, '_$1').toUpperCase();
      const placeholder = `[${snakeCase}]`;
      // Escape special regex characters: [ and ] must be escaped
      const escapedPlaceholder = placeholder.replace(/[[\]]/g, '\\$&');
      result = result.replace(new RegExp(escapedPlaceholder, 'g'), String(value || ''));
    });

    return result;
  }

  /**
   * Strip HTML tags from content (converts to plain text)
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  /**
   * Send email to service provider when a new job request is created
   */
  async sendJobRequestEmailToProvider(
    providerEmail: string,
    providerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      customerName: string;
      location: string;
      price?: number;
      scheduledAt?: string;
    },
  ): Promise<void> {
    try {
      const emailToUse = this.getEmailAddress(providerEmail, 'provider');
      if (!emailToUse) {
        this.logger.warn(`⚠️ No email address available for provider, skipping email for job #${jobDetails.jobId}`);
        return;
      }

      const subject = `🔔 New Job Request: ${jobDetails.serviceName}`;
      const htmlContent = this.getJobRequestEmailTemplate(
        providerName,
        jobDetails,
      );

      const message = {
        to: emailToUse,
        from: this.fromEmail,
        subject,
        html: htmlContent,
        text: this.getJobRequestEmailText(providerName, jobDetails),
      };

      await sgMail.send(message);
      this.logger.log(
        `✅ Job request email sent to provider ${emailToUse} for job #${jobDetails.jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send job request email to ${providerEmail}`,
        error,
      );
      // Don't throw - email failures shouldn't break the job creation flow
    }
  }

  /**
   * Send email to service provider when deal is closed
   */
  async sendDealClosedEmailToProvider(
    providerEmail: string,
    providerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      customerName: string;
      location: string;
      price: number;
    },
  ): Promise<void> {
    try {
      const emailToUse = this.getEmailAddress(providerEmail, 'provider');
      if (!emailToUse) {
        this.logger.warn(`⚠️ No email address available for provider, skipping email for job #${jobDetails.jobId}`);
        return;
      }

      const subject = `✅ Deal Closed - Start Work: Job #${jobDetails.jobId}`;
      const htmlContent = this.getDealClosedEmailTemplate(
        providerName,
        jobDetails,
      );

      const message = {
        to: emailToUse,
        from: this.fromEmail,
        subject,
        html: htmlContent,
        text: this.getDealClosedEmailText(providerName, jobDetails),
      };

      await sgMail.send(message);
      this.logger.log(
        `✅ Deal closed email sent to provider ${emailToUse} for job #${jobDetails.jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send deal closed email to ${providerEmail}`,
        error,
      );
      // Don't throw - email failures shouldn't break the workflow
    }
  }

  /**
   * Send email to customer when provider accepts the job
   */
  async sendJobAcceptedEmailToCustomer(
    providerId: number,
    customerEmail: string,
    customerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      providerName: string;
      price: number;
    },
  ): Promise<void> {
    try {
      const emailToUse = this.getEmailAddress(customerEmail, 'customer');
      if (!emailToUse) {
        this.logger.warn(`⚠️ No email address available for customer, skipping email for job #${jobDetails.jobId}`);
        return;
      }

      // Check if provider has custom email template
      const customTemplate = await this.prisma.sp_email_templates.findUnique({
        where: { provider_id: providerId },
      });

      let subject: string;
      let htmlContent: string;
      let textContent: string;

      if (customTemplate?.job_accepted_subject && customTemplate?.job_accepted_body) {
        // Use custom template
        const variables = {
          customerName,
          serviceName: jobDetails.serviceName,
          providerName: jobDetails.providerName,
          price: jobDetails.price.toFixed(2),
          jobId: jobDetails.jobId,
        };

        subject = this.replaceVariables(customTemplate.job_accepted_subject, variables);
        htmlContent = this.replaceVariables(customTemplate.job_accepted_body, variables);
        textContent = this.stripHtmlTags(htmlContent);

        this.logger.log(
          `✉️ Using custom job accepted email template for provider #${providerId}`,
        );
      } else {
        // Use system default template
        subject = `✅ Your ${jobDetails.serviceName} Request Has Been Accepted!`;
        htmlContent = this.getJobAcceptedEmailTemplate(
          customerName,
          jobDetails,
        );
        textContent = this.getJobAcceptedEmailText(customerName, jobDetails);

        this.logger.log(
          `✉️ Using default job accepted email template for provider #${providerId}`,
        );
      }

      const message = {
        to: emailToUse,
        from: this.fromEmail,
        subject,
        html: htmlContent,
        text: textContent,
      };

      await sgMail.send(message);
      this.logger.log(
        `✅ Job accepted email sent to customer ${emailToUse} for job #${jobDetails.jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send job accepted email to ${customerEmail}`,
        error,
      );
      // Don't throw - email failures shouldn't break the workflow
    }
  }

  /**
   * Send email to customer when provider negotiates/proposes changes
   */
  async sendJobNegotiationEmailToCustomer(
    providerId: number,
    customerEmail: string,
    customerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      providerName: string;
      negotiationNotes: string;
      editedPrice?: number;
      editedSchedule?: string;
      originalPrice?: number;
    },
  ): Promise<void> {
    try {
      const emailToUse = this.getEmailAddress(customerEmail, 'customer');
      if (!emailToUse) {
        this.logger.warn(`⚠️ No email address available for customer, skipping email for job #${jobDetails.jobId}`);
        return;
      }

      // Check if provider has custom email template
      const customTemplate = await this.prisma.sp_email_templates.findUnique({
        where: { provider_id: providerId },
      });

      let subject: string;
      let htmlContent: string;
      let textContent: string;

      if (customTemplate?.negotiation_subject && customTemplate?.negotiation_body) {
        // Use custom template
        const variables = {
          customerName,
          providerName: jobDetails.providerName,
          serviceName: jobDetails.serviceName,
          originalPrice: jobDetails.originalPrice?.toFixed(2) || '',
          newPrice: jobDetails.editedPrice?.toFixed(2) || '',
          newSchedule: jobDetails.editedSchedule || '',
          providerNotes: jobDetails.negotiationNotes,
          jobId: jobDetails.jobId,
        };

        subject = this.replaceVariables(customTemplate.negotiation_subject, variables);
        htmlContent = this.replaceVariables(customTemplate.negotiation_body, variables);
        textContent = this.stripHtmlTags(htmlContent);

        this.logger.log(
          `✉️ Using custom negotiation email template for provider #${providerId}`,
        );
      } else {
        // Use system default template
        subject = `💬 ${jobDetails.providerName} Proposed Changes to Your Request`;
        htmlContent = this.getJobNegotiationEmailTemplate(
          customerName,
          jobDetails,
        );
        textContent = this.getJobNegotiationEmailText(customerName, jobDetails);

        this.logger.log(
          `✉️ Using default negotiation email template for provider #${providerId}`,
        );
      }

      const message = {
        to: emailToUse,
        from: this.fromEmail,
        subject,
        html: htmlContent,
        text: textContent,
      };

      await sgMail.send(message);
      this.logger.log(
        `✅ Job negotiation email sent to customer ${emailToUse} for job #${jobDetails.jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send job negotiation email to ${customerEmail}`,
        error,
      );
      // Don't throw - email failures shouldn't break the workflow
    }
  }

  // ==================== EMAIL TEMPLATES ====================

  private getJobRequestEmailTemplate(
    providerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      customerName: string;
      location: string;
      price?: number;
      scheduledAt?: string;
    },
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Job Request</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🔔 New Job Request</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px;">Hi ${providerName},</p>
          <p style="font-size: 16px;">You have received a new <strong>${jobDetails.serviceName}</strong> request from <strong>${jobDetails.customerName}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="margin-top: 0; color: #667eea;">Job Details</h2>
            <p><strong>Job ID:</strong> #${jobDetails.jobId}</p>
            <p><strong>Service:</strong> ${jobDetails.serviceName}</p>
            <p><strong>Customer:</strong> ${jobDetails.customerName}</p>
            <p><strong>Location:</strong> ${jobDetails.location}</p>
            ${jobDetails.price ? `<p><strong>Price:</strong> $${jobDetails.price.toFixed(2)}</p>` : ''}
            ${jobDetails.scheduledAt ? `<p><strong>Scheduled Date:</strong> ${new Date(jobDetails.scheduledAt).toLocaleDateString()}</p>` : ''}
          </div>
          
          <p style="font-size: 16px;">Please log in to your provider dashboard to review and respond to this request.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/provider/jobs/${jobDetails.jobId}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Job Request
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private getDealClosedEmailTemplate(
    providerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      customerName: string;
      location: string;
      price: number;
    },
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deal Closed - Start Work</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✅ Deal Closed - Start Work!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px;">Hi ${providerName},</p>
          <p style="font-size: 16px;">Great news! <strong>${jobDetails.customerName}</strong> has closed the deal for your <strong>${jobDetails.serviceName}</strong> service.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #11998e;">
            <h2 style="margin-top: 0; color: #11998e;">Job Details</h2>
            <p><strong>Job ID:</strong> #${jobDetails.jobId}</p>
            <p><strong>Service:</strong> ${jobDetails.serviceName}</p>
            <p><strong>Customer:</strong> ${jobDetails.customerName}</p>
            <p><strong>Location:</strong> ${jobDetails.location}</p>
            <p><strong>Price:</strong> $${jobDetails.price.toFixed(2)}</p>
          </div>
          
          <p style="font-size: 16px;">The job is now <strong>in progress</strong>. You can start working on it!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/provider/jobs/${jobDetails.jobId}" 
               style="background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Job Details
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private getJobAcceptedEmailTemplate(
    customerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      providerName: string;
      price: number;
    },
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Accepted</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✅ Your Request Has Been Accepted!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px;">Hi ${customerName},</p>
          <p style="font-size: 16px;">Great news! <strong>${jobDetails.providerName}</strong> has accepted your <strong>${jobDetails.serviceName}</strong> request.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="margin-top: 0; color: #667eea;">Job Details</h2>
            <p><strong>Job ID:</strong> #${jobDetails.jobId}</p>
            <p><strong>Service:</strong> ${jobDetails.serviceName}</p>
            <p><strong>Service Provider:</strong> ${jobDetails.providerName}</p>
            <p><strong>Price:</strong> $${jobDetails.price.toFixed(2)}</p>
          </div>
          
          <p style="font-size: 16px;">You can now review the details and close the deal to start the work!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/customer/bookings/${jobDetails.jobId}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Review & Close Deal
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private getJobNegotiationEmailTemplate(
    customerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      providerName: string;
      negotiationNotes: string;
      editedPrice?: number;
      editedSchedule?: string;
      originalPrice?: number;
    },
  ): string {
    const hasPriceChange = jobDetails.editedPrice !== undefined;
    const hasScheduleChange = jobDetails.editedSchedule !== undefined;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Negotiation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">💬 Changes Proposed</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px;">Hi ${customerName},</p>
          <p style="font-size: 16px;"><strong>${jobDetails.providerName}</strong> has proposed some changes to your <strong>${jobDetails.serviceName}</strong> request.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c;">
            <h2 style="margin-top: 0; color: #f5576c;">Proposed Changes</h2>
            <p><strong>Job ID:</strong> #${jobDetails.jobId}</p>
            <p><strong>Service:</strong> ${jobDetails.serviceName}</p>
            ${hasPriceChange ? `
              <p><strong>Price:</strong> 
                <span style="text-decoration: line-through; color: #999;">$${jobDetails.originalPrice?.toFixed(2) || 'N/A'}</span> 
                → <span style="color: #f5576c; font-weight: bold;">$${jobDetails.editedPrice.toFixed(2)}</span>
              </p>
            ` : ''}
            ${hasScheduleChange ? `
              <p><strong>Scheduled Date:</strong> <span style="color: #f5576c; font-weight: bold;">${new Date(jobDetails.editedSchedule!).toLocaleDateString()}</span></p>
            ` : ''}
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
              <p style="margin: 0;"><strong>Provider's Notes:</strong></p>
              <p style="margin: 10px 0 0 0;">${jobDetails.negotiationNotes}</p>
            </div>
          </div>
          
          <p style="font-size: 16px;">Please review these changes and approve or continue negotiating in the app.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/customer/bookings/${jobDetails.jobId}" 
               style="background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Review Changes
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  // ==================== TEXT VERSIONS (for email clients that don't support HTML) ====================

  private getJobRequestEmailText(
    providerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      customerName: string;
      location: string;
      price?: number;
      scheduledAt?: string;
    },
  ): string {
    return `
New Job Request

Hi ${providerName},

You have received a new ${jobDetails.serviceName} request from ${jobDetails.customerName}.

Job Details:
- Job ID: #${jobDetails.jobId}
- Service: ${jobDetails.serviceName}
- Customer: ${jobDetails.customerName}
- Location: ${jobDetails.location}
${jobDetails.price ? `- Price: $${jobDetails.price.toFixed(2)}` : ''}
${jobDetails.scheduledAt ? `- Scheduled Date: ${new Date(jobDetails.scheduledAt).toLocaleDateString()}` : ''}

Please log in to your provider dashboard to review and respond to this request.

This is an automated notification. Please do not reply to this email.
    `.trim();
  }

  private getDealClosedEmailText(
    providerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      customerName: string;
      location: string;
      price: number;
    },
  ): string {
    return `
Deal Closed - Start Work!

Hi ${providerName},

Great news! ${jobDetails.customerName} has closed the deal for your ${jobDetails.serviceName} service.

Job Details:
- Job ID: #${jobDetails.jobId}
- Service: ${jobDetails.serviceName}
- Customer: ${jobDetails.customerName}
- Location: ${jobDetails.location}
- Price: $${jobDetails.price.toFixed(2)}

The job is now in progress. You can start working on it!

This is an automated notification. Please do not reply to this email.
    `.trim();
  }

  private getJobAcceptedEmailText(
    customerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      providerName: string;
      price: number;
    },
  ): string {
    return `
Your Request Has Been Accepted!

Hi ${customerName},

Great news! ${jobDetails.providerName} has accepted your ${jobDetails.serviceName} request.

Job Details:
- Job ID: #${jobDetails.jobId}
- Service: ${jobDetails.serviceName}
- Service Provider: ${jobDetails.providerName}
- Price: $${jobDetails.price.toFixed(2)}

You can now review the details and close the deal to start the work!

This is an automated notification. Please do not reply to this email.
    `.trim();
  }

  private getJobNegotiationEmailText(
    customerName: string,
    jobDetails: {
      jobId: number;
      serviceName: string;
      providerName: string;
      negotiationNotes: string;
      editedPrice?: number;
      editedSchedule?: string;
      originalPrice?: number;
    },
  ): string {
    const hasPriceChange = jobDetails.editedPrice !== undefined;
    const hasScheduleChange = jobDetails.editedSchedule !== undefined;

    return `
Changes Proposed

Hi ${customerName},

${jobDetails.providerName} has proposed some changes to your ${jobDetails.serviceName} request.

Proposed Changes:
- Job ID: #${jobDetails.jobId}
- Service: ${jobDetails.serviceName}
${hasPriceChange ? `- Price: $${jobDetails.originalPrice?.toFixed(2) || 'N/A'} → $${jobDetails.editedPrice.toFixed(2)}` : ''}
${hasScheduleChange ? `- Scheduled Date: ${new Date(jobDetails.editedSchedule!).toLocaleDateString()}` : ''}

Provider's Notes:
${jobDetails.negotiationNotes}

Please review these changes and approve or continue negotiating in the app.

This is an automated notification. Please do not reply to this email.
    `.trim();
  }

  /**
   * Send weekly availability confirmation reminder to service provider
   */
  async sendAvailabilityConfirmationReminder(
    providerEmail: string,
    providerDetails: {
      id: number;
      name: string;
      rating: number;
      tier: string;
      totalJobs: number;
      serviceAreas: string;
      services: string;
    },
  ): Promise<void> {
    try {
      const emailToUse = this.getEmailAddress(providerEmail, 'provider');
      if (!emailToUse) {
        this.logger.warn(
          `⚠️ No email for provider #${providerDetails.id}`,
        );
        return;
      }

      const subject = `Weekly Availability Check - Please Confirm Your Profile`;
      const htmlContent = this.getAvailabilityConfirmationEmailTemplate(
        providerDetails,
      );
      const textContent = this.stripHtmlTags(htmlContent);

      const message = {
        to: emailToUse,
        from: this.fromEmail,
        subject,
        html: htmlContent,
        text: textContent,
      };

      await sgMail.send(message);
      this.logger.log(
        `✉️ Availability reminder sent to provider #${providerDetails.id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send availability reminder to provider #${providerDetails.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * HTML email template for availability confirmation
   */
  private getAvailabilityConfirmationEmailTemplate(providerDetails: {
    id: number;
    name: string;
    rating: number;
    tier: string;
    totalJobs: number;
    serviceAreas: string;
    services: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Availability Check</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">📅 Weekly Availability Check</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px;">Hi ${providerDetails.name},</p>
          
          <p style="font-size: 16px;">This is your weekly reminder to confirm your availability and verify your profile details.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="margin-top: 0; color: #667eea;">Your Profile Summary</h2>
            <p><strong>Rating:</strong> ⭐ ${providerDetails.rating.toFixed(2)} / 5.0</p>
            <p><strong>Tier:</strong> ${providerDetails.tier}</p>
            <p><strong>Total Jobs:</strong> ${providerDetails.totalJobs}</p>
            <p><strong>Service Areas:</strong> ${providerDetails.serviceAreas}</p>
            <p><strong>Services:</strong> ${providerDetails.services}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px;">
              <strong>📌 Action Required:</strong> Please review your profile and confirm that your information is accurate and up-to-date.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/provider/profile" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View & Confirm Profile
            </a>
          </div>
          
          <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px; line-height: 1.8;">
            <p style="margin: 0 0 10px 0;"><strong>Why we send this:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              <li>To ensure your profile information is current and accurate</li>
              <li>To confirm your availability to serve customers</li>
              <li>To keep your profile visible and active in our system</li>
            </ul>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>Need to update your availability?</strong><br>
            Log in to your dashboard and update your service areas, rates, or set your status to inactive if needed.
          </p>
          
          <p style="font-size: 14px; color: #999; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            This is an automated notification. Please do not reply to this email. If you have questions, please contact support.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}
