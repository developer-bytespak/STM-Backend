import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for updating SP email templates
 * All fields are optional - only send what you want to update
 */
export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({
    description: 'Auto-message sent in chat when job is created',
    example: 'Hi [CUSTOMER_NAME]! Thanks for reaching out. We are reviewing your [SERVICE_NAME] request.',
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  first_message_template?: string;

  @ApiPropertyOptional({
    description: 'Email subject when SP accepts a job',
    example: '✅ [PROVIDER_NAME] is Ready for Your [SERVICE_NAME]!',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  job_accepted_subject?: string;

  @ApiPropertyOptional({
    description: 'Email body (HTML) when SP accepts a job',
    example: '<p>Hi [CUSTOMER_NAME],</p><p>We are thrilled to work on your [SERVICE_NAME]!</p>',
    maxLength: 10000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  job_accepted_body?: string;

  @ApiPropertyOptional({
    description: 'Email subject when SP proposes changes',
    example: '💡 Better Solution for Your [SERVICE_NAME]!',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  negotiation_subject?: string;

  @ApiPropertyOptional({
    description: 'Email body (HTML) when SP proposes changes',
    example: '<p>Original: $[ORIGINAL_PRICE]</p><p>New Offer: $[NEW_PRICE]</p>',
    maxLength: 10000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  negotiation_body?: string;
}

/**
 * Response DTO for getting email templates
 */
export class EmailTemplateResponseDto {
  id: number;
  provider_id: number;
  first_message_template: string | null;
  job_accepted_subject: string | null;
  job_accepted_body: string | null;
  negotiation_subject: string | null;
  negotiation_body: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Available variables for templates
 */
export const TEMPLATE_VARIABLES = {
  first_message: [
    { name: '[CUSTOMER_NAME]', description: 'Customer full name' },
    { name: '[SERVICE_NAME]', description: 'Service being requested' },
    { name: '[LOCATION]', description: 'Job location' },
    { name: '[SCHEDULED_DATE]', description: 'Scheduled date for the service' },
  ],
  job_accepted: [
    { name: '[CUSTOMER_NAME]', description: 'Customer full name' },
    { name: '[SERVICE_NAME]', description: 'Service name' },
    { name: '[PROVIDER_NAME]', description: 'Provider/business name' },
    { name: '[PRICE]', description: 'Job price' },
    { name: '[JOB_ID]', description: 'Job ID number' },
  ],
  negotiation: [
    { name: '[CUSTOMER_NAME]', description: 'Customer full name' },
    { name: '[PROVIDER_NAME]', description: 'Provider/business name' },
    { name: '[SERVICE_NAME]', description: 'Service name' },
    { name: '[ORIGINAL_PRICE]', description: 'Original quoted price' },
    { name: '[NEW_PRICE]', description: 'New proposed price' },
    { name: '[NEW_SCHEDULE]', description: 'New proposed schedule' },
    { name: '[PROVIDER_NOTES]', description: 'Provider explanation notes' },
    { name: '[JOB_ID]', description: 'Job ID number' },
  ],
};
