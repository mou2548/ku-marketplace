import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SellersService } from './sellers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellers: SellersService) {}
  @Get(':sellerId')
  @Header('Cache-Control', 'no-store')
  profile(@Param('sellerId') id: string) {
    return this.sellers.profile(this.sellers.id(id));
  }
  @Get(':sellerId/posts')
  @Header('Cache-Control', 'no-store')
  posts(@Param('sellerId') id: string, @Query() query: Record<string, string>) {
    return this.sellers.listings(this.sellers.id(id), query);
  }
}

@Controller('users/me/following')
@UseGuards(JwtAuthGuard)
export class FollowingController {
  constructor(private readonly sellers: SellersService) {}
  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, string>,
  ) {
    return this.sellers.following(user.userId, query);
  }
  @Get(':sellerId')
  @Header('Cache-Control', 'private, no-store')
  state(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sellerId') id: string,
  ) {
    return this.sellers.state(user.userId, this.sellers.id(id));
  }
  @Put(':sellerId')
  @Header('Cache-Control', 'private, no-store')
  follow(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sellerId') id: string,
  ) {
    return this.sellers.follow(user.userId, this.sellers.id(id));
  }
  @Delete(':sellerId')
  @HttpCode(204)
  unfollow(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sellerId') id: string,
  ) {
    return this.sellers.unfollow(user.userId, this.sellers.id(id));
  }
}
