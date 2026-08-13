export type MembershipTier = 'Free' | 'Silver' | 'Gold' | 'Diamond';

export const MEMBERSHIP_CONFIG: Record<
  MembershipTier,
  { priceBaht: number; postQuota: number | null; badge: string | null }
> = {
  Free: { priceBaht: 0, postQuota: 3, badge: null },
  Silver: { priceBaht: 29, postQuota: 10, badge: 'silver' },
  Gold: { priceBaht: 49, postQuota: 25, badge: 'gold' },
  Diamond: { priceBaht: 89, postQuota: null, badge: 'diamond' },
};

// postQuota: null = ไม่จำกัด (เฉพาะ Diamond)

export const MEMBERSHIP_DURATION_DAYS = 30;