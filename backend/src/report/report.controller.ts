import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { MockAuthGuard } from '../common/guards/mock-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';

@Controller()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('reports')
  @UseGuards(MockAuthGuard)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportService.create(user.userId, dto);
  }

  @Get('admin/reports')
  @UseGuards(MockAuthGuard, AdminGuard)
  findAll() {
    return this.reportService.findAll();
  }

  @Post('admin/reports/:id/resolve')
  @HttpCode(200)
  @UseGuards(MockAuthGuard, AdminGuard)
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportService.resolve(id, user.userId, dto);
  }

  @Post('admin/reports/:id/restore')
  @HttpCode(200)
  @UseGuards(MockAuthGuard, AdminGuard)
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportService.restore(id, user.userId);
  }
}
