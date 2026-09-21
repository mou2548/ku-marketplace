# สรุปการแก้ไข + ผลการทดสอบ

ไฟล์นี้สรุปสิ่งที่แก้ในรอบนี้ และสิ่งที่ผมทดสอบจริงก่อนส่งมอบ (รันแอปจริงกับ Postgres +
Redis จริงในเครื่อง test, ไม่ใช่แค่อ่านโค้ด)

## ไฟล์ที่แก้

- `prisma/schema.prisma` — เติม `@map` ให้ field `status` ครบ 15 ตาราง (ให้ตรงกับชื่อ
  column จริงใน `init.sql` เช่น `user_status`, `item_status`, `post_status` ฯลฯ)
  และเพิ่ม field ที่หายไปจากเดิม: `Post.status`, `ItemImage.status`,
  `GiveawayImage.status`, `ChatRoom.status` พร้อม `Item.deletedAt` และ
  `Post.deletedAt` สำหรับ soft delete
- `src/items/items.service.ts` — `remove()` เปลี่ยนจาก hard delete เป็น soft delete
  (`deletedAt`), `update()` เปลี่ยนการแก้รูปจาก hard `deleteMany` เป็น mark รูปเก่า
  `Inactive` แทน, ทุก query อ่าน (`findAll`, `findOne`, `count`, `getCategories`)
  กรอง `deletedAt: null` และ include เฉพาะรูป `status: 'Active'`
- `src/posts/posts.service.ts` — `deletePost()` เปลี่ยนเป็น soft delete (ยังคง guard
  เดิมที่กันการลบโพสต์ที่มี offer/transaction อยู่), ทุก query ที่อ่าน/ใช้งาน post
  (`findAllPosts`, `getPostById`, `updatePostPrice`, `buyPost`, `createOffer`,
  `getOffers`) กรอง `deletedAt: null`
- `src/report/report.controller.ts` + `report.service.ts` — เพิ่ม `GET /reports`
  (list ของตัวเอง) และ `GET /reports/:id` (ดูรายละเอียด, 403 ถ้าไม่ใช่เจ้าของ)

## ไฟล์ที่ลบ (ไม่ได้ถูกใช้งานที่ไหนเลย ตรวจสอบแล้วว่าไม่มีการ import)

- `src/auth/auth.controller copy.ts`
- `src/mail/mail.service copy.ts`
- `.DS_Store` (ทุกที่)

ไฟล์เหล่านี้ทำให้ `nest build` fail อยู่ก่อนแล้ว (unrelated กับงานที่แก้รอบนี้) เลยลบทิ้ง
ไปด้วยเพื่อให้ build ผ่าน ถ้าเพื่อนในทีมมีอะไรค้างอยู่ในไฟล์เหล่านั้นที่ยังไม่ได้ merge
บอกได้เลยครับ เดี๋ยวช่วยกู้คืนให้

## สิ่งที่ทดสอบจริง (ไม่ใช่แค่ code review)

ตั้ง PostgreSQL 16 + Redis จริง รัน `init.sql` (เวอร์ชันที่มี `deleted_at`) จริง,
`npx prisma generate` จริง, build จริง (`nest build`), รันแอปจริง (`node
dist/src/main.js`) แล้วยิง HTTP request จริงผ่าน curl:

1. **Login** — ผ่านทั้ง 3 user (ตั้ง password จริงเป็น `password123` ชั่วคราวสำหรับ
   test เพราะ hash เดิมใน mock data เป็น placeholder ปลอม)
2. **Soft delete Item** — `DELETE /items/2` → หายจาก `GET /items` และ
   `GET /items/2` (404) แต่ query DB ตรงพบว่าแถวยังอยู่ พร้อม `deleted_at` ถูกตั้งค่า
3. **Soft delete รูปตอนแก้ item** — `PATCH /items/1` พร้อมรูปใหม่ → รูปเก่ากลายเป็น
   `item_image_status = 'Inactive'` (ไม่ถูกลบ), รูปใหม่เป็น `'Active'`, `GET /items/1`
   แสดงเฉพาะรูป Active
4. **Soft delete Post (ผ่านได้)** — สร้าง post ใหม่ที่ไม่มี offer/transaction แล้ว
   `DELETE /posts/:id` → หายจาก `GET /posts` แต่แถวยังอยู่ใน DB, item กลับเป็น
   `Unlisted`
5. **Soft delete Post (ถูกกัน)** — `DELETE` post ที่มี transaction ผูกอยู่ →
   409 Conflict เหมือนเดิม (guard เดิมยังทำงานถูกต้อง)
6. **Ownership guard** — user อื่นพยายามลบ item ของคนอื่น → 403, DB ไม่ถูกแตะ
7. **GET /reports** — user แต่ละคนเห็นเฉพาะ report ของตัวเอง (ทดสอบข้าม 2 user จริง)
8. **GET /reports/:id** — 403 (ไม่ใช่เจ้าของ), 200 (เจ้าของ), 401 (ไม่ login),
   404 (ไม่มีจริง)
9. **Flow เต็ม (จุดเริ่มต้นของงานทั้งหมด)** — สร้าง report → admin resolve →
   reporter เช็คสถานะผ่าน `GET /reports/:id` เห็นผลลัพธ์ที่ถูกต้อง
10. **Spot-check ตารางอื่น** ที่โดน `@map` เปลี่ยน — `GET /transactions`,
    `GET /giveaways/:id`, `GET /appointment-cards`, `GET /admin/reports`
    (admin-only, 403 สำหรับ user ทั่วไป) — ทำงานถูกต้องหมด
11. `npm test` (unit test เดิมของโปรเจกต์) — ผ่าน

## ข้อควรรู้ / ทำต่อได้

- `createPost()` เช็ค "item นี้มี post อยู่แล้วหรือยัง" โดยยังไม่กรอง
  `deletedAt: null` — เพราะ DB มี `UNIQUE` constraint บน `item_id` ของตาราง `Post`
  อยู่แล้ว การจะให้ "list ซ้ำ item เดิมได้หลังลบโพสต์เก่า" ต้องแก้ constraint
  ระดับ database เพิ่ม (ไม่ได้อยู่ใน scope ของรอบนี้) ตอนนี้ถ้า user พยายามโพสต์ item
  ที่เคย (soft-)delete โพสต์ไปแล้ว จะได้ error "สินค้านี้มีโพสต์อยู่แล้ว" ซึ่งกันพังได้
  แต่ข้อความอาจสื่อสารได้แม่นยำกว่านี้
- ยังไม่ได้เพิ่ม soft delete ให้ `Giveaway_Image`/`Chat_Room` แม้ schema จะรองรับ
  `status` แล้ว เพราะไม่มี hard-delete endpoint สำหรับสองตัวนี้อยู่แล้วในโค้ดปัจจุบัน
