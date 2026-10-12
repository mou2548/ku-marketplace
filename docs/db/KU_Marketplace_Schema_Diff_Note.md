# KU Marketplace — Schema Diff Note (Transaction Refactor)

Oct 5, 2026 · @Thanaphut Aksornprasert

## สรุป

เทียบ schema ฉบับล่าสุด (24 ตาราง) กับฉบับก่อนแยก `Transaction`: ตาราง `Transaction` ลดจาก 26 คอลัมน์เหลือ 12 และแยกข้อมูลเฉพาะช่วงของธุรกรรม (จ่ายเงิน, จัดส่ง, ยกเลิก, คืนเงิน) ออกเป็น 5 ตารางใหม่ (`Transaction_Shipment`, `Transaction_Payment`, `Transaction_Cancellation`, `Transaction_Refund`, `Transaction_Refund_Slip`) นอกจากนี้มีตารางใหม่นอกกลุ่ม Trading อีก 2 ตาราง (`User_Follow`, `Notification`) และแก้ตารางเดิมนอก `Transaction` อีก 10 ตาราง (`Subscription_Payment`, `Post`, `Giveaway_Post`, `Item`, `User`, `Appointment_Card`, `Report`, `Giveaway_Ticket`, `Appeal`, `Chat_Message`) รวมจาก 17 ตารางเป็น 24 ตาราง: เพิ่มใหม่ 7, แก้โครงสร้าง 11 (รวม `Transaction`), ไม่เปลี่ยน 6 ส่วนรอบล่าสุดเพิ่มสองเรื่อง: `User_Follow` เป็น soft delete (มี `deleted_at`) และคอลัมน์ข้อความที่เคยเป็น `text` ทุกตัวถูกจำกัดความยาวเป็น `varchar(n)`

เหตุผลหลัก:

- ลดคอลัมน์ที่เป็น NULL เกือบตลอด เพราะแต่ละช่วงของธุรกรรมใช้ข้อมูลคนละชุด
- เก็บประวัติได้ครบ: สลิปที่ถูกปฏิเสธแล้วอัปโหลดใหม่ และคำขอยกเลิกซ้ำ ได้แถวละครั้ง ไม่ถูกเขียนทับ
- เพิ่ม `total_amount` เป็นราคาที่ตกลงกัน ณ ตอนทำธุรกรรม ไม่ต้องพึ่ง `Post.price` ที่แก้ภายหลังได้
- ตัดความสัมพันธ์ Transaction ↔ Report (`active_report_id`)

สิ่งที่เป็น breaking change สำหรับ backend: คอลัมน์ 15 ตัวหายจาก `Transaction` (ดูตารางถัดไป), `total_amount` เป็น NOT NULL, สถานะการจ่ายเงิน/ยกเลิก/คืนเงินต้องอ่านจากตารางลูกแทน, คอลัมน์ `Giveaway_Post.item_name` ถูกลบ (`item_id` เป็น NOT NULL), `Giveaway_Ticket.queue_number` เป็น NOT NULL พร้อม unique ร่วมกับ `giveaway_id`, คอลัมน์ข้อความ 10 คอลัมน์ในตารางเดิมเปลี่ยนจาก `text` เป็น `varchar(n)` (ข้อมูลเดิมที่ยาวเกินจะ migrate ไม่ได้ และการบันทึกข้อความยาวเกินจะ error) และ `User_Follow` เลิกติดตามด้วย UPDATE `deleted_at` ไม่ใช่ DELETE แถว

## Transaction: คอลัมน์ไหนไปไหน

คงอยู่เท่าเดิม 11 คอลัมน์, เพิ่มใหม่ 1, ย้ายไปตารางใหม่ 14, ลบโดยไม่มีที่แทน 1 (active_report_id)

**คงเดิมใน** **`Transaction`****:** `transaction_id`, `post_id`, `offer_id`, `buyer_id`, `seller_id`, `quantity`, `transaction_status` (ค่า enum เดิมทั้ง 6 ค่า), `delivery_method`, `created_at`, `item_received_confirmed_by_buyer_at`, `item_received_confirmed_by_seller_at` (ตัดสินใจแล้วว่าต้องคงไว้ — ดู Open items)

**เพิ่มใหม่:** `total_amount decimal(10,2) NOT NULL` — ยอดที่ตกลงกัน ณ เวลาสร้างธุรกรรม

| คอลัมน์เดิมใน `Transaction` | ตอนนี้อยู่ที่ | หมายเหตุ |
| --- | --- | --- |
| `slip_image_url` | `Transaction_Payment.slip_image_url` | 1 สลิป = 1 แถว อัปโหลดใหม่ = แถวใหม่ |
| `payment_confirmed_by_buyer_at` | `Transaction_Payment.created_at` | ไม่มีคอลัมน์แยก: เวลาที่ผู้ซื้อยืนยัน = เวลาอัปโหลดสลิป (`created_at`) ส่วนฝั่งผู้ขายใช้ `handled_at` + `payment_status` (backend ต้องยืนยันข้อสมมตินี้) |
| `payment_confirmed_by_seller_at` | `Transaction_Payment.handled_at` | เมื่อ `payment_status = 'Confirmed'` |
| `rejected_at` | `Transaction_Payment.handled_at` | เมื่อ `payment_status = 'Rejected'` |
| `rejection_reason` (ชนิดเดิม timestamp) | `Transaction_Payment.rejection_reason` | ชนิดใหม่คือ `varchar(500)` |
| `tracking_number` | `Transaction_Shipment.tracking_number` | มีเฉพาะ `delivery_method = 'Shipping'` |
| `estimated_delivery_date` | `Transaction_Shipment.estimated_delivery_date` | เช่นเดียวกัน |
| `cancellation_requested_by` | `Transaction_Cancellation.requested_by` |  |
| `cancellation_reason` | `Transaction_Cancellation.reason` |  |
| `cancellation_requested_at` | `Transaction_Cancellation.requested_at` |  |
| `cancellation_response` | `Transaction_Cancellation.response` | เพิ่ม `responded_at` บอกเวลาตอบ |
| `item_return_confirmed_at` | `Transaction_Refund.item_return_confirmed_at` | คงอยู่ที่ `Transaction_Refund` (1:1) ไม่ย้ายไปตารางสลิป เพราะเป็นข้อมูลระดับธุรกรรม ไม่ใช่ระดับสลิป |
| `refund_slip_url` | `Transaction_Refund_Slip.refund_slip_url` | 1 สลิป = 1 แถว (1:N) อัปโหลดใหม่ = แถวใหม่ |
| `refund_confirmed_by_buyer` (boolean) | `Transaction_Refund_Slip.handled_at` + `refund_status` | ผู้ซื้อเป็นผู้ตัดสิน (`Transaction.buyer_id`) จึงไม่มี `handled_by`; `Confirmed` = ธุรกรรมเป็น `Refunded` และเปลี่ยนจาก boolean เป็นเวลาที่ตัดสิน |
| `active_report_id` | **ลบ — ไม่มีที่แทน** | หาจาก `Report` (ดูหัวข้อ Backend impact) |

## ตารางใหม่ 7 ตาราง

4 ตารางแรกชี้กลับไปที่ `Transaction.transaction_id` ส่วน `Transaction_Refund_Slip` ชี้ไปที่ `Transaction_Refund` และ `User_Follow`/`Notification` ชี้ไปที่ `User` (DBML ฉบับล่าสุดไม่มี TableGroup แล้ว)

| ตาราง | ความสัมพันธ์ | แถวถูกสร้าง/แก้เมื่อไหร่ | คอลัมน์ใหม่ที่ไม่เคยมีใน `Transaction` |
| --- | --- | --- | --- |
| `Transaction_Shipment` | 1:1 (PK = FK) | สร้างเมื่อผู้ขายกรอกข้อมูลจัดส่ง เฉพาะ `delivery_method = 'Shipping'` | `shipped_at` |
| `Transaction_Payment` | 1:N | INSERT เป็น `Pending` ทุกครั้งที่ผู้ซื้ออัปโหลดสลิป; UPDATE เป็น `Confirmed` หรือ `Rejected` เมื่อผู้ขายตัดสิน | `payment_status`, `handled_by`, `handled_at` |
| `Transaction_Cancellation` | 1:N | INSERT เมื่อมีคำขอยกเลิก; UPDATE `response` + `responded_at` เมื่ออีกฝ่ายตอบ | `responded_at` |
| `Transaction_Refund` | 1:1 (PK = FK) | สร้างเมื่ออนุมัติยกเลิกหลังจ่ายเงินแล้ว (สถานะ `Pending Refund`); UPDATE `item_return_confirmed_at` เมื่อผู้ขายยืนยันได้รับของคืน | `created_at` |
| `Transaction_Refund_Slip` | 1:N (FK → `Transaction_Refund.transaction_id`) | INSERT เป็น `Pending` ทุกครั้งที่ผู้ขายอัปโหลดสลิปคืนเงิน; UPDATE เป็น `Confirmed` หรือ `Rejected` เมื่อผู้ซื้อตัดสิน | `refund_slip_id`, `refund_slip_url`, `refund_status`, `rejection_reason`, `handled_at`, `created_at` |
| `User_Follow` | N:N ระหว่าง `User` กับ `User` (composite PK = `follower_id` + `followed_id`) | INSERT เมื่อกดติดตามครั้งแรก; เลิกติดตาม = UPDATE `deleted_at` เป็นเวลาปัจจุบัน (soft delete ไม่ DELETE แถว); ติดตามซ้ำคู่เดิม = UPDATE `deleted_at` กลับเป็น NULL (INSERT ซ้ำไม่ได้เพราะ PK คู่เดิมมีอยู่แล้ว) | `created_at`, `deleted_at` (query ผู้ติดตาม/นับจำนวนต้องกรอง `deleted_at IS NULL`) |
| `Notification` | 1:N ต่อ `User` (ผู้รับ) แถวละ 1 รายการต่อ 1 คน | INSERT เมื่อเกิดเหตุการณ์ (ผู้รับคนเดิมซ้ำไม่ได้เพราะ unique `(user_id, event_key)`); UPDATE `read_at` เมื่อผู้ใช้อ่าน | `event_key`, `title`, `body`, `href`, `read_at` |

วงจรของแถวใน `Transaction_Payment`: แต่ละแถวคือสลิป 1 ใบ เริ่มที่ `Pending` แล้วถูก UPDATE ทับเป็น `Confirmed`/`Rejected` แถว `Rejected` จะไม่ถูกแก้อีก ถ้าผู้ซื้อส่งใหม่ให้ INSERT แถวใหม่ ดังนั้นสลิปปัจจุบันของธุรกรรมคือแถวล่าสุดตาม `created_at`

แพทเทิร์นเดียวกับ `Subscription_Payment` ที่มีอยู่แล้ว (`handled_by` + `handled_at` + status)

วงจรของแถวใน `Transaction_Refund_Slip`: แต่ละแถวคือสลิปคืนเงิน 1 ใบ ผู้ขาย INSERT เป็น `Pending` แล้วผู้ซื้อ UPDATE เป็น `Confirmed` (ธุรกรรมเป็น `Refunded`) หรือ `Rejected` + `rejection_reason` ถ้าผู้ขายส่งใหม่ให้ INSERT แถวใหม่ ผู้ตัดสินคือผู้ซื้อ (`Transaction.buyer_id`) จึงไม่มี `handled_by`

## การเปลี่ยนแปลงนอก Transaction

ตารางเดิมนอก `Transaction` ถูกแก้ 10 ตาราง (ตารางด้านล่าง) ไม่กระทบความสัมพันธ์กับตารางอื่น แต่ backend ต้องปรับ migration และการตรวจค่า ส่วนตารางใหม่ 7 ตารางใช้ `varchar(n)` แทน `text` มาตั้งแต่ต้น

| ตาราง.คอลัมน์ | เดิม | ใหม่ | ผลต่อ backend |
| --- | --- | --- | --- |
| `Subscription_Payment.amount` | `integer` NOT NULL | `decimal(10,2)` NOT NULL | เปลี่ยนชนิดคอลัมน์ ค่าเดิมแปลงได้ถ้าไม่เกิน 99,999,999.99 (ตรวจก่อน) ปรับ DTO/ORM ให้รับทศนิยม |
| `Post.price` | `decimal(10,2)` NOT NULL | `decimal(10,2)` ว่างได้ | ลบ NOT NULL ข้อมูลเดิมไม่กระทบ โค้ดที่อ่านราคาต้องรองรับ NULL (โพสต์ `TradeOnly`) การซื้อตรง (ไม่มี `offer_id`) ต้อง validate ว่า `price` ไม่ว่าง ส่วน `total_amount` ของธุรกรรมที่มี `offer_id` ไม่ใช้ `price` |
| `Giveaway_Post.item_name` | `varchar(255)` ว่างได้ | **ลบคอลัมน์** | ชื่อประกาศต้องอ่านจาก `Item.name` ผ่าน `item_id` (JOIN) ประกาศเดิมที่ `item_id` เป็น NULL ต้องสร้าง `Item` จาก `item_name` เดิมและผูก `item_id` ก่อนลบคอลัมน์ ไม่งั้นชื่อหาย |
| `Item.category` | ไม่มี note | note ระบุ 10 ค่า: `Clothing`, `Electronics`, `Home & Living`, `Bags`, `Vehicles`, `Sports`, `Stationery`, `Tickets`, `Books`, `Other` | ไม่เปลี่ยนโครงสร้าง ชนิดยังเป็น `varchar(50)` ควรตรวจค่าในโค้ดให้ตรงรายการ |
| `User.avatar_url` | ไม่มี | คอลัมน์ใหม่ (URL รูปโปรไฟล์) | ผู้ใช้เดิมไม่มีค่า API โปรไฟล์ต้องคืนค่านี้และรองรับกรณีไม่มีรูป |
| `User.promptpay_id` | ไม่มี | `varchar(100)` ว่างได้ (รหัส PromptPay ให้อีกฝ่ายใช้โอนเงิน) | ผู้ใช้เดิมไม่มีค่า (NULL) โค้ดที่แสดงหรือใช้ค่านี้สำหรับโอนเงินต้องรองรับกรณีไม่มีค่า |
| `Item.deleted_at`, `Appointment_Card.deleted_at` | ไม่มี | timestamp ว่างได้ (soft delete ว่าง = ยังมีผล) | query รายการสินค้า/ใบนัดหมายต้องกรอง `deleted_at IS NULL` การลบเป็นการตั้งค่าเวลาแทน DELETE |
| `Report.sanction` | ไม่มี | `varchar(30)` note: `None`, `Warn`, `Suspend_Temporary`, `Suspend_Permanent` | ต้องตั้งค่าเมื่อแอดมินตัดสิน report และต้องกำหนดค่าให้ report เดิมใน migration (เสนอ `None`) ค่าใน DB ต้องตรงรายการข้างต้น |
| `Giveaway_Ticket.queue_number` | ไม่มี unique คู่ `(giveaway_id, queue_number)` | `integer` NOT NULL + unique index `(giveaway_id, queue_number)` | ตรวจข้อมูลเดิมว่าไม่มีเลขคิวว่างหรือซ้ำในประกาศเดียวกันก่อนตั้ง NOT NULL การออกเลขคิวใหม่ต้องกันชนกัน (transaction/retry) |
| `Giveaway_Ticket.qr_issued_at` | ไม่มี | `timestamp` ว่างได้ เวลาออก QR | อายุ QR 15 นาทีนับจากค่านี้ (ตามโค้ดที่อ้างใน review ให้ backend ยืนยัน) |
| `Item.size` | `varchar(20)` | `varchar(100)` | ขยายความยาว ข้อมูลเดิมไม่กระทบ ปรับ validation ให้รับได้ถึง 100 ตัวอักษร |
| `Giveaway_Ticket.ticket_status` | note: `Waiting`, `Received`, `Expired`, `Waived` | note: `Registered`, `Waiting`, `NotSelected`, `Received`, `Forfeited`, `Expired` | เพิ่ม `Registered` และ `NotSelected` และเปลี่ยนชื่อ `Waived` เป็น `Forfeited` ให้ตรงกับค่าที่โค้ดใช้จริง (`giveaways.service.ts`) ชนิดยังเป็น `varchar(20)` และ default ยังเป็น `Waiting` (ตรงกับ `FirstCome`; `Random`/`Manual` ต้องตั้ง `Registered` ในแอป) ถ้าโค้ดเขียน `Forfeited` อยู่แล้ว ข้อมูลเดิมไม่ต้องแปลง ให้ตรวจ `SELECT DISTINCT ticket_status` ว่าไม่มีแถวที่เก็บ `Waived` และการกันลงทะเบียนซ้ำต้องนับตั๋ว `Registered` ด้วย |
| `Subscription_Payment.rejection_reason`, `Post.wanted_item_offer` | `text` | `varchar(500)` | จำกัดความยาว (ค่าที่เสนอ) ก่อนแก้ชนิดให้ตรวจ max(char_length(col)) ของข้อมูลเดิม ถ้าเกินต้องเพิ่มค่าหรือตัดข้อมูล และให้แอป validate ความยาวก่อนบันทึก ไม่งั้น INSERT/UPDATE จะ error |
| `Report.resolution_note`, `Appeal.resolution_note` | `text` | `varchar(1000)` | เช่นเดียวกับแถวด้านบน (ตรวจความยาวข้อมูลเดิมและ validate ในแอป) |
| `Item.description`, `Post.description`, `Report.details`, `Appeal.reason` (NOT NULL คงเดิม), `Giveaway_Post.description`, `Chat_Message.content` | `text` | `varchar(2000)` | เช่นเดียวกับแถวด้านบน ข้อความแชตและคำอธิบายที่ผู้ใช้พิมพ์ยาวกว่า 2000 ตัวอักษรต้องถูกปฏิเสธหรือตัดที่ชั้นแอป |

## ไม่เปลี่ยน และ Open items

6 ตารางไม่เปลี่ยนทุกคอลัมน์: `Subscription`, `Item_Image`, `Offer`, `Offer_Item`, `Giveaway_Image`, `Chat_Room` (DBML ฉบับล่าสุดไม่มี TableGroup แล้ว)

รายการที่ต้องตัดสินใจก่อนทีม backend เริ่มทำ migration:

- [x] **ตัดสินใจแล้ว: คง** **`item_received_confirmed_by_seller_at`** **ไว้ใน** **`Transaction`** ใช้ยืนยันว่าผู้ขายได้รับของจากผู้ซื้อในการแลกเปลี่ยน (Trade) ต้องเพิ่มกลับใน DBML เพราะ schema ฉบับล่าสุดที่ส่งมายังไม่มีคอลัมน์นี้
- [x] **ตัดสินใจแล้ว:** ไม่เพิ่ม `payment_confirmed_by_buyer_at` ใน `Transaction_Payment` เวลาที่ผู้ซื้อยืนยัน = `Transaction_Payment.created_at` (เวลาอัปโหลดสลิป) ส่วนฝั่งผู้ขายใช้ `handled_at` + `payment_status` backend ต้องยืนยันว่าไม่มี flow ที่ผู้ซื้อกดยืนยันแยกจากการอัปโหลดสลิป
- [x] **ตัดสินใจแล้ว:** DBML ฉบับล่าสุดไม่มี TableGroup แล้ว จึงไม่ต้องเพิ่มตารางใหม่เข้ากลุ่ม
- [x] **ตัดสินใจแล้ว:** `total_amount` เขียนเป็น `decimal(10, 2)` ไม่มีเครื่องหมายคำพูด และ parse ผ่านใน DBML ฉบับล่าสุดแล้ว
- [x] enum `transaction_status` ยังเป็น 6 ค่าเดิม รวม `Pending Refund` ที่มีเว้นวรรค ซึ่งไม่ตรงกับ enum อื่นที่ใช้ underscore จะเปลี่ยนเป็น `Pending_Refund` หรือไม่
- [x] กำหนดเงื่อนไขเข้า `Completed`: แลกเปลี่ยน (Trade) ต้องครบทั้ง `item_received_confirmed_by_buyer_at` และ `item_received_confirmed_by_seller_at`; ขายอย่างเดียว (`SellOnly`) ใช้แค่ฝั่งผู้ซื้อ (ฝั่งผู้ขายเป็น NULL) ใช่หรือไม่ ไม่งั้นธุรกรรมแบบขายจะค้างที่ `Processing`
- [x] **ตัดสินใจแล้ว:** `Giveaway_Post.item_name` ถูกลบ ใช้ `item_id` เชื่อมไปที่ `Item` แล้วดึงชื่อจาก `Item.name` และ `item_id` เป็น NOT NULL แล้วใน DBML ประกาศเดิมที่ `item_id` เป็น NULL ต้องสร้าง `Item` จาก `item_name` เดิมก่อนลบคอลัมน์และก่อนตั้ง NOT NULL
- [x] **ตัดสินใจแล้ว:** `Post.price` ว่างได้ (โพสต์ `TradeOnly`) สูตร `total_amount` แยกตาม `offer_id` ไม่ใช่ตามว่า price ว่างหรือไม่: ซื้อตรงไม่มี offer = `Post.price × quantity`; มี offer = `COALESCE(Offer.additional_money, 0)` อย่างเดียว (ไม่บวกราคาโพสต์ ไม่คูณ `quantity` แม้โพสต์ `Both` ที่มีราคา) ไม่มีเงินเพิ่ม = 0
- [x] **ตัดสินใจแล้ว:** `Processing` = ผู้ซื้ออัปโหลดสลิปแล้วจนจบธุรกรรม (ไม่ว่าผู้ขายตรวจสลิปแล้วหรือยัง) ผู้ขายปฏิเสธสลิป → สถานะธุรกรรมยังเป็น `Processing` ไม่ย้อนเป็น `Pending` (ตามโค้ด `rejectPaymentSlip` ที่ไม่แตะ status ถ้าย้อนเป็น `Pending` ผู้ขายจะยกเลิกเองได้โดยไม่ต้องรอความยินยอม ทั้งที่ผู้ซื้อโอนเงินมาแล้ว) สถานะย่อยดูจากแถวสลิปล่าสุดใน `Transaction_Payment`: `Pending` = รอผู้ขายตรวจ, `Confirmed` = ยืนยันแล้ว, `Rejected` = รอผู้ซื้ออัปโหลดใหม่; ผู้ขายยืนยัน → ไม่เปลี่ยนสถานะธุรกรรม
- [x] **ตัดสินใจแล้ว:** แยกการคืนเงินเป็น 2 ตาราง: `Transaction_Refund` (1:1 เก็บ `item_return_confirmed_at`) และ `Transaction_Refund_Slip` (1:N สลิปละแถว ผู้ซื้อเป็นผู้ตัดสิน `Confirmed` → `Refunded`)
- [x] **ตัดสินใจแล้ว:** `Notification` ใช้ unique คู่ `(user_id, event_key)` แทน unique ที่ `event_key` ตัวเดียว คีย์จึงไม่ต้องรวมผู้รับ เหตุการณ์เดียวแจ้งหลายคนได้ ให้ backend สร้างคีย์จาก id ของเหตุการณ์ (คงที่ ไม่ใส่เวลาหรือค่าสุ่ม) และใช้ `ON CONFLICT DO NOTHING` ตอน INSERT ส่วน `read_at` ยังไม่รองรับในโค้ด develop
- [x] **ตัดสินใจแล้ว:** ไม่เพิ่ม unique `(giveaway_id, receiver_id)` ใน `Giveaway_Ticket` เพื่อให้ผู้ที่สละสิทธิ์ (`Forfeited`) กลับมาลงทะเบียนใหม่ได้ แอปต้องกันการลงทะเบียนซ้ำเมื่อยังมีตั๋ว `Registered`, `Waiting` หรือ `Received`
- [ ] `Item.quantity` (จำนวนที่เพิ่มเข้าคลัง) กับ `Post.quantity_total` (จำนวนที่เปิดขาย/แลกในโพสต์) ยังไม่มีการบังคับว่าผลรวมของโพสต์ที่เปิดอยู่ต้องไม่เกิน `Item.quantity` ให้ทีมกำหนดว่าตรวจที่ชั้นไหน
- [ ] `item_return_confirmed_at` อยู่ที่ `Transaction_Refund` (1:1) ให้ backend ยืนยันว่าต้องมีค่านี้ก่อนอัปโหลดสลิปคืนเงินหรือไม่ (schema ไม่บังคับลำดับ)
- [x] **ตัดสินใจแล้ว:** `User_Follow` เป็น soft delete เพิ่ม `deleted_at` (ว่าง = ยังติดตามอยู่) เลิกติดตามคือ UPDATE `deleted_at` ไม่ DELETE แถว ติดตามซ้ำหลังเลิกคือ UPDATE `deleted_at` กลับเป็น NULL เพราะ PK คู่ `follower_id + followed_id` กัน INSERT ซ้ำ ทุก query รายชื่อ/นับจำนวนผู้ติดตามต้องกรอง `deleted_at IS NULL`
- [x] **ตัดสินใจแล้ว:** คอลัมน์ `text` ทั้ง 16 คอลัมน์เปลี่ยนเป็น `varchar(n)` ใน DBML แล้ว (ในตารางเดิม 10 คอลัมน์ ในตารางใหม่ 6 คอลัมน์) ความยาวที่ใช้เป็นค่าที่เสนอ ทีม backend ปรับได้ตามข้อมูลจริง `jsonb` ไม่เปลี่ยน
- [x] **ตัดสินใจแล้ว:** `Giveaway_Ticket.ticket_status` มี 6 ค่าตามโค้ดจริง (`giveaways.service.ts`): `Registered`, `Waiting`, `NotSelected`, `Received`, `Forfeited`, `Expired` ค่า `Waived` ที่เคยเขียนไว้ไม่มีในโค้ด ใช้ `Forfeited` แทน วงจร: ลงทะเบียน → `FirstCome` เป็น `Waiting` ทันที ส่วน `Random`/`Manual` เป็น `Registered` ก่อน; เมื่อผู้แจกสุ่ม/เลือก ผู้ถูกเลือก `Registered` → `Waiting` ส่วนที่เหลือเป็น `NotSelected`; จาก `Waiting` สแกน QR ทันเวลา → `Received`, เลยกำหนดรับของ → `Expired`, สละสิทธิ์เอง → `Forfeited` ฝั่ง frontend แสดง `NotSelected` เป็น `Not_Selected` (`lib/api/giveaways.ts`) ค่าในฐานข้อมูลยังเป็น `NotSelected`

## Backend impact และ migration

การเขียนข้อมูลใน 8 flow เปลี่ยนจาก UPDATE แถว `Transaction` แถวเดียว เป็น INSERT/UPDATE ตารางลูก และสถานะหลักยังอยู่ที่ `Transaction.transaction_status`

| Flow | เดิม (แก้ใน `Transaction`) | ใหม่ |
| --- | --- | --- |
| สร้างธุรกรรม | ไม่มียอดเงิน | ต้องใส่ `total_amount` เสมอ แยกตาม `offer_id`: ซื้อตรง (`offer_id` เป็น NULL) = `Post.price × quantity`; ผ่าน offer (`offer_id` ไม่ว่าง) = `COALESCE(Offer.additional_money, 0)` อย่างเดียว ไม่บวกราคาโพสต์ ไม่คูณ `quantity` (ตามโค้ดจริง) |
| ผู้ซื้ออัปโหลดสลิป | เซ็ต `slip_image_url` | INSERT `Transaction_Payment` (`Pending`); `transaction_status` → `Processing` ทันที (ไม่ต้องรอผู้ขายยืนยัน) |
| ผู้ขายยืนยันรับเงิน | เซ็ต `payment_confirmed_by_seller_at` | UPDATE แถวสลิปเป็น `Confirmed` + `handled_by`/`handled_at`; ไม่เปลี่ยน `transaction_status` (เป็น `Processing` อยู่แล้วตั้งแต่อัปโหลดสลิป) |
| ผู้ขายปฏิเสธสลิป | เซ็ต `rejected_at` + `rejection_reason` | UPDATE แถวสลิปเป็น `Rejected` + `rejection_reason` + `handled_*`; **ไม่เปลี่ยน** `transaction_status` (ค้างที่ `Processing` ตามโค้ด `rejectPaymentSlip` รอผู้ซื้ออัปโหลดสลิปใหม่ และการยกเลิกต้องรอความยินยอมอีกฝ่าย) |
| กรอกเลขพัสดุ | แก้ `tracking_number` | UPSERT `Transaction_Shipment` |
| ขอยกเลิก / ตอบคำขอ | เซ็ตคอลัมน์ `cancellation_*` | INSERT `Transaction_Cancellation`; ตอบ = UPDATE `response` + `responded_at` |
| คืนเงิน | เซ็ต `refund_*` | INSERT `Transaction_Refund` ตอนอนุมัติยกเลิก; ผู้ขาย INSERT `Transaction_Refund_Slip` (`Pending`) ทีละสลิป; ผู้ซื้อ UPDATE เป็น `Confirmed` หรือ `Rejected` (+ `rejection_reason` + `handled_at`); เมื่อมีสลิป `Confirmed` → `transaction_status` = `Refunded` |
| ตรวจ report ค้างของธุรกรรม | อ่าน `active_report_id` | query `Report` ที่ `report_type = 'Transaction'`, `target_id = :id`, `report_status IN ('Pending','Under_Investigation')` |

สลิปปัจจุบันของธุรกรรม = แถวล่าสุดใน `Transaction_Payment` ตาม `created_at`

เงื่อนไข “จ่ายเงินแล้ว” ในกฎคืนเงินต้องดูที่ `Transaction_Payment.payment_status = 'Confirmed'` ไม่ใช่ `transaction_status` เพราะ `Processing` เกิดตั้งแต่ผู้ซื้ออัปโหลดสลิป (ผู้ขายอาจยังไม่ได้ยืนยัน หรือปฏิเสธสลิปไปแล้ว)

### ลำดับ migration

1. เพิ่ม `total_amount` เป็น nullable ก่อน backfill ด้วย `CASE WHEN offer_id IS NULL THEN Post.price × quantity ELSE COALESCE(Offer.additional_money, 0) END` (ค่าประมาณ เพราะราคาใน `Post` อาจถูกแก้ไปแล้ว) แล้วค่อยตั้ง NOT NULL
2. สร้าง 7 ตารางใหม่ (`Transaction_Shipment`, `Transaction_Payment`, `Transaction_Cancellation`, `Transaction_Refund`, `Transaction_Refund_Slip`, `User_Follow`, `Notification`) และเพิ่มคอลัมน์ใหม่ในตารางเดิม (`User.avatar_url`, `User.promptpay_id`, `Item.deleted_at`, `Appointment_Card.deleted_at`, `Report.sanction`, `Giveaway_Ticket.queue_number`, `Giveaway_Ticket.qr_issued_at`) พร้อม unique index `(giveaway_id, queue_number)` ตาราง `User_Follow` สร้างพร้อมคอลัมน์ `deleted_at` (soft delete) ตั้งแต่แรก
3. แก้ชนิดคอลัมน์ข้อความในตารางเดิมจาก `text` เป็น `varchar(n)` ตามตารางด้านบน และขยาย `Item.size` จาก `varchar(20)` เป็น `varchar(100)` ก่อนแก้ให้ query หา `max(char_length(col))` ของแต่ละคอลัมน์ก่อน ถ้าเกินค่าใหม่ให้เลือกระหว่างเพิ่มความยาวหรือตัดข้อมูล (PostgreSQL จะ error ทันทีถ้าไม่ตัดให้)
4. ย้ายข้อมูลเดิม:
   - `Transaction_Payment`: สร้างแถวจากทุกธุรกรรมที่ `slip_image_url` ไม่เป็น NULL — status = `Confirmed` ถ้ามี `payment_confirmed_by_seller_at`, `Rejected` ถ้ามี `rejected_at`, ไม่งั้น `Pending`; `handled_at` = ค่าใดค่าหนึ่งของสองคอลัมน์นั้น; `created_at` = `payment_confirmed_by_buyer_at` เดิมจาก `Transaction` (fallback `Transaction.created_at`) เป็นค่าประมาณ เพราะ schema เดิมไม่เคยเก็บเวลาอัปโหลดสลิปจริง; ไม่มีคอลัมน์ `payment_confirmed_by_buyer_at` ในตารางใหม่
   - ธุรกรรมเดิมที่ผู้ขายเคยปฏิเสธสลิป: ถ้าโค้ดเดิมเซ็ต `slip_image_url` เป็น NULL ตอนปฏิเสธ จะไม่มีแถวใน `Transaction_Payment` ให้คง `transaction_status` เป็นเดิม (`Processing`) ถือว่ารอผู้ซื้ออัปโหลดสลิปใหม่ ไม่ต้องสร้างแถว
   - `rejection_reason` เดิมเป็น timestamp จึงไม่ใช่ข้อความ ให้ตั้งเป็น NULL
   - `Transaction_Shipment`: จากแถวที่ `tracking_number` หรือ `estimated_delivery_date` ไม่เป็น NULL
   - `Transaction_Cancellation`: จากแถวที่ `cancellation_requested_at` ไม่เป็น NULL
   - `Transaction_Refund`: จากแถวที่มี `refund_slip_url` หรือ `item_return_confirmed_at` โดยเก็บเฉพาะ `item_return_confirmed_at`; `created_at` ไม่มีเวลาเดิม ให้ใช้เวลา migration หรือ NULL (ทีมเลือก)
   - `Transaction_Refund_Slip`: จากแถวที่ `refund_slip_url` ไม่เป็น NULL — `refund_confirmed_by_buyer = true` → `Confirmed`, ไม่งั้น `Pending`; `handled_at` และ `created_at` ไม่มีเวลาเดิม ให้ใช้เวลา migration หรือ NULL (ทีมเลือก)
5. นับจำนวนแถวก่อน/หลังย้าย แล้วค่อย DROP 15 คอลัมน์เดิม ออกจาก `Transaction`

### Constraint ที่แนะนำให้เพิ่ม (DBML แสดงไม่ได้)

- partial unique index บน `Transaction_Payment (transaction_id)` เมื่อ `payment_status IN ('Pending','Confirmed')` กันสลิปค้างตรวจ/ยืนยันแล้วซ้ำกัน
- partial unique index บน `Transaction_Cancellation (transaction_id)` เมื่อ `response = 'Pending'` กันคำขอยกเลิกค้างหลายคำขอ
- index บน `Report (report_type, target_id)` เพราะตอนนี้ใช้ query นี้แทน `active_report_id`
- partial unique index บน `Transaction_Refund_Slip (transaction_id)` เมื่อ `refund_status IN ('Pending','Confirmed')` กันสลิปคืนเงินค้างตรวจ/ยืนยันแล้วซ้ำกัน
- CHECK บน `Chat_Room`: `num_nonnulls(transaction_id, giveaway_id) = 1` ห้องแชตผูกกับธุรกรรมหรือประกาศแจกอย่างใดอย่างหนึ่งเท่านั้น
