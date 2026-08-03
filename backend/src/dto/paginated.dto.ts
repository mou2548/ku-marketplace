export class Paginated<T> {
    constructor(
      public items: T[],
      public meta: { page: number; limit: number; total: number; totalPages: number },
    ) {}
  }