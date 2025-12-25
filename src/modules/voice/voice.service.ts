import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
const AccessToken = require('twilio').jwt.AccessToken;
const VoiceResponse = require('twilio').twiml.VoiceResponse;

@Injectable()
export class VoiceService {
  private twilioClient: Twilio;
  private accountSid: string;
  private authToken: string;
  private apiKey: string;
  private apiSecret: string;
  private twimlAppSid: string;
  private twilioPhoneNumber: string;

  constructor(private configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.apiKey = this.configService.get<string>('TWILIO_API_KEY');
    this.apiSecret = this.configService.get<string>('TWILIO_API_SECRET');
    this.twimlAppSid = this.configService.get<string>('TWILIO_TWIML_APP_SID');
    this.twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    this.twilioClient = new Twilio(this.accountSid, this.authToken);
  }

  /**
   * Generate Access Token for browser client
   * This allows the browser to make/receive calls via Twilio
   */
  generateAccessToken(identity: string): string {
    console.log('🔑 [VOICE.SERVICE] Generating Access Token for:', identity);
    
    const VoiceGrant = AccessToken.VoiceGrant;

    // Use API Key and API Secret for token generation
    const token = new AccessToken(
      this.accountSid,
      this.apiKey,  // ✅ API Key (not Account SID)
      this.apiSecret,  // ✅ API Secret (not Auth Token)
      {
        identity: identity,
        ttl: 3600, // 1 hour expiration
      },
    );

    // Grant the token access to Twilio Voice
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: this.twimlAppSid,
      incomingAllow: true,
    });
    token.addGrant(voiceGrant);

    const jwtToken = token.toJwt();
    console.log('✅ [VOICE.SERVICE] Token generated successfully');
    console.log(`   Expires in: 3600 seconds`);
    console.log(`   Identity: ${identity}`);
    console.log(`   API Key used: ${this.apiKey}`);

    // Return the token as a JWT string
    return jwtToken;
  }

  /**
   * Generate TwiML response to dial provider's phone
   * Uses fixed provider phone number from environment
   * This is called by Twilio when a call is initiated from the browser
   */
  generateTwiML(): string {
    console.log('🔥 [VOICE.SERVICE] generateTwiML called');
    
    const response = new VoiceResponse();

    const providerPhoneNumber = this.configService.get<string>(
      'PROVIDER_PHONE_NUMBER',
    );

    console.log(`📱 Caller ID: ${this.twilioPhoneNumber}`);
    console.log(`📞 Provider Phone: ${providerPhoneNumber}`);

    // Create a Dial action that will call the provider's actual phone number
    const dial = response.dial({
      callerId: this.twilioPhoneNumber,
    });

    // Dial the provider's real phone number
    dial.number(providerPhoneNumber);

    const xml = response.toString();
    console.log('✅ [VOICE.SERVICE] Generated TwiML:', xml);

    return xml;
  }

  /**
   * Log call status from Twilio callbacks
   * This tracks call duration, status, and other important metrics
   */
  logCallEvent(callData: any): void {
    console.log('📞 [VOICE.SERVICE] Call Event Logged:', {
      callSid: callData.CallSid,
      from: callData.From,
      to: callData.To,
      callStatus: callData.CallStatus,
      duration: callData.CallDuration || 0,
      timestamp: new Date().toISOString(),
    });

    // TODO: In future, store this in database (voice_calls table)
    // For now, just logging to console for development
  }

  /**
   * Calculate call cost based on Twilio pricing
   */
  calculateCallCost(durationSeconds: number): number {
    const webLegCostPerMin = 0.004; // $0.004 per minute (browser to Twilio)
    const phoneLegCostPerMin = 0.014; // $0.014 per minute (Twilio to phone)
    const totalCostPerMin = webLegCostPerMin + phoneLegCostPerMin;

    const durationMinutes = durationSeconds / 60;
    const cost = parseFloat((durationMinutes * totalCostPerMin).toFixed(4));
    
    console.log(`💰 [VOICE.SERVICE] Call Cost Calculated:`, {
      durationSeconds,
      durationMinutes: durationMinutes.toFixed(2),
      costPerMin: totalCostPerMin,
      totalCost: `$${cost}`,
    });

    return cost;
  }
}
