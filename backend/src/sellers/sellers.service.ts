import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';
import { publicListing, publicPostInclude } from '../posts/public-listing';
import { Paginated } from '../dto/paginated.dto';

const pagination = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});
const listingQuery = pagination.extend({
  q: z.string().trim().max(150).default(''),
  category: z.string().trim().max(50).default(''),
  type: z.enum(['all', 'sell', 'trade']).default('all'),
  sort: z.enum(['latest', 'price_asc', 'price_desc']).default('latest'),
});
const profileSelect = {
  userId: true,
  firstNameEn: true,
  lastNameEn: true,
  emailVerifiedAt: true,
  createdAt: true,
  status: true,
  _count: {
    select: {
      followers: { where: { follower: { status: 'Active' } } },
      items: { where: { posts: { some: publicListing() } } },
    },
  },
} satisfies Prisma.UserSelect;
type ProfileRow = Prisma.UserGetPayload<{ select: typeof profileSelect }>;
function summary(user: ProfileRow) {
  return {
    user_id: user.userId,
    name:
      [user.firstNameEn, user.lastNameEn].filter(Boolean).join(' ').trim() ||
      'KU member',
    is_verified: Boolean(user.emailVerifiedAt),
    member_since: user.createdAt,
    follower_count: user._count.followers,
    active_listing_count: user._count.items,
  };
}
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException('Invalid query parameters');
  return result.data;
}

@Injectable()
export class SellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
  ) {}

  id(raw: string) {
    if (!/^[1-9]\d*$/.test(raw) || Number(raw) > 2147483647) {
      throw new BadRequestException('Invalid seller ID');
    }
    return Number(raw);
  }

  async profile(sellerId: number) {
    const user = await this.prisma.user.findFirst({
      where: { userId: sellerId, status: 'Active' },
      select: profileSelect,
    });
    if (!user) throw new NotFoundException('Seller unavailable');
    return summary(user);
  }

  async listings(sellerId: number, query: unknown) {
    const { page, limit, q, category, type, sort } = parse(listingQuery, query);
    return this.prisma.$transaction(
      async (tx) => {
        if (
          !(await tx.user.findFirst({
            where: { userId: sellerId, status: 'Active' },
            select: { userId: true },
          }))
        ) {
          throw new NotFoundException('Seller unavailable');
        }
        const where: Prisma.PostWhereInput = {
          AND: [
            publicListing(sellerId),
            {
              ...(type === 'all'
                ? {}
                : {
                    postType: {
                      in:
                        type === 'sell'
                          ? ['SellOnly', 'Both']
                          : ['TradeOnly', 'Both'],
                    },
                  }),
              item: {
                ...(category ? { category } : {}),
                ...(q
                  ? {
                      OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { description: { contains: q, mode: 'insensitive' } },
                        { courseName: { contains: q, mode: 'insensitive' } },
                      ],
                    }
                  : {}),
              },
            },
          ],
        };
        const total = await tx.post.count({ where });
        const skip = (page - 1) * limit;
        let rows: Prisma.PostGetPayload<{
          include: typeof publicPostInclude;
        }>[];
        if (sort === 'latest') {
          rows = await tx.post.findMany({
            where,
            include: publicPostInclude,
            skip,
            take: limit,
            orderBy: [
              { createdAt: { sort: 'desc', nulls: 'last' } },
              { postId: 'desc' },
            ],
          });
        } else {
          // Two bounded segments keep trade-only posts after priced posts on every page.
          const priced = { AND: [where, { postType: { not: 'TradeOnly' } }] };
          const pricedCount = await tx.post.count({ where: priced });
          rows =
            skip < pricedCount
              ? await tx.post.findMany({
                  where: priced,
                  include: publicPostInclude,
                  skip,
                  take: limit,
                  orderBy: [
                    { price: sort === 'price_asc' ? 'asc' : 'desc' },
                    { postId: 'desc' },
                  ],
                })
              : [];
          if (rows.length < limit)
            rows.push(
              ...(await tx.post.findMany({
                where: { AND: [where, { postType: 'TradeOnly' }] },
                include: publicPostInclude,
                skip: Math.max(0, skip - pricedCount),
                take: limit - rows.length,
                orderBy: [
                  { createdAt: { sort: 'desc', nulls: 'last' } },
                  { postId: 'desc' },
                ],
              })),
            );
        }
        return new Paginated(
          rows.map((row) => this.posts.serializePost(row)),
          { page, limit, total, totalPages: Math.ceil(total / limit) },
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async state(followerId: number, followedId: number) {
    const profile = await this.profile(followedId);
    const relation = await this.prisma.userFollow.findUnique({
      where: { followerId_followedId: { followerId, followedId } },
    });
    return {
      seller_id: followedId,
      is_following: Boolean(relation),
      follower_count: profile.follower_count,
    };
  }

  async follow(followerId: number, followedId: number) {
    if (followerId === followedId)
      throw new BadRequestException('Cannot follow yourself');
    return this.prisma.$transaction(async (tx) => {
      // All relationship writes lock actors in the same order, including opposite follows.
      const users = await tx.$queryRaw<
        { user_id: number; user_status: string }[]
      >(Prisma.sql`
        SELECT user_id, user_status FROM "User" WHERE user_id IN (${followerId}, ${followedId}) ORDER BY user_id FOR UPDATE`);
      if (users.find((u) => u.user_id === followerId)?.user_status !== 'Active')
        throw new ForbiddenException('Account unavailable');
      if (users.find((u) => u.user_id === followedId)?.user_status !== 'Active')
        throw new NotFoundException('Seller unavailable');
      await tx.userFollow.upsert({
        where: { followerId_followedId: { followerId, followedId } },
        create: { followerId, followedId },
        update: {},
      });
      const count = await tx.userFollow.count({
        where: { followedId, follower: { status: 'Active' } },
      });
      return {
        seller_id: followedId,
        is_following: true,
        follower_count: count,
      };
    });
  }

  async unfollow(followerId: number, followedId: number) {
    await this.prisma.$transaction(async (tx) => {
      const users = await tx.$queryRaw<
        { user_id: number; user_status: string }[]
      >(Prisma.sql`
        SELECT user_id, user_status FROM "User" WHERE user_id IN (${followerId}, ${followedId}) ORDER BY user_id FOR UPDATE`);
      if (users.find((u) => u.user_id === followerId)?.user_status !== 'Active')
        throw new ForbiddenException('Account unavailable');
      await tx.userFollow.deleteMany({ where: { followerId, followedId } });
    });
  }

  async following(followerId: number, query: unknown) {
    const { page, limit } = parse(pagination, query);
    return this.prisma.$transaction(
      async (tx) => {
        const where = { followerId };
        const total = await tx.userFollow.count({ where });
        const rows = await tx.userFollow.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ createdAt: 'desc' }, { followedId: 'desc' }],
          select: { followedId: true, followed: { select: profileSelect } },
        });
        return new Paginated(
          rows.map((row) => ({
            seller_id: row.followedId,
            profile:
              row.followed.status === 'Active' ? summary(row.followed) : null,
          })),
          { page, limit, total, totalPages: Math.ceil(total / limit) },
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
