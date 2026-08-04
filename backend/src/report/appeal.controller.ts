import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AppealService } from './appeal.service';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { DecideAppealDto } from './dto/decide-appeal.dto';
import { MockAuthGuard } from '../common/guards/mock-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { ClassValidatorPipe } from '../common/pipes/class-validator.pipe';

@Controller()
@UsePipes(ClassValidatorPipe)
export class AppealController {
  constructor(private readonly appealService: AppealService) {}

  @Post('appeals')
  @UseGuards(MockAuthGuard)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAppealDto,
  ) {
    return this.appealService.create(user.userId, dto);
  }

  @Post('admin/appeals/:id/decide')
  @HttpCode(200)
  @UseGuards(MockAuthGuard, AdminGuard)
  decide(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: DecideAppealDto,
  ) {
    return this.appealService.decide(id, user.userId, dto);
  }
}
