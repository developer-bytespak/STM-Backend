import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('authentication')
export class OAuthController {
  constructor() {}

  // TODO: Implement authentication endpoints
}