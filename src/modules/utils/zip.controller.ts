import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZipService } from './zip.service';

@ApiTags('Utils')
@Controller('utils/zip')
export class ZipController {
  constructor(private readonly zipService: ZipService) {}

  @Get(':zip')
  @ApiOperation({ summary: 'Resolve 5-digit ZIP to city/state candidates' })
  @ApiParam({ name: 'zip', description: '5-digit ZIP code' })
  @ApiResponse({ status: 200, description: 'Resolved successfully' })
  async resolve(@Param('zip') zip: string) {
    return this.zipService.resolve(zip);
  }
}


