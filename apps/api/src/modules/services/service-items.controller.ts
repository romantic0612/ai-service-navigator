import { Controller, Get, Query } from '@nestjs/common';
import { ServiceItemsService } from './service-items.service';

@Controller('service-items')
export class ServiceItemsController {
  constructor(private readonly serviceItemsService: ServiceItemsService) {}

  @Get('search')
  search(@Query('q') query = '') {
    return this.serviceItemsService.search(query);
  }
}
