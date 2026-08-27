import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClassValidatorPipe } from '../common/pipes/class-validator.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
@UsePipes(ClassValidatorPipe)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ResponseMessage('ดึงข้อมูลโปรไฟล์สำเร็จ')
  findMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findMe(user.userId);
  }

  @Patch('me')
  @ResponseMessage('แก้ไขโปรไฟล์สำเร็จ')
  updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(user.userId, dto);
  }

  @Delete('me')
  @ResponseMessage('ลบบัญชีสำเร็จ')
  deleteMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.deleteMe(user.userId);
  }
}
