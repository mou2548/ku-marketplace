-- ==========================================
-- PostgreSQL Database Initialization Script
-- ==========================================

-- 1. User Table
CREATE TABLE "User" (
    "user_id" SERIAL PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "first_name_en" VARCHAR(100) NOT NULL,
    "last_name_en" VARCHAR(100) NOT NULL,
    "first_name_th" VARCHAR(100) NOT NULL,
    "last_name_th" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "user_status" VARCHAR(20) DEFAULT 'Active' CHECK("user_status" IN ('Active', 'Suspended', 'Banned', 'Deleted')),
    "email_verified_at" TIMESTAMP,
    "isAdmin" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Item Table
CREATE TABLE "Item" (
    "item_id" SERIAL PRIMARY KEY,
    "owner_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "condition" VARCHAR(50) NOT NULL CHECK("condition" IN ('New', 'Good', 'Acceptable', 'Poor')),
    "description" TEXT,
    "item_status" VARCHAR(20) DEFAULT 'Unlisted' CHECK("item_status" IN ('Unlisted', 'Listed', 'Transferred')),
    "course_name" VARCHAR(100),
    "brand_model" VARCHAR(100),
    "warranty_expiry" DATE,
    "size" VARCHAR(20),
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Item_Image Table
CREATE TABLE "Item_Image" (
    "image_id" SERIAL PRIMARY KEY,
    "item_id" INTEGER NOT NULL REFERENCES "Item"("item_id"),
    "item_image_status" VARCHAR(20) DEFAULT 'Active' CHECK("item_image_status" IN ('Active', 'Inactive')),
    "image_url" VARCHAR(500) NOT NULL,
    "is_primary" BOOLEAN DEFAULT FALSE,
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Post Table
CREATE TABLE "Post" (
    "post_id" SERIAL PRIMARY KEY,
    "item_id" INTEGER UNIQUE NOT NULL REFERENCES "Item"("item_id"),
    "post_type" VARCHAR(20) NOT NULL CHECK("post_type" IN ('SellOnly', 'TradeOnly', 'Both')),
    "post_status" VARCHAR(20) DEFAULT 'Active' CHECK("post_status" IN ('Active', 'Inactive')),
    "price" DECIMAL(10,2) NOT NULL CHECK("price" >= 0),
    "quantity_total" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity_total" > 0),
    "quantity_remaining" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity_remaining" >= 0),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Offer Table
CREATE TABLE "Offer" (
    "offer_id" SERIAL PRIMARY KEY,
    "post_id" INTEGER NOT NULL REFERENCES "Post"("post_id"),
    "proposer_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "additional_money" DECIMAL(10,2) DEFAULT 0.00 CHECK("additional_money" >= 0),
    "offer_status" VARCHAR(20) DEFAULT 'Pending' CHECK("offer_status" IN ('Pending', 'Accepted', 'Rejected', 'Cancelled', 'Withdrawn')),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Offer_Item Table (Junction Table)
CREATE TABLE "Offer_Item" (
    "offer_id" INTEGER NOT NULL REFERENCES "Offer"("offer_id"),
    "item_id" INTEGER NOT NULL REFERENCES "Item"("item_id"),
    PRIMARY KEY ("offer_id", "item_id")
);

-- 7. Report Table
CREATE TABLE "Report" (
    "report_id" SERIAL PRIMARY KEY,
    "reporter_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "report_type" VARCHAR(20) NOT NULL CHECK("report_type" IN ('Post', 'User', 'Transaction')),
    "target_id" INTEGER NOT NULL,
    "reason_category" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "evidence_urls" JSONB,
    "report_status" VARCHAR(20) DEFAULT 'Pending' CHECK ("report_status" IN ('Pending','Under_Investigation', 'Violation_Confirmed','Report_Dismissed')),
    "handled_by" INTEGER REFERENCES "User"("user_id"),
    "resolution_note" TEXT,
    "handled_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Transaction Table
CREATE TABLE "Transaction" (
    "transaction_id" SERIAL PRIMARY KEY,
    "post_id" INTEGER NOT NULL REFERENCES "Post"("post_id"),
    "offer_id" INTEGER REFERENCES "Offer"("offer_id"),
    "buyer_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "seller_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "quantity" INTEGER DEFAULT 1 CHECK("quantity" > 0),
    "transaction_status" VARCHAR(20) DEFAULT 'Pending' CHECK("transaction_status" IN ('Pending', 'Processing', 'Completed', 'Pending Refund', 'Cancelled', 'Refunded')),
    "active_report_id" INTEGER REFERENCES "Report"("report_id"),
    "delivery_method" VARCHAR(20) NOT NULL CHECK("delivery_method" IN ('Meetup', 'Shipping')),
    "slip_image_url" VARCHAR(500),
    "tracking_number" VARCHAR(100),
    "estimated_delivery_date" DATE,
    "payment_confirmed_by_buyer_at" TIMESTAMP,
    "payment_confirmed_by_seller_at" TIMESTAMP,
    "item_received_confirmed_by_buyer_at" TIMESTAMP,
    "item_received_confirmed_by_seller_at" TIMESTAMP,
    "item_return_confirmed_at" TIMESTAMP,
    "cancellation_requested_by" INTEGER REFERENCES "User"("user_id"),
    "cancellation_reason" TEXT,
    "cancellation_requested_at" TIMESTAMP,
    "cancellation_response" VARCHAR(20) CHECK("cancellation_response" IN ('Pending', 'Approved', 'Rejected')),
    "refund_slip_url" VARCHAR(500),
    "refund_confirmed_by_buyer" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK("buyer_id" != "seller_id")
);

-- 9. Appointment_Card Table
CREATE TABLE "Appointment_Card" (
    "appointment_id" SERIAL PRIMARY KEY,
    "transaction_id" INTEGER NOT NULL REFERENCES "Transaction"("transaction_id"),
    "proposed_by" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "appointment_status" VARCHAR(20) DEFAULT 'Pending' CHECK("appointment_status" IN ('Pending', 'Confirmed', 'Rejected')),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Giveaway_Post Table
CREATE TABLE "Giveaway_Post" (
    "giveaway_id" SERIAL PRIMARY KEY,
    "item_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "pickup_location" VARCHAR(255) NOT NULL,
    "giver_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "allocation_method" VARCHAR(20) NOT NULL CHECK("allocation_method" IN ('FirstCome', 'Random', 'Manual')),
    "quantity" INTEGER NOT NULL DEFAULT 1 CHECK("quantity" > 0),
    "registration_deadline" TIMESTAMP,
    "pickup_deadline" TIMESTAMP,
    "giveaway_status" VARCHAR(20) DEFAULT 'Active' CHECK("giveaway_status" IN ('Active', 'Closed', 'Completed')),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Giveaway_Ticket Table
CREATE TABLE "Giveaway_Ticket" (
    "ticket_id" SERIAL PRIMARY KEY,
    "giveaway_id" INTEGER NOT NULL REFERENCES "Giveaway_Post"("giveaway_id"),
    "receiver_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "qr_token" VARCHAR(255) UNIQUE,
    "ticket_status" VARCHAR(20) DEFAULT 'Waiting' CHECK("ticket_status" IN ('Waiting', 'Received', 'Expired')),
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Giveaway_Image Table
CREATE TABLE "Giveaway_Image" (
    "image_id" SERIAL PRIMARY KEY,
    "giveaway_id" INTEGER NOT NULL REFERENCES "Giveaway_Post"("giveaway_id"),
    "image_status" VARCHAR(20) DEFAULT 'Active' CHECK("image_status" IN ('Active', 'Inactive')),
    "image_url" VARCHAR(500) NOT NULL,
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Chat_Room Table
CREATE TABLE "Chat_Room" (
    "room_id" SERIAL PRIMARY KEY,
    "transaction_id" INTEGER REFERENCES "Transaction"("transaction_id"),
    "giveaway_id" INTEGER REFERENCES "Giveaway_Post"("giveaway_id"),
    "chat_room_status" VARCHAR(20) DEFAULT 'Active' CHECK("chat_room_status" IN ('Active', 'Inactive')),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Chat_Message Table
CREATE TABLE "Chat_Message" (
    "message_id" SERIAL PRIMARY KEY,
    "room_id" INTEGER NOT NULL REFERENCES "Chat_Room"("room_id"),
    "sender_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "content" TEXT,
    "image_urls" JSONB,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Appeal Table
CREATE TABLE "Appeal" (
    "appeal_id" SERIAL PRIMARY KEY,
    "report_id" INTEGER NOT NULL REFERENCES "Report"("report_id"),
    "appellant_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "reason" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "appeal_status" VARCHAR(20) NOT NULL CHECK("appeal_status" IN ('Pending', 'Under_Review', 'Approved', 'Rejected')),
    "handled_by" INTEGER REFERENCES "User"("user_id"),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "handled_at" TIMESTAMP
);

-- 16. Subscription Table
CREATE TABLE "Subscription" (
    "subscription_id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "tier" VARCHAR(20) NOT NULL CHECK("tier" IN ('Free', 'Silver', 'Gold', 'Diamond')),
    "posts_used_this_month" INTEGER DEFAULT 0,
    "subscription_status" VARCHAR(20) DEFAULT 'Active' CHECK("subscription_status" IN ('Active', 'Expired', 'Cancelled')),
    "start_date" TIMESTAMP,
    "end_date" TIMESTAMP CHECK("end_date" >= "start_date")
);

-- 17. Subscription_Payment Table
CREATE TABLE "Subscription_Payment" (
    "payment_id" SERIAL PRIMARY KEY,
    "subscription_id" INTEGER NOT NULL REFERENCES "Subscription"("subscription_id"),
    "user_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "amount" INTEGER NOT NULL CHECK("amount" > 0),
    "slip_image_url" VARCHAR(500) NOT NULL,
    "payment_status" VARCHAR(25) NOT NULL DEFAULT 'Pending' CHECK("payment_status" IN ('Pending', 'Verified', 'Rejected')),
    "rejection_reason" TEXT,
    "handled_by" INTEGER REFERENCES "User"("user_id"),
    "handled_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- KU MARKETPLACE - FULL MOCK DATA (5+ rows per table)
-- ==========================================

-- 1. User (6 users)
INSERT INTO "User" ("email", "first_name_en", "last_name_en", "first_name_th", "last_name_th", "password_hash", "phone_number", "user_status", "email_verified_at", "isAdmin") VALUES
('admin.m@ku.th', 'Admin', 'Marketplace', 'แอดมิน', 'มาร์เก็ตเพลส', '$2b$10$e83...hash1', '0811111111', 'Active', NOW(), TRUE),
('somchai.p@ku.th', 'Somchai', 'Promdee', 'สมชาย', 'พร้อมดี', '$2b$10$e83...hash2', '0822222222', 'Active', NOW(), FALSE),
('somsri.k@ku.th', 'Somsri', 'Kajorn', 'สมศรี', 'ขจร', '$2b$10$e83...hash3', '0833333333', 'Active', NOW(), FALSE),
('anan.s@ku.th', 'Anan', 'Sukjai', 'อานนท์', 'สุขใจ', '$2b$10$e83...hash4', '0844444444', 'Active', NOW(), FALSE),
('kanya.t@ku.th', 'Kanya', 'Thaimai', 'กัญญา', 'ไทยใหม่', '$2b$10$e83...hash5', '0855555555', 'Active', NOW(), FALSE),
('nattapong.m@ku.th', 'Nattapong', 'Meechai', 'ณัฐพงษ์', 'มีชัย', '$2b$10$e83...hash6', '0866666666', 'Suspended', NOW(), FALSE);

-- 2. Subscription (5 rows)
INSERT INTO "Subscription" ("user_id", "tier", "posts_used_this_month", "subscription_status", "start_date", "end_date") VALUES
(2, 'Gold', 2, 'Active', '2026-08-01 00:00:00', '2026-08-31 23:59:59'),
(3, 'Free', 1, 'Active', '2026-08-01 00:00:00', '2026-08-31 23:59:59'),
(4, 'Silver', 0, 'Active', '2026-08-01 00:00:00', '2026-08-31 23:59:59'),
(5, 'Diamond', 5, 'Active', '2026-08-01 00:00:00', '2026-08-31 23:59:59'),
(6, 'Free', 0, 'Expired', '2026-07-01 00:00:00', '2026-07-31 23:59:59');

-- 3. Subscription_Payment (5 rows)
INSERT INTO "Subscription_Payment" ("subscription_id", "user_id", "amount", "slip_image_url", "payment_status", "rejection_reason", "handled_by", "handled_at") VALUES
(1, 2, 99, 'https://r2.ku-market.com/slips/sub_gold_user2.jpg', 'Verified', NULL, 1, '2026-08-01 10:00:00'),
(3, 4, 49, 'https://r2.ku-market.com/slips/sub_silver_user4.jpg', 'Verified', NULL, 1, '2026-08-01 11:30:00'),
(4, 5, 199, 'https://r2.ku-market.com/slips/sub_diamond_user5.jpg', 'Verified', NULL, 1, '2026-08-02 09:15:00'),
(5, 6, 49, 'https://r2.ku-market.com/slips/sub_fake.jpg', 'Rejected', 'สลิปไม่ถูกต้อง หรือยอดเงินไม่ครบ', 1, '2026-08-02 14:00:00'),
(1, 2, 99, 'https://r2.ku-market.com/slips/sub_renew.jpg', 'Pending', NULL, NULL, NULL);

-- 4. Item (10 items)
INSERT INTO "Item" ("owner_id", "name", "category", "condition", "description", "item_status", "course_name", "brand_model", "warranty_expiry", "size") VALUES
(2, 'หนังสือ Physics I (01420111)', 'Books', 'Good', 'มีรอยไฮไลท์เล็กน้อย สภาพดี 85%', 'Listed', '01420111', 'KU Press', NULL, NULL),
(2, 'เสื้อนิสิตทรงบอย ไซส์ XL', 'Clothing', 'New', 'ยังไม่เคยใส่ ซื้อมาผิดไซส์', 'Listed', NULL, 'ร้านมุมทอง', NULL, 'XL'),
(3, 'iPad Air 5 64GB Wi-Fi', 'Electronics', 'Good', 'ติดฟิล์มกระดาษแล้ว แถมเคส', 'Listed', NULL, 'Apple', '2026-12-31', '64GB'),
(4, 'เครื่องคิดเลข Casio FX-991EX', 'Electronics', 'Good', 'ใช้สอบแคลคูลัสเสร็จแล้วส่งต่อ', 'Listed', NULL, 'Casio', NULL, NULL),
(5, 'หูฟัง Sony WH-1000XM4', 'Electronics', 'Good', 'สภาพสวย อุปกรณ์ครบกล่อง', 'Listed', NULL, 'Sony', '2026-10-15', NULL),
(4, 'รองเท้าคอนเวิร์ส สีขาว', 'Clothing', 'Acceptable', 'ใส่ไปเรียน 1 เทอม สภาพใช้งาน', 'Unlisted', NULL, 'Converse', NULL, '42'),
(5, 'หนังสือ Calculus II', 'Books', 'Good', 'ไม่มีรอยขีดเขียน', 'Unlisted', '01417112', 'KU Press', NULL, NULL),
(6, 'พัดลมตั้งโต๊ะ Hatari 16 นิ้ว', 'Appliances', 'Acceptable', 'ลมแรงปกติ สภาพตามการใช้งาน', 'Transferred', NULL, 'Hatari', NULL, NULL),
(3, 'แว่นตากันแดด Rayban', 'Accessories', 'New', 'ของแท้ ซื้อมาไม่ได้ใส่', 'Unlisted', NULL, 'Rayban', NULL, NULL),
(2, 'กระเป๋าเป้ Anello สีดำ', 'Bags', 'Good', 'ซิปใช้งานได้ปกติทุกจุด', 'Unlisted', NULL, 'Anello', NULL, 'Medium');

-- 5. Item_Image (6 rows)
INSERT INTO "Item_Image" ("item_id", "item_image_status", "image_url", "is_primary", "display_order") VALUES
(1, 'Active', 'https://r2.ku-market.com/items/physics_1.jpg', TRUE, 1),
(2, 'Active', 'https://r2.ku-market.com/items/shirt_1.jpg', TRUE, 1),
(3, 'Active', 'https://r2.ku-market.com/items/ipad_1.jpg', TRUE, 1),
(3, 'Active', 'https://r2.ku-market.com/items/ipad_2.jpg', FALSE, 2),
(4, 'Active', 'https://r2.ku-market.com/items/casio_1.jpg', TRUE, 1),
(5, 'Active', 'https://r2.ku-market.com/items/sony_1.jpg', TRUE, 1);

-- 6. Post (5 posts)
INSERT INTO "Post" ("item_id", "post_type", "post_status", "price", "quantity_total", "quantity_remaining") VALUES
(1, 'SellOnly', 'Active', 180.00, 1, 1),
(2, 'SellOnly', 'Active', 120.00, 1, 1),
(3, 'Both', 'Active', 14500.00, 1, 1),
(4, 'TradeOnly', 'Active', 0.00, 1, 1),
(5, 'Both', 'Inactive', 7500.00, 1, 0);

-- 7. Offer (5 offers)
INSERT INTO "Offer" ("post_id", "proposer_id", "additional_money", "offer_status") VALUES
(3, 4, 13000.00, 'Pending'),
(4, 2, 0.00, 'Accepted'),
(3, 5, 14000.00, 'Rejected'),
(1, 6, 0.00, 'Cancelled'),
(5, 3, 7000.00, 'Withdrawn');

-- 8. Offer_Item (5 rows)
INSERT INTO "Offer_Item" ("offer_id", "item_id") VALUES
(1, 4), -- User 4 ยื่นเครื่องคิดเลข + เงิน 13,000 แลก iPad
(1, 6), -- User 4 ยื่นรองเท้าเพิ่มเติม
(2, 1), -- User 2 ยื่นหนังสือ Physics แลกเครื่องคิดเลข
(3, 7), -- User 5 ยื่นหนังสือ Calc II แลก iPad
(5, 9); -- User 3 ยื่นแว่นตา Rayban

-- 9. Report (5 reports)
INSERT INTO "Report" ("reporter_id", "report_type", "target_id", "reason_category", "details", "report_status", "handled_by", "resolution_note", "handled_at") VALUES
(4, 'Post', 2, 'Inappropriate Content', 'รูปภาพไม่ชัดเจนและสุ่มเสี่ยง', 'Pending', NULL, NULL, NULL),
(3, 'User', 6, 'Scam', 'ไม่ยอมส่งของตามกำหนดและติดต่อไม่ได้', 'Under_Investigation', 1, 'กำลังติดต่อผู้ถูกรายงาน', NULL),
(2, 'Transaction', 1, 'Payment Issue', 'ผู้ซื้อส่งสลิปปลอมเข้ามาในระบบ', 'Violation_Confirmed', 1, 'ยืนยันความผิด ทำการระงับบัญชีผู้ซื้อ', '2026-08-11 10:00:00'),
(5, 'Post', 1, 'Duplicate Post', 'พบการลงโพสต์ซ้ำหลายครั้ง', 'Report_Dismissed', 1, 'ตรวจสอบแล้วไม่พบการสแปมโพสต์', '2026-08-11 11:30:00'),
(6, 'User', 3, 'Harassment', 'ใช้ถ้อยคำไม่สุภาพในแชท', 'Pending', NULL, NULL, NULL);

-- 10. Transaction (5 transactions)
INSERT INTO "Transaction" (
    "post_id", "offer_id", "buyer_id", "seller_id", "quantity", 
    "transaction_status", "active_report_id", "delivery_method", "slip_image_url", 
    "tracking_number", "payment_confirmed_by_buyer_at", "payment_confirmed_by_seller_at"
) VALUES 
(1, NULL, 3, 2, 1, 'Processing', 3, 'Meetup', 'https://r2.ku-market.com/slips/tx1.jpg', NULL, '2026-08-10 14:00:00', '2026-08-10 14:05:00'),
(2, NULL, 4, 2, 1, 'Completed', NULL, 'Shipping', 'https://r2.ku-market.com/slips/tx2.jpg', 'TH123456789', '2026-08-08 09:00:00', '2026-08-08 09:10:00'),
(4, 2, 2, 4, 1, 'Completed', NULL, 'Meetup', NULL, NULL, NULL, NULL),
(3, NULL, 5, 3, 1, 'Pending', NULL, 'Meetup', NULL, NULL, NULL, NULL),
(5, NULL, 6, 5, 1, 'Cancelled', NULL, 'Shipping', NULL, NULL, NULL, NULL);

-- 11. Appointment_Card (5 cards)
INSERT INTO "Appointment_Card" ("transaction_id", "proposed_by", "date", "time", "location", "appointment_status") VALUES
(1, 2, '2026-08-12', '12:30:00', 'บาร์ใหม่ (Bar Kaset)', 'Confirmed'),
(3, 4, '2026-08-13', '16:00:00', 'สำนักหอสมุด มก.', 'Confirmed'),
(4, 5, '2026-08-14', '10:00:00', 'อาคารสารนิเทศ 50 ปี', 'Pending'),
(1, 3, '2026-08-11', '11:00:00', 'หน้าตึก SC1', 'Rejected'),
(5, 6, '2026-08-15', '14:00:00', 'โรงอาหารกลาง 2', 'Rejected');

-- 12. Giveaway_Post (5 posts)
INSERT INTO "Giveaway_Post" ("item_name", "description", "pickup_location", "giver_id", "allocation_method", "quantity", "registration_deadline", "pickup_deadline", "giveaway_status") VALUES
('ชีทสรุป Gen Chem พร้อมข้อสอบเก่า', 'แจกฟรีนิสิตปี 1 ครับ นัดรับที่ตึกเรียนรวม', 'ตึก LH1 ชั้น 1', 2, 'FirstCome', 3, '2026-08-14 17:00:00', '2026-08-15 17:00:00', 'Active'),
('เสื้อเชิ้ตนิสิตชาย ไซส์ L', 'สภาพดี 90% แจกเพราะสวมไม่ได้แล้ว', 'บาร์ใหม่', 3, 'Random', 1, '2026-08-18 18:00:00', '2026-08-20 18:00:00', 'Active'),
('หนังสือนิยายภาษาอังกฤษ 3 เล่ม', 'ส่งต่อให้คนที่สนใจฝึกภาษาครับ', 'หอพักนิสิตชาย', 4, 'Manual', 1, '2026-08-16 20:00:00', '2026-08-18 20:00:00', 'Active'),
('สายชาร์จ Type-C ความยาว 1m', 'ของใหม่ยังไม่ได้แกะกล่อง', 'หน้าตึก SC1', 5, 'FirstCome', 1, '2026-08-09 12:00:00', '2026-08-10 12:00:00', 'Closed'),
('กระติกน้ำเก็บความเย็น', 'แจกกระติกน้ำสภาพใช้งานได้ปกติ', 'บาร์ใหม่', 6, 'Random', 1, '2026-08-04 15:00:00', '2026-08-05 15:00:00', 'Completed');

-- 13. Giveaway_Ticket (5 tickets)
INSERT INTO "Giveaway_Ticket" ("giveaway_id", "receiver_id", "qr_token", "ticket_status") VALUES
(1, 3, 'GIVE_TOK_1001_CHEM', 'Waiting'),
(1, 4, 'GIVE_TOK_1002_CHEM', 'Waiting'),
(2, 5, 'GIVE_TOK_2001_SHIRT', 'Waiting'),
(4, 2, 'GIVE_TOK_4001_CABLE', 'Expired'),
(5, 3, 'GIVE_TOK_5001_BOTTLE', 'Received');

-- 14. Giveaway_Image (5 images)
INSERT INTO "Giveaway_Image" ("giveaway_id", "image_status", "image_url", "display_order") VALUES
(1, 'Active', 'https://r2.ku-market.com/giveaways/chem_summary.jpg', 1),
(2, 'Active', 'https://r2.ku-market.com/giveaways/shirt_give.jpg', 1),
(3, 'Active', 'https://r2.ku-market.com/giveaways/novels.jpg', 1),
(4, 'Active', 'https://r2.ku-market.com/giveaways/cable.jpg', 1),
(5, 'Active', 'https://r2.ku-market.com/giveaways/bottle.jpg', 1);

-- 15. Chat_Room (5 rooms)
INSERT INTO "Chat_Room" ("transaction_id", "giveaway_id", "chat_room_status") VALUES
(1, NULL, 'Active'),
(2, NULL, 'Active'),
(3, NULL, 'Active'),
(NULL, 1, 'Active'),
(NULL, 2, 'Inactive');

-- 16. Chat_Message (5 messages)
INSERT INTO "Chat_Message" ("room_id", "sender_id", "content") VALUES
(1, 3, 'สวัสดีครับ สะดวกเจอบาร์ใหม่กี่โมงครับ?'),
(1, 2, 'เที่ยงครึ่งวันพุธได้เลยครับ เดี๋ยวใส่เสื้อสีเทาไปนะ'),
(2, 4, 'โอนเงินแล้วนะครับ รบกวนขอเลขพัสดุด้วยครับ'),
(2, 2, 'จัดส่งเรียบร้อยครับ เลขพัสดุ TH123456789'),
(4, 3, 'ลงทะเบียนรับชีทสรุปเรียบร้อยแล้วครับ ขอบคุณครับ');

-- 17. Appeal (5 appeals)
INSERT INTO "Appeal" ("report_id", "appellant_id", "reason", "appeal_status", "handled_by", "resolution_note", "handled_at") VALUES
(1, 2, 'ภาพถ่ายเสื้อนิสิตถูกต้องตามระเบียบครับ ขอความกรุณาตรวจสอบใหม่', 'Pending', NULL, NULL, NULL),
(2, 6, 'ผมจัดส่งของล่าช้าเนื่องจากติดสอบครับ ไม่ได้มีเจตนาสแกม', 'Under_Review', 1, NULL, NULL),
(3, 3, 'ผมโอนเงินจริงจากแอปธนาคาร สลิปถูกต้องแน่นอนครับ', 'Approved', 1, 'อนุมัติการอุทธรณ์ ตรวจสอบสลิปซ้ำแล้วสมบูรณ์', '2026-08-11 11:00:00'),
(4, 5, 'เข้าใจผิดเรื่องการโพสต์ซ้ำครับ เนื่องจากระบบค้าง', 'Rejected', 1, 'ยกเลิกการอุทธรณ์ เนื่องจากสเปคสินค้าเหมือนกันทุกประการ', '2026-08-11 12:00:00'),
(5, 3, 'ไม่ได้ใช้ถ้อยคำก่อกวนครับ เพียงแค่สอบถามข้อมูลสินค้าเพิ่มเติม', 'Pending', NULL, NULL, NULL);

UPDATE "User"
SET password_hash = '$2b$10$AUs8o854vW5fFQtSrsQwS.IJdKEq8lB1TAZwiB8I10zcKPVQG6kDm'
WHERE user_id BETWEEN 1 AND 15;

-- เช็คผลลัพธ์
SELECT user_id, email, LEFT(password_hash, 15) AS hash_preview FROM "User" ORDER BY user_id;