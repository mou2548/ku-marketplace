# KU Marketplace — Data Dictionary

Oct 5, 2026 · @Thanaphut Aksornprasert

## ภาพรวมและข้อตกลง

schema นี้มี 24 ตารางใน 7 กลุ่ม อ้างจาก DBML ฉบับล่าสุด หลังแยกตาราง `Transaction` (คงคอลัมน์ `item_received_confirmed_by_seller_at` ไว้ใน `Transaction` ตามที่ตัดสินใจใน diff note) และเพิ่ม `User_Follow`, `Notification` ให้ตรงกับ schema ที่ใช้จริง กลุ่มในตารางนี้เป็นการจัดหมวดเพื่อให้อ่านง่าย DBML ฉบับล่าสุดไม่มี TableGroup

| กลุ่ม | จำนวน | ตาราง |
| --- | --- | --- |
| ผู้ใช้และสมาชิก | 4 | `User`, `User_Follow`, `Subscription`, `Subscription_Payment` |
| สินค้าและโพสต์ | 3 | `Item`, `Item_Image`, `Post` |
| การซื้อขายและแลกเปลี่ยน | 9 | `Offer`, `Offer_Item`, `Transaction`, `Transaction_Shipment`, `Transaction_Payment`, `Transaction_Cancellation`, `Transaction_Refund`, `Transaction_Refund_Slip`, `Appointment_Card` |
| Giveaway | 3 | `Giveaway_Post`, `Giveaway_Ticket`, `Giveaway_Image` |
| แชต | 2 | `Chat_Room`, `Chat_Message` |
| การดูแล (Moderation) | 2 | `Report`, `Appeal` |
| การแจ้งเตือน | 1 | `Notification` |

### ข้อตกลงที่ใช้ทั้ง schema

| เรื่อง | ข้อตกลง |
| --- | --- |
| การตั้งชื่อ | ชื่อตารางเป็น `Pascal_Snake` ชื่อคอลัมน์เป็น `snake_case` ยกเว้น `User.isAdmin` ที่เป็น camelCase |
| Primary key | ส่วนใหญ่เป็น `<ชื่อ>_id integer` แบบ auto-increment ยกเว้น `Offer_Item` (composite `offer_id + item_id`), `User_Follow` (composite `follower_id + followed_id`) และ `Transaction_Shipment` / `Transaction_Refund` ที่ใช้ `transaction_id` เป็นทั้ง PK และ FK (ความสัมพันธ์ 1:1) |
| สถานะ | คอลัมน์ `*_status` เป็น `varchar(20)` (ยกเว้น `Subscription_Payment.payment_status` เป็น `varchar(25)`) ค่าที่ใช้ได้อยู่ใน note ของ DBML ฐานข้อมูลบังคับค่าด้วย CHECK constraint (ไม่ใช้ PostgreSQL enum) ซึ่ง Prisma และ DBML แสดงไม่ได้ จึงอยู่ใน SQL migration เท่านั้น การเพิ่มค่าใหม่ต้องแก้ CHECK ใน migration ด้วย (ค่าทั้งหมดอยู่ในหัวข้อ Enum reference) |
| เงิน | ราคาและยอดเงินทุกคอลัมน์ใช้ `decimal(10,2)` |
| เวลา | `timestamp` (DBML ไม่ระบุเขตเวลา) สร้างโดย `created_at default now()`; วันที่ล้วนใช้ `date` |
| ลบแบบ soft delete | `Post.deleted_at`, `Item.deleted_at`, `Appointment_Card.deleted_at`, `User_Follow.deleted_at` (ว่าง = ยังมีผล), `User.user_status = 'Deleted'` ส่วนตารางรูปภาพใช้สถานะ `Active`/`Inactive` |
| JSON | `jsonb` ใช้เก็บรายการ URL ใน `evidence_urls` (Report, Appeal) และ `image_urls` (Chat\_Message) |
| ข้อความ | ไม่ใช้ `text` คอลัมน์ข้อความอิสระทุกตัวกำหนดความยาวเป็น `varchar(n)` ได้แก่ 255 (ชื่อหัวข้อ), 500 (เหตุผลปฏิเสธ/ยกเลิก, รายการที่อยากได้แลก, ลิงก์), 1000 (บันทึกผลตัดสิน, เนื้อหาแจ้งเตือน) และ 2000 (คำอธิบาย, ข้อความแชท, รายละเอียดรายงาน/อุทธรณ์) ความยาวทั้งหมดเป็นค่าที่เสนอ ต้องตรวจกับข้อมูลเดิมและ validation ของแอปก่อน |

### สัญลักษณ์ในตารางคอลัมน์

คอลัมน์ · ชนิด · ข้อจำกัด · คำอธิบาย โดยช่องข้อจำกัดใช้: **PK** primary key, **FK → ตาราง.คอลัมน์** foreign key, **UQ** unique, **NN** not null, **ค่า** = default; ช่องว่างคือ null ได้และไม่มีค่าเริ่มต้น

## ผู้ใช้และสมาชิก

### User

บัญชีผู้ใช้ทั้งหมด รวมแอดมิน (แยกด้วย `isAdmin`) เป็นตารางที่ถูกอ้างอิงมากที่สุด

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `user_id` | integer | PK, auto-increment | รหัสผู้ใช้ |
| `email` | varchar(255) | UQ, NN | อีเมลของผู้ใช้ ใช้ระบุตัวตนและไม่ซ้ำกันทั้งระบบ |
| `first_name_en` | varchar(100) | NN | ชื่อจริง (ภาษาอังกฤษ) |
| `last_name_en` | varchar(100) | NN | นามสกุล (ภาษาอังกฤษ) |
| `first_name_th` | varchar(100) | NN | ชื่อจริง (ภาษาไทย) |
| `last_name_th` | varchar(100) | NN | นามสกุล (ภาษาไทย) |
| `avatar_url` | varchar(500) |  | URL รูปโปรไฟล์ ว่าง = ใช้รูป default |
| `password_hash` | varchar(255) | NN | รหัสผ่านที่แฮชแล้ว ไม่เก็บรหัสผ่านจริง |
| `phone_number` | varchar(20) |  | เบอร์โทรศัพท์ |
| `promptpay_id` | varchar(100) |  | รหัส PromptPay ของผู้ใช้ ให้อีกฝ่ายใช้โอนเงินให้ |
| `user_status` | varchar(20) | ค่า `'Active'` | สถานะบัญชี: `Active`, `Suspended`, `Banned`, `Deleted` |
| `email_verified_at` | timestamp |  | เวลาที่ยืนยันอีเมลสำเร็จ ถ้าว่าง = ยังไม่ยืนยัน |
| `isAdmin` | boolean | ค่า `false` | `true` = ผู้ดูแลระบบ ที่ตรวจสลิปสมาชิกและจัดการ report/appeal |
| `created_at` | timestamp | ค่า `now()` | เวลาสมัคร |

### User\_Follow

การติดตามผู้ขาย/ผู้แจก 1 แถว = ผู้ใช้ 1 คนติดตามผู้ใช้อีกคน 1 ครั้ง เป็นตารางเชื่อมที่ไม่มี id ของตัวเอง PK คือ `follower_id` กับ `followed_id` ร่วมกัน (เหมือน `Offer_Item`) จึงมีได้แค่ 1 แถวต่อคู่ผู้ใช้ เลิกติดตามเป็น soft delete คือตั้ง `deleted_at` เป็นเวลาปัจจุบัน ไม่ลบแถว ถ้ากดติดตามคนเดิมอีกครั้งให้ UPDATE แถวเดิมโดยตั้ง `deleted_at` กลับเป็น NULL ไม่ใช่ INSERT ใหม่ (INSERT ซ้ำจะชน PK) query รายชื่อผู้ติดตามและนับจำนวนต้องกรอง `deleted_at IS NULL` schema ยังไม่ห้ามติดตามตัวเอง

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `follower_id` | integer | PK (ร่วม), NN, FK → `User.user_id` | ผู้ที่กดติดตาม |
| `followed_id` | integer | PK (ร่วม), NN, FK → `User.user_id` | ผู้ขายหรือผู้แจกที่ถูกติดตาม |
| `created_at` | timestamp | ค่า `now()` | เวลาที่กดติดตาม |
| `deleted_at` | timestamp |  | เวลาที่เลิกติดตาม (soft delete) ว่าง = ยังติดตามอยู่ ตั้งกลับเป็น NULL เมื่อติดตามซ้ำ |

### Subscription

แพ็กเกจสมาชิกของผู้ใช้ แต่ละแถวคือแพ็กเกจหนึ่งช่วงเวลา

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `subscription_id` | integer | PK, auto-increment | รหัสแพ็กเกจ |
| `user_id` | integer | NN, FK → `User.user_id` | เจ้าของแพ็กเกจ |
| `tier` | varchar(20) | NN | ระดับสมาชิก: `Free`, `Silver`, `Gold`, `Diamond` |
| `posts_used_this_month` | integer | ค่า `0` | จำนวนโพสต์ที่ใช้ไปในเดือนนี้ ใช้คุมโควตาตาม `tier` |
| `subscription_status` | varchar(20) | ค่า `'Active'` | สถานะ: `Active`, `Expired`, `Cancelled` |
| `start_date` | timestamp |  | เวลาเริ่มใช้แพ็กเกจ |
| `end_date` | timestamp |  | เวลาสิ้นสุดแพ็กเกจ |

### Subscription\_Payment

การชำระเงินค่าสมาชิกด้วยสลิป 1 แถว = สลิป 1 ใบ แอดมินเป็นผู้ตรวจ

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `payment_id` | integer | PK, auto-increment | รหัสการชำระเงิน |
| `subscription_id` | integer | NN, FK → `Subscription.subscription_id` | แพ็กเกจที่ชำระให้ |
| `user_id` | integer | NN, FK → `User.user_id` | ผู้ชำระเงิน |
| `amount` | decimal(10,2) | NN | จำนวนเงินที่ชำระ (ทศนิยม 2 ตำแหน่ง หน่วยไม่ระบุใน schema) |
| `slip_image_url` | varchar(500) | NN | URL รูปสลิปการโอนเงิน |
| `payment_status` | varchar(25) | NN, ค่า `'Pending'` | สถานะการตรวจ: `Pending`, `Verified`, `Rejected` |
| `rejection_reason` | varchar(500) |  | เหตุผลที่ปฏิเสธสลิป (มีค่าเมื่อ `Rejected`) |
| `handled_by` | integer | FK → `User.user_id` | แอดมินที่ตรวจสลิป |
| `handled_at` | timestamp |  | เวลาที่แอดมินตัดสิน |
| `created_at` | timestamp | ค่า `now()` | เวลาส่งสลิป |

## สินค้าและโพสต์

### Item

สินค้าของผู้ใช้ ใช้ทั้งสำหรับโพสต์ขาย/แลก และเป็นของที่ผู้ซื้อนำมาแลกใน `Offer_Item` คอลัมน์ `course_name`, `brand_model`, `warranty_expiry`, `size` ใช้เฉพาะสินค้าบางประเภท เป็น NULL ได้เมื่อไม่เกี่ยวข้อง

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `item_id` | integer | PK, auto-increment | รหัสสินค้า |
| `owner_id` | integer | NN, FK → `User.user_id` | เจ้าของสินค้า ไม่เปลี่ยนเมื่อสินค้าถูกโอน (แค่ตั้ง `item_status = 'Transferred'`) ผู้ซื้อที่จะขายต่อต้องสร้าง `Item` ใหม่ |
| `name` | varchar(255) | NN | ชื่อสินค้า |
| `category` | varchar(50) | NN | หมวดหมู่สินค้า (10 ค่า): `Clothing`, `Electronics`, `Home & Living`, `Bags`, `Vehicles`, `Sports`, `Stationery`, `Tickets`, `Books`, `Other` |
| `quantity` | integer | NN | จำนวนสินค้าที่ผู้ใช้เพิ่มเข้ามาใน inventory (ยอดรวมที่ถืออยู่) แต่ละโพสต์เลือกจำนวนจากยอดนี้ไปขายหรือแลก |
| `condition` | varchar(50) | NN | สภาพสินค้า: `New`, `Good`, `Acceptable`, `Poor` |
| `description` | varchar(2000) |  | รายละเอียดสินค้า |
| `item_status` | varchar(20) | ค่า `'Unlisted'` | สถานะ: `Unlisted` (ยังไม่ประกาศ), `Listed` (มีโพสต์), `Transferred` (โอนไปแล้ว แต่ `owner_id` ยังเป็นเจ้าของเดิม) |
| `course_name` | varchar(100) |  | ชื่อรายวิชาที่สินค้าเกี่ยวข้อง |
| `brand_model` | varchar(100) |  | ยี่ห้อและรุ่น |
| `warranty_expiry` | date |  | วันหมดประกัน |
| `size` | varchar(100) |  | ขนาดของสินค้า |
| `created_at` | timestamp | ค่า `now()` | เวลาสร้างรายการ |
| `deleted_at` | timestamp |  | soft delete ว่าง = ยังไม่ถูกลบ เป็นเงื่อนไขหลักที่ query สินค้าทุกตัวใช้กรอง |

### Item\_Image

รูปของสินค้า 1 ชิ้นมีได้หลายรูป

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `image_id` | integer | PK, auto-increment | รหัสรูป |
| `item_id` | integer | NN, FK → `Item.item_id` | สินค้าเจ้าของรูป |
| `item_image_status` | varchar(20) | ค่า `'Active'` | สถานะรูป: `Active`, `Inactive` |
| `image_url` | varchar(500) | NN | URL ของไฟล์รูป |
| `is_primary` | boolean | ค่า `false` | `true` = รูปหลักที่แสดงเป็นปก |
| `display_order` | integer | ค่า `0` | ลำดับการแสดงรูป |
| `created_at` | timestamp | ค่า `now()` | เวลาอัปโหลด |

### Post

โพสต์ประกาศขายหรือแลกสินค้า สินค้า 1 ชิ้น (`Item`) มีได้หลายโพสต์พร้อมกัน (multi-listing: แบ่งจำนวน `Item.quantity` ไปหลายโพสต์) ความสัมพันธ์จึงเป็น N:1 และ `Post.item_id` ไม่ unique

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `post_id` | integer | PK, auto-increment | รหัสโพสต์ |
| `item_id` | integer | NN, FK → `Item.item_id` | สินค้าที่ประกาศ (ไม่ unique: สินค้าเดียวมีได้หลายโพสต์) |
| `description` | varchar(2000) |  | คำอธิบายของโพสต์ |
| `post_type` | varchar(20) | NN | ประเภทโพสต์: `SellOnly` (ขายอย่างเดียว), `TradeOnly` (แลกอย่างเดียว), `Both` |
| `post_status` | varchar(20) | ค่า `'Active'` | สถานะ: `Active`, `Inactive` |
| `price` | decimal(10,2) |  | ราคาต่อหน่วยที่ประกาศ ว่างได้ (ไม่บังคับใส่ราคา เช่น โพสต์ `TradeOnly`) |
| `quantity_total` | integer | NN, ค่า `1` | จำนวนทั้งหมดที่เปิดขายหรือเปิดแลกในโพสต์นี้ เลือกจาก `Item.quantity` ไม่ควรเกินจำนวนที่มี (schema ไม่บังคับ) |
| `quantity_remaining` | integer | NN, ค่า `1` | จำนวนที่ยังเหลือ |
| `wanted_item_offer` | varchar(500) |  | รายการสิ่งของที่ผู้ขายอยากได้แลก (ใช้กับ `TradeOnly`/`Both`) |
| `created_at` | timestamp | ค่า `now()` | เวลาสร้างโพสต์ |
| `deleted_at` | timestamp |  | เวลาที่ลบโพสต์ (soft delete) ว่าง = ยังไม่ถูกลบ |

## การซื้อขายและแลกเปลี่ยน

### Offer

ข้อเสนอแลกเปลี่ยนหรือเสนอซื้อจากผู้สนใจไปยังโพสต์

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `offer_id` | integer | PK, auto-increment | รหัสข้อเสนอ |
| `post_id` | integer | NN, FK → `Post.post_id` | โพสต์ที่ถูกเสนอ |
| `proposer_id` | integer | NN, FK → `User.user_id` | ผู้เสนอ |
| `additional_money` | decimal(10,2) | ค่า `0.00` | เงินที่ผู้เสนอจ่ายเพิ่มนอกจากสิ่งของที่นำมาแลก |
| `offer_status` | varchar(20) | ค่า `'Pending'` | สถานะ: `Pending`, `Accepted`, `Rejected`, `Cancelled`, `Withdrawn` |
| `created_at` | timestamp | ค่า `now()` | เวลาส่งข้อเสนอ |

### Offer\_Item

ตารางเชื่อม many-to-many: 1 ข้อเสนอนำสินค้ามาแลกได้หลายชิ้น

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `offer_id` | integer | PK (ร่วม), NN, FK → `Offer.offer_id` | ข้อเสนอ |
| `item_id` | integer | PK (ร่วม), NN, FK → `Item.item_id` | สินค้าที่นำมาแลกในข้อเสนอนั้น |

### Transaction

ธุรกรรมซื้อขาย/แลกเปลี่ยนหลัก เก็บเฉพาะข้อมูลที่ทุกธุรกรรมมีเหมือนกัน รายละเอียดการจ่ายเงิน จัดส่ง ยกเลิก และคืนเงินแยกไปตารางลูกที่อยู่ถัดไป

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `transaction_id` | integer | PK, auto-increment | รหัสธุรกรรม |
| `post_id` | integer | NN, FK → `Post.post_id` | โพสต์ที่เกิดธุรกรรม |
| `offer_id` | integer | FK → `Offer.offer_id` | ข้อเสนอที่ถูกยอมรับและนำมาสู่ธุรกรรม ว่าง = ซื้อตรงโดยไม่ผ่านข้อเสนอ |
| `buyer_id` | integer | NN, FK → `User.user_id` | ผู้ซื้อ (หรือผู้เสนอแลก) |
| `seller_id` | integer | NN, FK → `User.user_id` | ผู้ขาย ค่าเดียวกับ `Item.owner_id` ของสินค้าในโพสต์ ณ ตอนทำธุรกรรม เก็บไว้เพื่อ query ง่าย ไม่ต้อง join ไปที่ `Post` และ `Item` |
| `quantity` | integer | ค่า `1` | จำนวนสินค้าที่ซื้อ |
| `total_amount` | decimal(10,2) | NN | ยอดเงินสดที่ผู้ซื้อต้องจ่าย ณ ตอนสร้างธุรกรรม (snapshot) ไม่เปลี่ยนตาม `Post.price` ที่แก้ภายหลัง คำนวณแยกตาม `offer_id`: ซื้อตรง (ไม่มี offer) = `Post.price × quantity`; ผ่าน offer = `COALESCE(Offer.additional_money, 0)` อย่างเดียว ไม่บวกราคาโพสต์ ไม่คูณ `quantity` (ตามโค้ดจริง ไม่มีเงินเพิ่ม = 0) |
| `transaction_status` | varchar(20) | ค่า `'Pending'` | สถานะ: `Pending`, `Processing`, `Completed`, `Pending Refund`, `Cancelled`, `Refunded` |
| `delivery_method` | varchar(20) | NN | วิธีส่งมอบ: `Meetup` (นัดรับ), `Shipping` (จัดส่ง) |
| `created_at` | timestamp | ค่า `now()` | เวลาสร้างธุรกรรม |
| `item_received_confirmed_by_buyer_at` | timestamp |  | เวลาที่ผู้ซื้อยืนยันว่าได้รับของ |
| `item_received_confirmed_by_seller_at` | timestamp |  | เวลาที่ผู้ขายยืนยันว่าได้รับของ ใช้กับการแลกเปลี่ยน (ผู้ขายรับของจากผู้ซื้อ) |

### Transaction\_Shipment

ข้อมูลการจัดส่ง มีแถวเฉพาะธุรกรรมที่ `delivery_method = 'Shipping'` (ความสัมพันธ์ 1:1)

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `transaction_id` | integer | PK, FK 1:1 → `Transaction.transaction_id` | ธุรกรรมที่จัดส่ง |
| `tracking_number` | varchar(100) |  | เลขพัสดุ |
| `estimated_delivery_date` | date |  | วันที่คาดว่าจะส่งถึง |
| `shipped_at` | timestamp |  | เวลาที่ผู้ขายส่งของ |

### Transaction\_Payment

สลิปการชำระเงินของธุรกรรม 1 แถว = สลิป 1 ใบ (1:N) ผู้ซื้ออัปโหลดสลิปใหม่ได้หลังถูกปฏิเสธ เก็บประวัติครบ แถวเริ่มที่ `Pending` แล้วถูก UPDATE เป็น `Confirmed`/`Rejected` สลิปปัจจุบันคือแถวล่าสุดตาม `created_at` ตอนอัปโหลดสลิปสถานะธุรกรรมเปลี่ยนเป็น `Processing` ทันที และค้างอยู่ที่ `Processing` แม้สลิปถูกปฏิเสธ (ไม่ย้อนกลับเป็น `Pending` ตามโค้ด `rejectPaymentSlip`) แถวล่าสุดที่เป็น `Rejected` จึงหมายถึงรอผู้ซื้ออัปโหลดใหม่

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `payment_id` | integer | PK, auto-increment | รหัสการชำระเงิน |
| `transaction_id` | integer | NN, FK → `Transaction.transaction_id` | ธุรกรรมที่ชำระให้ |
| `slip_image_url` | varchar(500) | NN | URL รูปสลิปที่ผู้ซื้ออัปโหลด |
| `payment_status` | varchar(20) | ค่า `'Pending'` | สถานะสลิป: `Pending`, `Confirmed`, `Rejected` |
| `rejection_reason` | varchar(500) |  | เหตุผลที่ปฏิเสธสลิป (มีค่าเมื่อ `Rejected`) |
| `handled_by` | integer | FK → `User.user_id` | ผู้ที่ตัดสินสลิป |
| `handled_at` | timestamp |  | เวลาที่ตัดสิน (ยืนยันหรือปฏิเสธ) ว่าง = ยัง `Pending` |
| `created_at` | timestamp | ค่า `now()` | เวลาอัปโหลดสลิป ถือเป็นเวลาที่ผู้ซื้อยืนยันการชำระเงิน (ไม่มีคอลัมน์แยก เพราะ schema เดิม `payment_confirmed_by_buyer_at` ถูกยุบมาที่นี่ ให้ backend ยืนยันสมมติฐานนี้) ส่วนเวลาที่ผู้ขายตัดสินอยู่ที่ `handled_at` |

### Transaction\_Cancellation

คำขอยกเลิกธุรกรรม 1 แถว = คำขอ 1 ครั้ง (1:N) ขอซ้ำได้ถ้าคำขอก่อนหน้าถูกปฏิเสธ

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `cancellation_id` | integer | PK, auto-increment | รหัสคำขอยกเลิก |
| `transaction_id` | integer | NN, FK → `Transaction.transaction_id` | ธุรกรรมที่ขอยกเลิก |
| `requested_by` | integer | NN, FK → `User.user_id` | ผู้ขอยกเลิก |
| `reason` | varchar(500) |  | เหตุผลที่ขอยกเลิก |
| `requested_at` | timestamp | ค่า `now()` | เวลาที่ขอ |
| `response` | varchar(20) | ค่า `'Pending'` | การตอบจากอีกฝ่าย: `Pending`, `Approved`, `Rejected` |
| `responded_at` | timestamp |  | เวลาที่อีกฝ่ายตอบ ว่าง = ยังไม่ตอบ |

### Transaction\_Refund

ข้อมูลระดับธุรกรรมของการคืนเงิน มีแถวเฉพาะธุรกรรมที่อนุมัติยกเลิกหลังชำระเงินแล้ว (ความสัมพันธ์ 1:1) เก็บเวลาที่ผู้ขายยืนยันว่าได้รับของคืน ส่วนสลิปคืนเงินแต่ละใบอยู่ใน `Transaction_Refund_Slip`

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `transaction_id` | integer | PK, FK 1:1 → `Transaction.transaction_id` | ธุรกรรมที่คืนเงิน |
| `item_return_confirmed_at` | timestamp |  | เวลาที่ผู้ขายยืนยันว่าได้รับของคืน |
| `created_at` | timestamp | ค่า `now()` | เวลาสร้างแถวคืนเงิน |

### Transaction\_Refund\_Slip

สลิปคืนเงินของธุรกรรม 1 แถว = สลิป 1 ใบ (1:N) ผู้ขายอัปโหลดสลิปใหม่ได้หลังผู้ซื้อปฏิเสธ เก็บประวัติครบ แถวเริ่มที่ `Pending` แล้วถูก UPDATE เป็น `Confirmed`/`Rejected` โดยผู้ซื้อ (ผู้ตัดสินคือ `Transaction.buyer_id` จึงไม่มี `handled_by`) สลิปปัจจุบันคือแถวล่าสุดตาม `created_at` เมื่อมีแถว `Confirmed` ธุรกรรมเปลี่ยนเป็น `Refunded`

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `refund_slip_id` | integer | PK, auto-increment | รหัสสลิปคืนเงิน |
| `transaction_id` | integer | NN, FK → `Transaction_Refund.transaction_id` | ธุรกรรมที่คืนเงิน (ต้องมีแถว `Transaction_Refund` ก่อน) |
| `refund_slip_url` | varchar(500) | NN | URL สลิปที่ผู้ขายโอนเงินคืน |
| `refund_status` | varchar(20) | ค่า `'Pending'` | สถานะสลิป: `Pending`, `Confirmed`, `Rejected` |
| `rejection_reason` | varchar(500) |  | เหตุผลที่ผู้ซื้อปฏิเสธสลิป (มีค่าเมื่อ `Rejected`) |
| `handled_at` | timestamp |  | เวลาที่ผู้ซื้อตัดสิน (ยืนยันหรือปฏิเสธ) ว่าง = ยัง `Pending` |
| `created_at` | timestamp | ค่า `now()` | เวลาอัปโหลดสลิปคืนเงิน |

### Appointment\_Card

บัตรนัดส่งมอบสำหรับธุรกรรม ที่อีกฝ่ายสามารถยืนยันหรือปฏิเสธ

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `appointment_id` | integer | PK, auto-increment | รหัสนัด |
| `transaction_id` | integer | NN, FK → `Transaction.transaction_id` | ธุรกรรมที่นัด |
| `proposed_by` | integer | NN, FK → `User.user_id` | ผู้เสนอนัด |
| `date` | date | NN | วันที่นัด |
| `time` | time | NN | เวลานัด |
| `location` | varchar(255) | NN | สถานที่นัด |
| `appointment_status` | varchar(20) | ค่า `'Pending'` | สถานะ: `Pending`, `Confirmed`, `Rejected` |
| `created_at` | timestamp | ค่า `now()` | เวลาสร้างบัตรนัด |
| `deleted_at` | timestamp |  | เวลาที่บัตรถูกแทนที่ด้วยบัตรใหม่ หรือถูกอีกฝ่ายปฏิเสธ ว่าง = ยังมีผล ใช้หา "บัตรนัดปัจจุบัน" |

## Giveaway

### Giveaway\_Post

ประกาศแจกของฟรี มีช่วงเวลาลงทะเบียน (`register_*`) และช่วงเวลามารับของ (`pickup_*`)

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `giveaway_id` | integer | PK, auto-increment | รหัสประกาศแจก |
| `item_id` | integer | NN, FK → `Item.item_id` | สินค้าในระบบที่นำมาแจก ชื่อประกาศดึงจาก `Item.name` ผ่านคอลัมน์นี้ จึงต้องมีค่าเสมอ |
| `quantity` | integer | NN, ค่า `1` | จำนวนที่แจก |
| `description` | varchar(2000) |  | รายละเอียด |
| `pickup_location` | varchar(255) | NN | สถานที่มารับของ |
| `giver_id` | integer | NN, FK → `User.user_id` | ผู้แจก |
| `allocation_method` | varchar(20) | NN | วิธีจัดสรร: `FirstCome` (มาก่อนได้ก่อน), `Random` (สุ่ม), `Manual` (ผู้แจกเลือกเอง) |
| `giveaway_status` | varchar(20) | ค่า `'Active'` | สถานะ: `Active`, `Closed`, `Completed` |
| `register_start` | timestamp |  | เวลาเปิดลงทะเบียน |
| `register_deadline` | timestamp |  | เวลาปิดลงทะเบียน |
| `pickup_start` | timestamp |  | เวลาเริ่มรับของได้ |
| `pickup_deadline` | timestamp |  | เวลาสิ้นสุดการรับของ |
| `drawn_at` | timestamp |  | เวลาที่จัดสรรสิทธิ์ (สุ่ม/เลือก) เสร็จ ว่าง = ยังไม่จัดสรร |
| `created_at` | timestamp | ค่า `now()` | เวลาสร้างประกาศ |

### Giveaway\_Ticket

ตั๋วของผู้ลงทะเบียน/ได้สิทธิ์รับของ 1 แถวต่อการลงทะเบียน 1 ครั้ง ผู้รับคนเดียวกันมีตั๋วหลายใบในประกาศเดียวได้ (เช่น สละสิทธิ์ `Forfeited` แล้วลงทะเบียนใหม่) schema ไม่บังคับ unique `(giveaway_id, receiver_id)` แอปจึงต้องกันการลงทะเบียนซ้ำเมื่อยังมีตั๋ว `Registered`, `Waiting` หรือ `Received` ลำดับคิว `queue_number` ไม่ซ้ำกันภายในประกาศเดียว (unique ร่วมกับ `giveaway_id`) และแต่ละประกาศเริ่มนับที่ 1

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `ticket_id` | integer | PK, auto-increment | รหัสตั๋ว |
| `giveaway_id` | integer | NN, FK → `Giveaway_Post.giveaway_id` | ประกาศแจกที่ตั๋วสังกัด |
| `receiver_id` | integer | NN, FK → `User.user_id` | ผู้รับ (ไม่มี unique คู่กับ `giveaway_id` เพื่อให้ผู้ที่สละสิทธิ์กลับมาลงใหม่ได้ แอปต้องกันซ้ำเอง) |
| `queue_number` | integer | NN, UQ ร่วมกับ `giveaway_id` | ลำดับการเข้าร่วมของผู้รับในประกาศนั้น เริ่มที่ 1 ไม่ซ้ำกันภายในประกาศเดียว |
| `qr_token` | varchar(255) | UQ | โทเคนสำหรับสร้าง QR ที่ใช้ยืนยันการรับของ ไม่ซ้ำกัน |
| `ticket_status` | varchar(20) | ค่า `'Waiting'` | สถานะ: `Registered` (ลงทะเบียนแล้ว ยังไม่ถือสิทธิ์ ใช้กับ `Random`/`Manual`), `Waiting` (ถือสิทธิ์ รอมารับของ; `FirstCome` เริ่มที่ค่านี้ทันที), `NotSelected` (ลงทะเบียนแล้วแต่ไม่ได้รับเลือก), `Received` (สแกน QR รับของทันเวลา), `Forfeited` (สละสิทธิ์เอง), `Expired` (เลยกำหนดรับของ) ค่าเริ่มต้น `Waiting` ตรงกับ `FirstCome` ส่วน `Random`/`Manual` แอปต้องตั้ง `Registered` เอง |
| `qr_issued_at` | timestamp |  | เวลาที่ออก QR ปัจจุบัน ใช้เช็คว่าหมดอายุหรือยัง (อายุ 15 นาทีตามโค้ดปัจจุบัน) |
| `updated_at` | timestamp | ค่า `now()` | เวลาอัปเดตสถานะล่าสุด |

### Giveaway\_Image

รูปของประกาศแจก มีได้หลายรูปต่อประกาศ

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `image_id` | integer | PK, auto-increment | รหัสรูป |
| `giveaway_id` | integer | NN, FK → `Giveaway_Post.giveaway_id` | ประกาศแจกเจ้าของรูป |
| `image_status` | varchar(20) | ค่า `'Active'` | สถานะรูป: `Active`, `Inactive` |
| `image_url` | varchar(500) | NN | URL ของไฟล์รูป |
| `display_order` | integer | ค่า `0` | ลำดับการแสดงรูป |
| `created_at` | timestamp | ค่า `now()` | เวลาอัปโหลด |

## แชต

### Chat\_Room

ห้องสนทนาผูกกับธุรกรรมหรือประกาศแจก **อย่างใดอย่างหนึ่งเท่านั้น** บังคับด้วย CHECK constraint ให้ `transaction_id` กับ `giveaway_id` มีค่าเพียงหนึ่งคอลัมน์ (ยังไม่แสดงใน DBML ต้องเพิ่มใน migration)

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `room_id` | integer | PK, auto-increment | รหัสห้องแชต |
| `transaction_id` | integer | FK → `Transaction.transaction_id` | ธุรกรรมที่ห้องนี้ใช้คุย ว่างได้เมื่อห้องนี้เป็นของประกาศแจก (ต้องมีค่าใน `transaction_id` หรือ `giveaway_id` เพียงอย่างเดียว) |
| `giveaway_id` | integer | FK → `Giveaway_Post.giveaway_id` | ประกาศแจกที่ห้องนี้ใช้คุย ว่างได้เมื่อห้องนี้เป็นของธุรกรรม (ต้องมีค่าใน `transaction_id` หรือ `giveaway_id` เพียงอย่างเดียว) |
| `chat_room_status` | varchar(20) | ค่า `'Active'` | สถานะ: `Active`, `Inactive` |
| `created_at` | timestamp | ค่า `now()` | เวลาสร้างห้อง |

### Chat\_Message

ข้อความในห้องแชต ส่งเป็นข้อความ รูปหรือทั้งสองอย่าง

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `message_id` | integer | PK, auto-increment | รหัสข้อความ |
| `room_id` | integer | NN, FK → `Chat_Room.room_id` | ห้องที่ข้อความอยู่ |
| `sender_id` | integer | NN, FK → `User.user_id` | ผู้ส่ง |
| `content` | varchar(2000) |  | เนื้อหาข้อความ |
| `image_urls` | jsonb |  | รายการ URL รูปที่แนบมากับข้อความ |
| `created_at` | timestamp | ค่า `now()` | เวลาส่ง |

## การดูแล (Moderation)

### Report

รายงานปัญหาจากผู้ใช้ ชี้ไปที่โพสต์ ผู้ใช้ หรือธุรกรรมผ่าน `report_type` + `target_id` ซึ่งไม่มี foreign key จริงในฐานข้อมูล การหา report ของธุรกรรมใช้ `report_type = 'Transaction' AND target_id = <transaction_id>`

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `report_id` | integer | PK, auto-increment | รหัสรายงาน |
| `reporter_id` | integer | NN, FK → `User.user_id` | ผู้แจ้ง |
| `report_type` | varchar(20) | NN | ประเภทที่ถูกแจ้ง: `Post`, `User`, `Transaction` |
| `sanction` | varchar(30) |  | บทลงโทษที่แอดมินเลือกตอนตัดสิน (ตัวพิมพ์เล็ก ตรงกับค่าที่โค้ดเขียนอยู่): `none`, `warn`, `suspend_temporary`, `suspend_permanent` เก็บไว้ที่ report เพื่อให้ appeal ย้อนกลับได้โดยไม่กระทบบทลงโทษอื่นที่ยังมีผล |
| `target_id` | integer | NN, ไม่มี FK | รหัสของสิ่งที่ถูกแจ้ง ความหมายขึ้นกับ `report_type` (`post_id` / `user_id` / `transaction_id`) |
| `reason_category` | varchar(100) | NN | หมวดเหตุผลที่แจ้ง (ค่าอิสระ ไม่มีรายการค่าใน schema) |
| `details` | varchar(2000) |  | รายละเอียดเพิ่มเติม |
| `evidence_urls` | jsonb |  | รายการ URL หลักฐาน เช่น รูปหน้าจอ |
| `report_status` | varchar(20) | ค่า `'Pending'` | สถานะ: `Pending`, `Under_Investigation`, `Violation_Confirmed`, `Report_Dismissed` |
| `handled_by` | integer | FK → `User.user_id` | แอดมินที่รับเรื่อง |
| `resolution_note` | varchar(1000) |  | สรุปผลการตัดสิน |
| `handled_at` | timestamp |  | เวลาที่แอดมินตัดสิน |
| `created_at` | timestamp | ค่า `now()` | เวลาแจ้ง |

### Appeal

คำอุทธรณ์คำตัดสินของ `Report` 1 report มีอุทธรณ์ได้หลายครั้งในทาง schema `appeal_status` เป็น NN แต่ไม่มีค่าเริ่มต้น แอปต้องใส่ `Pending` เองตอนสร้าง

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `appeal_id` | integer | PK, auto-increment | รหัสคำอุทธรณ์ |
| `report_id` | integer | NN, FK → `Report.report_id` | report ที่อุทธรณ์ |
| `appellant_id` | integer | NN, FK → `User.user_id` | ผู้ยื่นอุทธรณ์ |
| `reason` | varchar(2000) | NN | เหตุผลที่อุทธรณ์ |
| `evidence_urls` | jsonb |  | รายการ URL หลักฐานประกอบ |
| `appeal_status` | varchar(20) | NN | สถานะ: `Pending`, `Under_Review`, `Approved`, `Rejected` |
| `handled_by` | integer | FK → `User.user_id` | แอดมินที่พิจารณา |
| `resolution_note` | varchar(1000) |  | สรุปผลการพิจารณา |
| `created_at` | timestamp | ค่า `now()` | เวลายื่นอุทธรณ์ |
| `handled_at` | timestamp |  | เวลาที่พิจารณาเสร็จ |

## การแจ้งเตือน

### Notification

การแจ้งเตือนในแอป 1 แถว = การแจ้งเตือน 1 รายการของผู้รับ 1 คน `event_key` เป็นคีย์ที่ระบุเหตุการณ์ต้นทาง และเป็น unique คู่กับ `user_id` (`(user_id, event_key)` ไม่ซ้ำ) ผู้รับคนเดิมจึงได้การแจ้งเตือนเดิมซ้ำไม่ได้ (เช่น กดปุ่มซ้ำหรือระบบ retry) ส่วนเหตุการณ์เดียวแจ้งหลายคนใช้ `event_key` เดียวกันได้ ไม่ต้องใส่ผู้รับลงในคีย์ คีย์ต้องคงที่ต่อเหตุการณ์เดียวกัน (สร้างจาก id ของเหตุการณ์ ไม่ใส่เวลาปัจจุบันหรือค่าสุ่ม) และ INSERT ควรใช้ `ON CONFLICT DO NOTHING`

| คอลัมน์ | ชนิด | ข้อจำกัด | คำอธิบาย |
| --- | --- | --- | --- |
| `notification_id` | integer | PK, auto-increment | รหัสการแจ้งเตือน |
| `user_id` | integer | NN, FK → `User.user_id` | ผู้รับการแจ้งเตือน |
| `event_key` | varchar(255) | NN, unique ร่วมกับ `user_id` | คีย์ระบุเหตุการณ์ต้นทาง ไม่ซ้ำต่อผู้รับ 1 คน (unique `(user_id, event_key)`) ป้องกันแจ้งเตือนซ้ำให้คนเดิมสำหรับเหตุการณ์เดียวกัน |
| `title` | varchar(255) | NN | หัวข้อการแจ้งเตือน |
| `body` | varchar(1000) | NN | เนื้อหาการแจ้งเตือน |
| `href` | varchar(500) | NN | ลิงก์ปลายทางเมื่อกด |
| `created_at` | timestamp | ค่า `now()` | เวลาที่สร้าง |
| `read_at` | timestamp | ว่างได้ (NULL) | เวลาที่ผู้รับกดอ่าน ว่าง = ยังไม่อ่าน (รีวิวระบุว่าโค้ดฝั่ง develop ยังไม่รองรับคอลัมน์นี้) |

## Enum reference

26 คอลัมน์ใน schema เก็บค่าแบบชุดค่าคงที่ ฐานข้อมูลบังคับด้วย CHECK constraint (ไม่ใช้ PostgreSQL enum) ตารางนี้คือแหล่งเดียวของค่าที่ใช้ได้ ถ้าจะเพิ่มค่าใหม่ต้องแก้ CHECK ผ่าน migration

| คอลัมน์ | ค่าที่ใช้ได้ | ค่าเริ่มต้น |
| --- | --- | --- |
| `User.user_status` | `Active`, `Suspended`, `Banned`, `Deleted` | `Active` |
| `Subscription.tier` | `Free`, `Silver`, `Gold`, `Diamond` | ต้องระบุ |
| `Subscription.subscription_status` | `Active`, `Expired`, `Cancelled` | `Active` |
| `Subscription_Payment.payment_status` | `Pending`, `Verified`, `Rejected` | `Pending` |
| `Item.category` | `Clothing`, `Electronics`, `Home & Living`, `Bags`, `Vehicles`, `Sports`, `Stationery`, `Tickets`, `Books`, `Other` | ต้องระบุ |
| `Item.condition` | `New`, `Good`, `Acceptable`, `Poor` | ต้องระบุ |
| `Item.item_status` | `Unlisted`, `Listed`, `Transferred` | `Unlisted` |
| `Item_Image.item_image_status` | `Active`, `Inactive` | `Active` |
| `Post.post_type` | `SellOnly`, `TradeOnly`, `Both` | ต้องระบุ |
| `Post.post_status` | `Active`, `Inactive` | `Active` |
| `Offer.offer_status` | `Pending`, `Accepted`, `Rejected`, `Cancelled`, `Withdrawn` | `Pending` |
| `Transaction.transaction_status` | `Pending`, `Processing`, `Completed`, `Pending Refund`, `Cancelled`, `Refunded` | `Pending` |
| `Transaction.delivery_method` | `Meetup`, `Shipping` | ต้องระบุ |
| `Transaction_Payment.payment_status` | `Pending`, `Confirmed`, `Rejected` | `Pending` |
| `Transaction_Refund_Slip.refund_status` | `Pending`, `Confirmed`, `Rejected` | `Pending` |
| `Transaction_Cancellation.response` | `Pending`, `Approved`, `Rejected` | `Pending` |
| `Appointment_Card.appointment_status` | `Pending`, `Confirmed`, `Rejected` | `Pending` |
| `Report.report_type` | `Post`, `User`, `Transaction` | ต้องระบุ |
| `Report.sanction` | `none`, `warn`, `suspend_temporary`, `suspend_permanent` | ว่างได้ (ไม่มีค่าเริ่มต้น) |
| `Report.report_status` | `Pending`, `Under_Investigation`, `Violation_Confirmed`, `Report_Dismissed` | `Pending` |
| `Appeal.appeal_status` | `Pending`, `Under_Review`, `Approved`, `Rejected` | ต้องระบุ |
| `Giveaway_Post.allocation_method` | `FirstCome`, `Random`, `Manual` | ต้องระบุ |
| `Giveaway_Post.giveaway_status` | `Active`, `Closed`, `Completed` | `Active` |
| `Giveaway_Ticket.ticket_status` | `Registered`, `Waiting`, `NotSelected`, `Received`, `Forfeited`, `Expired` | `Waiting` |
| `Giveaway_Image.image_status` | `Active`, `Inactive` | `Active` |
| `Chat_Room.chat_room_status` | `Active`, `Inactive` | `Active` |

### ความหมายของ transaction\_status

ความหมายด้านล่างสันนิษฐานจากโครงสร้างตาราง ต้องยืนยันกับ flow จริง ยกเว้น `Processing` ที่ยึดตามโค้ดปัจจุบัน

| ค่า | ความหมาย |
| --- | --- |
| `Pending` | สร้างธุรกรรมแล้ว ยังไม่มีสลิปให้ตรวจ (ผู้ซื้อยังไม่ได้อัปโหลดสลิปครั้งแรก) |
| `Processing` | ผู้ซื้ออัปโหลดสลิปแล้ว (เปลี่ยนทันที ไม่รอผู้ขายยืนยัน) และค้างอยู่ที่สถานะนี้จนจบธุรกรรม แม้ผู้ขายปฏิเสธสลิป (ผู้ซื้ออัปโหลดใหม่ได้ และการขอยกเลิกต้องรอความยินยอมอีกฝ่าย) สถานะนี้ไม่การันตีว่าเงินผ่านการตรวจแล้ว ให้ดูแถวสลิปล่าสุดใน `Transaction_Payment`: `Pending` = รอตรวจ, `Confirmed` = ยืนยันแล้ว (เงินผ่าน), `Rejected` = รอผู้ซื้ออัปโหลดใหม่ |
| `Completed` | ส่งมอบเสร็จและยืนยันรับของครบตามเงื่อนไข (ดู Open items) |
| `Cancelled` | ยกเลิกโดยไม่ต้องคืนเงิน |
| `Pending Refund` | อนุมัติยกเลิกหลังชำระเงินแล้ว (มีสลิป `Confirmed`) รอคืนเงิน (คืนของและโอนเงินคืนผ่าน `Transaction_Refund` และ `Transaction_Refund_Slip`) |
| `Refunded` | ผู้ซื้อยืนยันสลิปคืนเงินแล้ว (`Transaction_Refund_Slip.refund_status = 'Confirmed'`) |

## Open items

คำอธิบายในเอกสารนี้อ่านจากชื่อคอลัมน์ ชนิด และ note ใน DBML เท่านั้น รายการด้านล่างที่ติ๊กแล้วคือตัดสินใจแล้ว ส่วนที่ยังไม่ติ๊กควรยืนยันกับทีมก่อนถือเป็นทางการ

- [x] **ตัดสินใจแล้ว:** `Subscription_Payment.amount` เปลี่ยนเป็น `decimal(10,2)` เหมือนยอดเงินอื่น (หน่วยยังไม่ระบุใน schema สันนิษฐานว่าเป็นบาท)
- [x] **ตัดสินใจแล้ว:** `Item.category` กำหนดรายการ 10 หมวดใน DBML แล้ว รวม `Books` (ดู Enum reference)
- [x] **ตัดสินใจแล้ว:** `Post.price` ว่างได้ โพสต์ `TradeOnly` ไม่ต้องใส่ราคา
- [x] **ตัดสินใจแล้ว:** `Item.owner_id` ไม่เปลี่ยนเมื่อ `item_status = 'Transferred'` ผู้ซื้อต้องสร้าง `Item` ใหม่ถ้าจะขายต่อ จึงหาผู้ขายย้อนจาก `Item.owner_id` ได้เสมอ แต่ยังเก็บ `Transaction.seller_id` ไว้เพื่อ query ง่าย (สันนิษฐานว่าสินค้าที่นำมาแลกใน `Offer_Item` ก็ตั้ง `Transferred` เช่นกัน)
- [x] **ตัดสินใจแล้ว:** `Transaction.offer_id` ว่าง = ซื้อตรงโดยไม่ผ่าน `Offer` ไม่มีค่า = ผ่านข้อเสนอที่ถูกยอมรับ
- [x] เงื่อนไขเข้าสถานะ `Completed`: แลกเปลี่ยนต้องครบ `item_received_confirmed_by_buyer_at` และ `item_received_confirmed_by_seller_at`; ขายอย่างเดียวใช้แค่ฝั่งผู้ซื้อใช่หรือไม่
- [x] **ตัดสินใจแล้ว:** ลบ `Giveaway_Post.item_name` ใช้ `item_id` เชื่อมไปที่ `Item` แล้วดึงชื่อจาก `Item.name`
- [x] **ตัดสินใจแล้ว:** ไม่เพิ่ม unique `(giveaway_id, receiver_id)` ใน `Giveaway_Ticket` เพื่อให้ผู้ที่สละสิทธิ์ (`Forfeited`) กลับมาลงทะเบียนใหม่ในประกาศเดิมได้ ผลคือผู้รับคนเดียวมีหลายแถวได้ แอปต้องกันการลงทะเบียนซ้ำเมื่อยังมีตั๋ว `Registered`, `Waiting` หรือ `Received` (ถ้าให้ฐานข้อมูลกันให้ ใช้ partial unique index เฉพาะสถานะเหล่านั้น ซึ่ง DBML แสดงไม่ได้)
- [x] **ตัดสินใจแล้ว:** `Chat_Room` เพิ่ม CHECK ให้ `transaction_id` กับ `giveaway_id` มีค่าเพียงอย่างใดอย่างหนึ่ง เช่น PostgreSQL: `CHECK (num_nonnulls(transaction_id, giveaway_id) = 1)`
- [ ] ควบคุมที่ฐานข้อมูลที่ DBML แสดงไม่ได้: partial unique index ของ `Transaction_Payment` และ `Transaction_Refund_Slip` (`Pending`/`Confirmed` ได้แค่ 1 แถวต่อธุรกรรม) และ `Transaction_Cancellation` (`Pending` ได้แค่ 1 แถวต่อธุรกรรม), index ของ `Report (report_type, target_id)`
- [x] ชื่อไม่สอดคล้อง: `Pending Refund` มีเว้นวรรค (enum อื่นใช้ underscore) และ `User.isAdmin` เป็น camelCase ในชุด snake\_case
- [x] **ตัดสินใจแล้ว:** `Appeal.appeal_status` ไม่เพิ่มค่าเริ่มต้น (คงเป็น NN ไม่มี default ต่างจาก `report_status`) แอปต้องใส่ `Pending` เองตอนสร้าง
- [x] **ตัดสินใจแล้ว:** `Giveaway_Post.item_id` เป็น NOT NULL ใน DBML แล้ว เพราะชื่อประกาศมาจาก `Item.name` ผ่านคอลัมน์นี้ ประกาศเดิมที่ `item_id` เป็น NULL ต้องสร้าง `Item` ให้ก่อนตั้ง NOT NULL
- [x] **ตัดสินใจแล้ว:** `Post.price` ว่างได้ (โพสต์ `TradeOnly`) สูตร `Transaction.total_amount` แยกตาม `offer_id` ไม่ใช่ตามว่า price ว่างหรือไม่: ซื้อตรงไม่มี offer = `Post.price × quantity`; มี offer = `COALESCE(Offer.additional_money, 0)` อย่างเดียว (ไม่บวกราคาโพสต์ ไม่คูณ `quantity` แม้โพสต์ `Both` ที่มีราคา) ไม่มีเงินเพิ่ม = 0 การซื้อตรงต้อง validate ว่า `price` ไม่ว่าง
- [x] **ตัดสินใจแล้ว:** `Item.quantity` คือจำนวนที่เพิ่มเข้า inventory ส่วน `Post.quantity_total` คือจำนวนที่เลือกนำไปขายหรือแลกในโพสต์นั้น ยังไม่ได้กำหนดว่า `Item.quantity` ลดลงตอนสร้างโพสต์หรือตอนขายสำเร็จ และ schema ไม่บังคับให้ผลรวม `quantity_total` ของโพสต์ที่ยังเปิดอยู่ไม่เกิน `Item.quantity`
- [x] **ตัดสินใจแล้ว:** แก้ `Stationary` เป็น `Stationery` และเพิ่ม `Books` ใน `Item.category` แล้ว เหลือ `Report.reason_category` ที่ยังเป็นข้อความอิสระไม่มีรายการค่า
- [x] **ตัดสินใจแล้ว:** `transaction_status` เป็น `Processing` ทันทีที่ผู้ซื้ออัปโหลดสลิป (ตามโค้ดปัจจุบัน ไม่รอผู้ขายยืนยัน) และค้างอยู่ที่ `Processing` แม้สลิปถูกปฏิเสธ (โค้ด `rejectPaymentSlip` ไม่แตะ status ถ้าย้อนเป็น `Pending` ผู้ขายจะยกเลิกเองได้โดยไม่ต้องรอความยินยอม ทั้งที่ผู้ซื้อโอนเงินแล้ว) กติกาคืนเงินหลังชำระเงินแล้วต้องดู `Transaction_Payment.payment_status = 'Confirmed'` ไม่ใช่ดูสถานะธุรกรรม
- [x] **ตัดสินใจแล้ว:** แยกตารางคืนเงินเป็น `Transaction_Refund` (1:1 เก็บ `item_return_confirmed_at`) กับ `Transaction_Refund_Slip` (1:N เก็บสลิปพร้อม `refund_status`, `rejection_reason`, `handled_at`) เพื่อให้ผู้ซื้อปฏิเสธสลิปคืนเงินได้และอัปโหลดใหม่ได้
- [ ] ยืนยันกับ backend: ถือ `Transaction_Payment.created_at` (เวลาอัปโหลดสลิป) เป็นเวลาที่ผู้ซื้อยืนยันการชำระเงิน ไม่มีคอลัมน์ `payment_confirmed_by_buyer_at` แยก ใช่หรือไม่ (ตรวจในโค้ดว่าค่าเดิมถูกเขียนที่ endpoint เดียวกับการรับสลิปหรือไม่)
- [x] **ตัดสินใจแล้ว:** `Notification` ใช้ unique คู่ `(user_id, event_key)` แทน unique ที่ `event_key` ตัวเดียว คีย์จึงไม่ต้องรวมผู้รับ เหตุการณ์เดียวแจ้งหลายคนได้ ให้ backend สร้างคีย์จาก id ของเหตุการณ์ (คงที่ ไม่ใส่เวลาหรือค่าสุ่ม) และใช้ `ON CONFLICT DO NOTHING` ตอน INSERT
- [x] **ตัดสินใจแล้ว:** `User_Follow` เป็น soft delete เพิ่ม `deleted_at` (ว่าง = ยังติดตามอยู่) เลิกติดตามคือ UPDATE `deleted_at` เป็นเวลาปัจจุบัน ไม่ลบแถว ติดตามซ้ำหลังเลิกคือ UPDATE `deleted_at` กลับเป็น NULL เพราะ PK คู่ `follower_id + followed_id` กัน INSERT ซ้ำ query รายชื่อผู้ติดตามและนับจำนวนต้องกรอง `deleted_at IS NULL`
- [x] **ตัดสินใจแล้ว:** คอลัมน์ `text` ทั้ง 16 คอลัมน์เปลี่ยนเป็น `varchar(n)` ใน DBML แล้ว (ดูแถว ข้อความ ในตารางข้อตกลง) ความยาวเป็นค่าที่เสนอ ก่อน migrate ต้องเช็กความยาวสูงสุดของข้อมูลเดิมในแต่ละคอลัมน์ว่าไม่เกินค่าใหม่ `jsonb` ไม่เปลี่ยน
- [x] **ตัดสินใจแล้ว:** `Giveaway_Ticket.ticket_status` มี 6 ค่าตามโค้ดจริง (`giveaways.service.ts`): `Registered`, `Waiting`, `NotSelected`, `Received`, `Forfeited`, `Expired` ค่า `Waived` ที่เคยเขียนไว้ไม่มีในโค้ด ใช้ `Forfeited` แทน วงจร: ลงทะเบียน → `FirstCome` เป็น `Waiting` ทันที ส่วน `Random`/`Manual` เป็น `Registered` ก่อน; เมื่อผู้แจกสุ่ม/เลือกผู้ได้สิทธิ์ ผู้ถูกเลือก `Registered` → `Waiting` ส่วนที่เหลือเป็น `NotSelected`; จาก `Waiting` สแกน QR ทันเวลา → `Received`, เลยกำหนดรับของ → `Expired`, สละสิทธิ์เอง → `Forfeited` ฝั่ง frontend แสดง `NotSelected` เป็น `Not_Selected` (`lib/api/giveaways.ts`) ค่าในฐานข้อมูลยังเป็น `NotSelected`
