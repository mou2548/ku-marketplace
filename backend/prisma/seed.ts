// prisma/seed.ts
import { PrismaClient, ItemCondition } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

// 1. Initialize Postgres connection pool & adapter
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 2. Pass adapter to PrismaClient constructor
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // --- Seed Users ---
  const user1 = await prisma.user.upsert({
    where: { email: 'somchai@ku.th' },
    update: {},
    create: {
      email: 'somchai@ku.th',
      first_name_en: 'Somchai',
      last_name_en: 'Jaidee',
      first_name_th: 'สมชาย',
      last_name_th: 'ใจดี',
      password_hash: '$2b$10$dummyhashvalueforseeding1234567890',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane.d@ku.th' },
    update: {},
    create: {
      email: 'jane.d@ku.th',
      first_name_en: 'Jane',
      last_name_en: 'Doe',
      first_name_th: 'เจน',
      last_name_th: 'โด',
      password_hash: '$2b$10$dummyhashvalueforseeding1234567890',
    },
  });

  // --- Seed Categories ---
  const categories = [
    { name: 'หนังสือ/ตำราเรียน', slug: 'textbooks' },
    { name: 'เครื่องเขียน/อุปกรณ์การเรียน', slug: 'stationery' },
    { name: 'อิเล็กทรอนิกส์', slug: 'electronics' },
    { name: 'เสื้อผ้า/แฟชั่น', slug: 'clothing' },
    { name: 'ของใช้ในหอพัก', slug: 'dorm-living' },
    { name: 'กีฬา/ออกกำลังกาย', slug: 'sports' },
    { name: 'อุปกรณ์เฉพาะทาง', slug: 'specialized-equipment' },
    { name: 'จักรยาน/ยานพาหนะ', slug: 'vehicles' },
    { name: 'ตั๋ว/บัตรกิจกรรมในรั้วมหาวิทยาลัย', slug: 'event-tickets' },
    { name: 'อื่น ๆ', slug: 'others' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
  }

  // --- Seed Items ---
  await prisma.item.upsert({
    where: { item_id: 1 },
    update: {},
    create: {
      name: 'iPad Air 5th Gen (64GB, Space Gray)',
      description: 'Used for 1 semester taking lecture notes. Comes with Apple Pencil 2.',
      condition: ItemCondition.very_good,
      status: 'Listed',
      course_name: 'GEN101',
      brand_model: 'Apple iPad Air 5',
      owner: { connect: { user_id: user1.user_id } },
      category: { connect: { slug: 'electronics' } },
      images: {
        create: [
          { image_url: 'uploads/ipad_front.jpg', is_primary: true, display_order: 1 },
        ],
      },
    },
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });