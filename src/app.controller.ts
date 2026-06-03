import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RequireLogin, RequirePermission } from './decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('aaa')
  @RequireLogin()
  @RequirePermission('ddd')
  aaa() {
    return 'aaa';
  }

  @Get('bbb')
  bbb() {
    return 'bbb';
  }
}
