import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateItemDto } from './create-item.dto';

export enum ItemStatus {
  UNLISTED = 'Unlisted',
  LISTED = 'Listed',
  TRANSFERRED = 'Transferred',
}

export class UpdateItemDto extends PartialType(CreateItemDto) {
  @IsEnum(ItemStatus)
  @IsOptional()
  status?: ItemStatus;
}