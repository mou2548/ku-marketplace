import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { ClassValidatorPipe } from '../common/pipes/class-validator.pipe';

@Controller()
@UsePipes(ClassValidatorPipe)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportService.create(user.userId, dto);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: CurrentUserPayload) {
    return this.reportService.findAllForUser(user.userId);
  }

  @Get('reports/:id')
  @UseGuards(JwtAuthGuard)
  findOneMine(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportService.findOneForUser(id, user.userId);
  }

  @Get('admin/reports')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAll() {
    return this.reportService.findAll();
  }

  @Post('admin/reports/:id/resolve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, AdminGuard)
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportService.resolve(id, user.userId, dto);
  }

  @Post('admin/reports/:id/restore')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, AdminGuard)
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportService.restore(id, user.userId);
  }
}
