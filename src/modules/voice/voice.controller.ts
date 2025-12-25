import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  BadRequestException,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { VoiceService } from './voice.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/voice')
export class VoiceController {
  constructor(private voiceService: VoiceService) {}

  /**
   * POST /api/voice/token
   * Generate Access Token for authenticated browser client
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('token')
  generateToken(@Req() req: Request): { token: string } {
    try {
      // Extract user from request - try multiple possible locations
      const user = req.user as any;
      
      if (!user) {
        throw new UnauthorizedException('No user found in request');
      }

      // Get user ID from JWT payload (try both 'id' and 'sub')
      const userId = user.id || user.sub;

      if (!userId) {
        console.log('❌ User object:', user);
        throw new UnauthorizedException('User ID not found in token');
      }

      // Create unique identity
      const identity = `user_${userId}`;
      console.log(`✅ Generating token for identity: ${identity}`);

      const token = this.voiceService.generateAccessToken(identity);

      return { token };
    } catch (error) {
      console.error('❌ Token generation error:', error);
      throw new BadRequestException(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * POST /api/voice/dial
   * Called by Twilio when a call is initiated
   */
  @Post('dial')
  dialProvider(@Body() body: any, @Req() req: Request, @Res() res: Response): void {
    try {
      // Log incoming request from Twilio
      console.log('🎯 [VOICE.CONTROLLER] /dial endpoint called');
      console.log('📦 Request Headers:', {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        host: req.headers['host'],
      });
      console.log('📨 Request Body:', body);
      console.log('🌍 Request IP:', req.ip);

      // Check if it's from Twilio
      const isTwilio = req.headers['user-agent']?.includes('Twilio');
      console.log(`✅ Is from Twilio: ${isTwilio ? 'YES' : 'Unknown (could be Twilio)'}`);

      const twiml = this.voiceService.generateTwiML();
      res.type('text/xml').send(twiml);

      console.log('✅ [VOICE.CONTROLLER] TwiML sent to Twilio');
    } catch (error) {
      console.error('❌ Dial Error:', error);
      res.status(400).send('<Response><Say>Error processing call</Say></Response>');
    }
  }

  /**
   * POST /api/voice/status-callback
   * Called by Twilio when call status changes
   */
  @Post('status-callback')
  statusCallback(@Body() body: any, @Req() req: Request, @Res() res: Response): void {
    try {
      console.log('📞 [VOICE.CONTROLLER] /status-callback endpoint called');
      console.log('📦 Request from:', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      console.log('📨 Callback Data:', {
        callSid: body.CallSid,
        callStatus: body.CallStatus,
        from: body.From,
        to: body.To,
        duration: body.CallDuration,
      });

      this.voiceService.logCallEvent(body);

      if (body.CallStatus === 'completed' && body.CallDuration) {
        const cost = this.voiceService.calculateCallCost(
          parseInt(body.CallDuration),
        );
        console.log(`💰 Call Cost: $${cost}`);
      }

      console.log('✅ [VOICE.CONTROLLER] Status callback processed');
      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Status Callback Error:', error);
      res.status(200).send('OK');
    }
  }
}