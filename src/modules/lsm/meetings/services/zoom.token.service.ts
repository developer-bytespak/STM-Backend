import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

@Injectable()
export class ZoomTokenService {
  private readonly logger = new Logger(ZoomTokenService.name);
  private token: string | null = null;
  private expiresAt = 0;

  private clientId: string;
  private clientSecret: string;
  private accountId: string;
  private apiBase: string;

  constructor(private configService: ConfigService) {
    this.initializeCredentials();
  }

  private initializeCredentials() {
    this.clientId = this.configService.get<string>('ZOOM_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('ZOOM_CLIENT_SECRET');
    this.accountId = this.configService.get<string>('ZOOM_ACCOUNT_ID');
    this.apiBase = this.configService.get<string>('ZOOM_API_BASE') || 'https://zoom.us';

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new BadRequestException(
        'Missing Zoom credentials: ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_ACCOUNT_ID required',
      );
    }

    this.logger.log('✅ Zoom credentials initialized');
  }

  private getBasicAuth(): string {
    return Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
  }

  private async fetchToken(): Promise<string> {
    try {
      const url = `${this.apiBase}/oauth/token`;
      const params = new URLSearchParams();
      params.append('grant_type', 'account_credentials');
      params.append('account_id', this.accountId);

      const response = await axios.post<ZoomTokenResponse>(url, params.toString(), {
        headers: {
          Authorization: `Basic ${this.getBasicAuth()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, expires_in } = response.data;

      // Set expiry 20 seconds before actual expiry for safety margin
      this.token = access_token;
      this.expiresAt = Date.now() + (expires_in - 20) * 1000;

      this.logger.log('✅ Zoom token refreshed successfully');
      return access_token;
    } catch (error) {
      this.logger.error('Failed to fetch Zoom token', error);
      throw new BadRequestException('Failed to authenticate with Zoom API');
    }
  }

  async getToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still valid
    if (this.token && this.expiresAt && now < this.expiresAt) {
      return this.token;
    }

    return this.fetchToken();
  }
}
