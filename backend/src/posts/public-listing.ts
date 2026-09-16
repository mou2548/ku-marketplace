import { Prisma } from '@prisma/client';

/** One predicate for public discovery and new transaction entry points. */
export function publicListing(sellerId?: number): Prisma.PostWhereInput {
  return {
    status: 'Active',
    deletedAt: null,
    quantityRemaining: { gt: 0 },
    item: {
      status: 'Listed',
      deletedAt: null,
      ...(sellerId === undefined ? {} : { ownerId: sellerId }),
      owner: { status: 'Active' },
    },
  };
}

export const publicPostInclude = {
  item: {
    include: {
      images: {
        where: { status: 'Active' },
        orderBy: { displayOrder: 'asc' as const },
      },
      owner: {
        select: {
          userId: true,
          firstNameEn: true,
          lastNameEn: true,
          emailVerifiedAt: true,
        },
      },
    },
  },
} satisfies Prisma.PostInclude;
