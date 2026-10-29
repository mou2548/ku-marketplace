import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReportService } from '../report/report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { ClassValidatorPipe } from '../common/pipes/class-validator.pipe';
import { ReinstateUserDto, SanctionUserDto } from './dto/sanction-user.dto';

/** The marketplace overview: sales, accounts, deals and items. */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly reports: ReportService,
  ) {}

  @Get('stats/overview')
  @Header('Cache-Control', 'private, no-store')
  overview(@Query() query: Record<string, string>) {
    return this.admin.overview(query);
  }

  @Get('stats/trend')
  @Header('Cache-Control', 'private, no-store')
  trend(@Query() query: Record<string, string>) {
    return this.admin.trend(query);
  }

  @Get('stats/top-posts')
  @Header('Cache-Control', 'private, no-store')
  topPosts(@Query() query: Record<string, string>) {
    return this.admin.topPosts(query);
  }

  @Get('users')
  @Header('Cache-Control', 'private, no-store')
  users(@Query() query: Record<string, string>) {
    return this.admin.users(query);
  }

  @Get('users/:id')
  @Header('Cache-Control', 'private, no-store')
  user(@Param('id', ParseIntPipe) id: number) {
    return this.admin.user(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(200)
  @UsePipes(ClassValidatorPipe)
  suspend(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: SanctionUserDto,
  ) {
    return this.reports.sanctionUser(
      id,
      admin.userId,
      dto.sanction,
      dto.reason,
    );
  }

  @Post('users/:id/reinstate')
  @HttpCode(200)
  @UsePipes(ClassValidatorPipe)
  reinstate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: ReinstateUserDto,
  ) {
    return this.reports.reinstateUser(id, admin.userId, dto.note ?? null);
  }

  @Get('transactions')
  @Header('Cache-Control', 'private, no-store')
  transactions(@Query() query: Record<string, string>) {
    return this.admin.transactions(query);
  }

  @Get('items')
  @Header('Cache-Control', 'private, no-store')
  items(@Query() query: Record<string, string>) {
    return this.admin.items(query);
  }

  @Get('items/:id')
  @Header('Cache-Control', 'private, no-store')
  item(@Param('id', ParseIntPipe) id: number) {
    return this.admin.item(id);
  }

  @Get('subscriptions')
  @Header('Cache-Control', 'private, no-store')
  subscriptions(@Query() query: Record<string, string>) {
    return this.admin.subscriptions(query);
  }
}
