import { Controller, Get } from '@nestjs/common';
@Controller('/')
export class RootController {
  @Get('/')
  getRoot(): string {
    return 'App is running!';
  }

  @Get('/health')
  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'kelola-konten-postiz' };
  }
}
