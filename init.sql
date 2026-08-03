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
    "status" VARCHAR(20) DEFAULT 'Active' CHECK("status" IN ('Active', 'Suspended', 'Banned', 'Deleted')),
    "email_verified_at" TIMESTAMP,
    "isadmin" BOOLEAN DEFAULT FALSE,
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
    "status" VARCHAR(20) DEFAULT 'Unlisted' CHECK("status" IN ('Unlisted', 'Listed', 'Transferred')),
    "course_name" VARCHAR(100),
    "brand_model" VARCHAR(100),
    "warranty_expiry" DATE,
    "size" VARCHAR(20),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Item_Image Table
CREATE TABLE "Item_Image" (
    "image_id" SERIAL PRIMARY KEY,
    "item_id" INTEGER NOT NULL REFERENCES "Item"("item_id"),
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
    "price" DECIMAL(10,2) NOT NULL,
    "quantity_total" INTEGER NOT NULL DEFAULT 1,
    "quantity_remaining" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Offer Table
CREATE TABLE "Offer" (
    "offer_id" SERIAL PRIMARY KEY,
    "post_id" INTEGER NOT NULL REFERENCES "Post"("post_id"),
    "proposer_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "additional_money" DECIMAL(10,2) DEFAULT 0.00,
    "status" VARCHAR(20) DEFAULT 'Pending' CHECK("status" IN ('Pending', 'Accepted', 'Rejected', 'Cancelled', 'Withdrawn')),
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
    "status" VARCHAR(20) DEFAULT 'Pending' CHECK ("status" IN ('Pending','Under_Investigation', 'Violation_Confirmed','Report_Dismissed')),
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
    "quantity" INTEGER DEFAULT 1,
    "status" VARCHAR(20) DEFAULT 'Pending' CHECK("status" IN ('Pending', 'Processing', 'Completed', 'Pending Refund', 'Cancelled', 'Refunded')),
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
    "refund_slip_url" VARCHAR(500),
    "refund_confirmed_by_buyer" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Appointment_Card Table
CREATE TABLE "Appointment_Card" (
    "appointment_id" SERIAL PRIMARY KEY,
    "transaction_id" INTEGER NOT NULL REFERENCES "Transaction"("transaction_id"),
    "proposed_by" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'Pending' CHECK("status" IN ('Pending', 'Confirmed', 'Rejected')),
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
    "pickup_deadline" TIMESTAMP,
    "status" VARCHAR(20) DEFAULT 'Active' CHECK("status" IN ('Active', 'Closed', 'Completed')),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Giveaway_Ticket Table
CREATE TABLE "Giveaway_Ticket" (
    "ticket_id" SERIAL PRIMARY KEY,
    "giveaway_id" INTEGER NOT NULL REFERENCES "Giveaway_Post"("giveaway_id"),
    "receiver_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "qr_token" VARCHAR(255) UNIQUE,
    "status" VARCHAR(20) DEFAULT 'Waiting' CHECK("status" IN ('Waiting', 'Received', 'Expired')),
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Giveaway_Image Table
CREATE TABLE "Giveaway_Image" (
    "image_id" SERIAL PRIMARY KEY,
    "giveaway_id" INTEGER NOT NULL REFERENCES "Giveaway_Post"("giveaway_id"),
    "image_url" VARCHAR(500) NOT NULL,
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Chat_Room Table
CREATE TABLE "Chat_Room" (
    "room_id" SERIAL PRIMARY KEY,
    "transaction_id" INTEGER REFERENCES "Transaction"("transaction_id"),
    "giveaway_id" INTEGER REFERENCES "Giveaway_Post"("giveaway_id"),
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
    "status" VARCHAR(20) NOT NULL CHECK("status" IN ('Pending', 'Under_Review', 'Approved', 'Rejected')),
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
    "status" VARCHAR(20) DEFAULT 'Active' CHECK("status" IN ('Active', 'Expired', 'Cancelled')),
    "start_date" TIMESTAMP,
    "end_date" TIMESTAMP
);

-- 17. Subscription_Payment Table
CREATE TABLE "Subscription_Payment" (
    "payment_id" SERIAL PRIMARY KEY,
    "subscription_id" INTEGER NOT NULL REFERENCES "Subscription"("subscription_id"),
    "user_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "amount" INTEGER NOT NULL,
    "slip_image_url" VARCHAR(500) NOT NULL,
    "status" VARCHAR(25) NOT NULL DEFAULT 'Pending' CHECK("status" IN ('Pending', 'Verified', 'Rejected')),
    "rejection_reason" TEXT,
    "handled_by" INTEGER REFERENCES "User"("user_id"),
    "handled_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- RICH MOCK DATA FOR KU MARKETPLACE (17 TABLES)
-- ==========================================

-- ------------------------------------------
-- 1. USER (12 Users)
-- ------------------------------------------
INSERT INTO "User" ("user_id", "email", "first_name_en", "last_name_en", "first_name_th", "last_name_th", "password_hash", "phone_number", "status", "email_verified_at", "isadmin") VALUES
(1, 'admin.ku@ku.th', 'Admin', 'Marketplace', 'แอดมิน', 'มก', '$2b$10$e84b81c22360b382d6110', '0800000000', 'Active', NOW() - INTERVAL '30 days', TRUE),
(2, 'somchai.sae@ku.th', 'Somchai', 'Saetang', 'สมชาย', 'แซ่ตั้ง', '$2b$10$e84b81c22360b382d6110', '0812345678', 'Active', NOW() - INTERVAL '25 days', FALSE),
(3, 'somsri.kew@ku.th', 'Somsri', 'Kaewmanee', 'สมศรี', 'แก้วมณี', '$2b$10$e84b81c22360b382d6110', '0823456789', 'Active', NOW() - INTERVAL '20 days', FALSE),
(4, 'anan.pra@ku.th', 'Anan', 'Prakarn', 'อนันต์', 'ปราการ', '$2b$10$e84b81c22360b382d6110', '0834567890', 'Active', NOW() - INTERVAL '18 days', FALSE),
(5, 'pimchanok.s@ku.th', 'Pimchanok', 'Suwannarat', 'พิมพ์ชนก', 'สุวรรณรัตน์', '$2b$10$e84b81c22360b382d6110', '0845678901', 'Active', NOW() - INTERVAL '15 days', FALSE),
(6, 'thanawat.p@ku.th', 'Thanawat', 'Phakdee', 'ธนวัฒน์', 'ภักดี', '$2b$10$e84b81c22360b382d6110', '0856789012', 'Active', NOW() - INTERVAL '12 days', FALSE),
(7, 'chutima.m@ku.th', 'Chutima', 'Maneerat', 'ชุติมา', 'มณีรัตน์', '$2b$10$e84b81c22360b382d6110', '0867890123', 'Active', NOW() - INTERVAL '10 days', FALSE),
(8, 'natthapong.t@ku.th', 'Natthapong', 'Thongchai', 'ณัฐพงษ์', 'ธงชัย', '$2b$10$e84b81c22360b382d6110', '0878901234', 'Active', NOW() - INTERVAL '8 days', FALSE),
(9, 'kamonchanok.v@ku.th', 'Kamonchanok', 'Vongsa', 'กมลชนก', 'วงษา', '$2b$10$e84b81c22360b382d6110', '0889012345', 'Suspended', NOW() - INTERVAL '5 days', FALSE),
(10, 'phurit.k@ku.th', 'Phurit', 'Kijcharoen', 'ภูริต', 'กิจเจริญ', '$2b$10$e84b81c22360b382d6110', '0890123456', 'Active', NOW() - INTERVAL '3 days', FALSE),
(11, 'wichai.s@ku.th', 'Wichai', 'Sombat', 'วิชัย', 'สมบัติ', '$2b$10$e84b81c22360b382d6110', '0891112233', 'Banned', NOW() - INTERVAL '30 days', FALSE),
(12, 'kanya.p@ku.th', 'Kanya', 'Phakdi', 'กัญญา', 'ภักดี', '$2b$10$e84b81c22360b382d6110', '0892223344', 'Deleted', NULL, FALSE);

SELECT setval(pg_get_serial_sequence('"User"', 'user_id'), 12);


-- ------------------------------------------
-- 2. SUBSCRIPTION (12 Rows)
-- ------------------------------------------
INSERT INTO "Subscription" ("subscription_id", "user_id", "tier", "posts_used_this_month", "status", "start_date", "end_date") VALUES
(1, 1, 'Diamond', 0, 'Active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days'),
(2, 2, 'Gold', 4, 'Active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days'),
(3, 3, 'Silver', 2, 'Active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days'),
(4, 4, 'Free', 1, 'Active', NOW() - INTERVAL '18 days', NULL),
(5, 5, 'Gold', 1, 'Active', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days'),
(6, 6, 'Free', 0, 'Active', NOW() - INTERVAL '12 days', NULL),
(7, 7, 'Free', 0, 'Active', NOW() - INTERVAL '10 days', NULL),
(8, 8, 'Free', 0, 'Active', NOW() - INTERVAL '8 days', NULL),
(9, 9, 'Free', 0, 'Cancelled', NOW() - INTERVAL '5 days', NULL),
(10, 10, 'Silver', 1, 'Active', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days'),
(11, 11, 'Free', 0, 'Expired', NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days'),
(12, 12, 'Free', 0, 'Cancelled', NOW() - INTERVAL '40 days', NULL);

SELECT setval(pg_get_serial_sequence('"Subscription"', 'subscription_id'), 12);


-- ------------------------------------------
-- 3. SUBSCRIPTION_PAYMENT (6 Payments)
-- ------------------------------------------
INSERT INTO "Subscription_Payment" ("payment_id", "subscription_id", "user_id", "amount", "slip_image_url", "status", "rejection_reason", "handled_by", "handled_at", "created_at") VALUES
(1, 2, 2, 199, 'https://picsum.photos/id/101/600/800', 'Verified', NULL, 1, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
(2, 3, 3, 99, 'https://picsum.photos/id/102/600/800', 'Verified', NULL, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
(3, 5, 5, 199, 'https://picsum.photos/id/103/600/800', 'Verified', NULL, 1, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
(4, 10, 10, 99, 'https://picsum.photos/id/104/600/800', 'Verified', NULL, 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(5, 4, 4, 199, 'https://picsum.photos/id/105/600/800', 'Rejected', 'สลิปไม่ชัดเจน ไม่สามารถตรวจสอบยอดเงินได้', 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(6, 8, 8, 199, 'https://picsum.photos/id/106/600/800', 'Pending', NULL, NULL, NULL, NOW() - INTERVAL '2 hours');

SELECT setval(pg_get_serial_sequence('"Subscription_Payment"', 'payment_id'), 6);


-- ------------------------------------------
-- 4. ITEM (15 Items)
-- ------------------------------------------
INSERT INTO "Item" ("item_id", "owner_id", "name", "category", "condition", "description", "status", "course_name", "brand_model", "warranty_expiry", "size", "created_at") VALUES
(1, 2, 'หนังสือ Calculus 1 (01417111)', 'Books', 'Good', 'มีรอยไฮไลท์จดตามคาบอาจารย์เล็กน้อย สภาพดีมาก', 'Listed', '01417111', 'สำนักพิมพ์ มก.', NULL, NULL, NOW() - INTERVAL '14 days'),
(2, 2, 'เสื้อเชิ้ตนิสิตชาย แขนยาว Size 42', 'Clothing', 'Good', 'ใส่เฉพาะวันสอบ 2 ครั้ง สภาพเหมือนใหม่', 'Transferred', NULL, 'มุมทอง', NULL, '42', NOW() - INTERVAL '13 days'),
(3, 3, 'iPad Air 5 64GB WiFi Space Gray', 'Electronics', 'Good', 'แถมเคสและติดฟิล์มกระจกแล้ว สภาพ 95%', 'Listed', NULL, 'Apple iPad Air 5', '2027-01-01', NULL, NOW() - INTERVAL '10 days'),
(4, 4, 'หูฟังไร้สาย Sony WH-1000XM4', 'Electronics', 'Good', 'ตัดเสียงรบกวนดีมาก เหมาะใส่อ่านหนังสือ', 'Listed', NULL, 'Sony WH-1000XM4', NULL, NULL, NOW() - INTERVAL '9 days'),
(5, 5, 'จักรยานปั่นในมก. สีเขียว', 'Vehicles', 'Acceptable', 'ใช้งานปั่นไปเรียนได้ปกติ ยางเพิ่งเปลี่ยนใหม่', 'Listed', NULL, 'LA Bicycle', NULL, NULL, NOW() - INTERVAL '5 days'),
(6, 5, 'ชุดกาวน์แลบ คณะวิทยาศาสตร์ Size L', 'Clothing', 'Good', 'ซักสะอาดเรียบร้อย ไม่มีรอยเปื้อนเคมี', 'Listed', '01403111', 'KU Co-op', NULL, 'L', NOW() - INTERVAL '4 days'),
(7, 6, 'โคมไฟอ่านหนังสือตั้งโต๊ะ LED', 'Home & Living', 'Good', 'ปรับความสว่างได้ 3 ระดับ ชาร์จ USB ได้', 'Listed', NULL, 'Xiaomi', NULL, NULL, NOW() - INTERVAL '4 days'),
(8, 7, 'หนังสือ Physics for Scientists (01420111)', 'Books', 'New', 'ซื้อมาซ้ำยังไม่ได้แกะซีลเลยครับ', 'Listed', '01420111', 'Pearson', NULL, NULL, NOW() - INTERVAL '3 days'),
(9, 8, 'เครื่องคิดเลขวิทยาศาสตร์ FX-991EX', 'Electronics', 'Good', 'ใช้เข้าห้องสอบวิศวะ/วิทยาได้แน่นอน', 'Transferred', '01417112', 'Casio FX-991EX', NULL, NULL, NOW() - INTERVAL '3 days'),
(10, 10, 'กระเป๋าเป้ใส่โน้ตบุ๊ก 15.6 นิ้ว', 'Bags', 'Good', 'กันน้ำได้ระดับหนึ่ง มีช่องใส่ของเยอะ', 'Unlisted', NULL, 'Targus', NULL, NULL, NOW() - INTERVAL '2 days'),
(11, 3, 'Apple Pencil 2', 'Electronics', 'Good', 'ใช้งานได้ปกติ สภาพสวย ไม่เคยตก', 'Listed', NULL, 'Apple', '2026-11-01', NULL, NOW() - INTERVAL '2 days'),
(12, 4, 'พัดลมไอเย็นตั้งโต๊ะขนาดเล็ก', 'Home & Living', 'Acceptable', 'เหมาะสำหรับวางบนโต๊ะอ่านหนังสือในหอพัก', 'Listed', NULL, 'Hatari', NULL, NULL, NOW() - INTERVAL '1 day'),
(13, 10, 'รองเท้าคัทชูนิสิตชาย Size 43', 'Clothing', 'Good', 'ใส่พิธีการไป 3 ครั้ง', 'Listed', NULL, 'รองเท้าหนังแท้', NULL, '43', NOW() - INTERVAL '1 day'),
(14, 2, 'หนังสือ General Chemistry', 'Books', 'Poor', 'หน้าปกมีรอยยับ มีรอยเขียนเยอะ ขอขายถูกๆ', 'Listed', '01403111', 'McGrawHill', NULL, NULL, NOW() - INTERVAL '12 hours'),
(15, 6, 'คีย์บอร์ดบลูทูธไร้สาย', 'Electronics', 'Good', 'เชื่อมต่อได้ 3 อุปกรณ์พร้อมกัน', 'Listed', NULL, 'Logitech K380', NULL, NULL, NOW() - INTERVAL '2 hours');

SELECT setval(pg_get_serial_sequence('"Item"', 'item_id'), 15);


-- ------------------------------------------
-- 5. ITEM_IMAGE (20 Images)
-- ------------------------------------------
INSERT INTO "Item_Image" ("image_id", "item_id", "image_url", "is_primary", "display_order", "created_at") VALUES
(1, 1, 'https://picsum.photos/id/24/800/600', TRUE, 1, NOW()),
(2, 2, 'https://picsum.photos/id/1059/800/600', TRUE, 1, NOW()),
(3, 3, 'https://picsum.photos/id/0/800/600', TRUE, 1, NOW()),
(4, 3, 'https://picsum.photos/id/1/800/600', FALSE, 2, NOW()),
(5, 4, 'https://picsum.photos/id/1082/800/600', TRUE, 1, NOW()),
(6, 5, 'https://picsum.photos/id/146/800/600', TRUE, 1, NOW()),
(7, 6, 'https://picsum.photos/id/1025/800/600', TRUE, 1, NOW()),
(8, 7, 'https://picsum.photos/id/201/800/600', TRUE, 1, NOW()),
(9, 8, 'https://picsum.photos/id/367/800/600', TRUE, 1, NOW()),
(10, 9, 'https://picsum.photos/id/160/800/600', TRUE, 1, NOW()),
(11, 10, 'https://picsum.photos/id/1062/800/600', TRUE, 1, NOW()),
(12, 11, 'https://picsum.photos/id/305/800/600', TRUE, 1, NOW()),
(13, 12, 'https://picsum.photos/id/400/800/600', TRUE, 1, NOW()),
(14, 13, 'https://picsum.photos/id/500/800/600', TRUE, 1, NOW()),
(15, 14, 'https://picsum.photos/id/25/800/600', TRUE, 1, NOW()),
(16, 15, 'https://picsum.photos/id/600/800/600', TRUE, 1, NOW()),
(17, 3, 'https://picsum.photos/id/2/800/600', FALSE, 3, NOW()),
(18, 5, 'https://picsum.photos/id/147/800/600', FALSE, 2, NOW()),
(19, 8, 'https://picsum.photos/id/368/800/600', FALSE, 2, NOW()),
(20, 15, 'https://picsum.photos/id/601/800/600', FALSE, 2, NOW());

SELECT setval(pg_get_serial_sequence('"Item_Image"', 'image_id'), 20);


-- ------------------------------------------
-- 6. POST (12 Posts)
-- ------------------------------------------
INSERT INTO "Post" ("post_id", "item_id", "post_type", "price", "quantity_total", "quantity_remaining", "created_at") VALUES
(1, 1, 'SellOnly', 250.00, 1, 1, NOW() - INTERVAL '14 days'),
(2, 2, 'SellOnly', 180.00, 1, 0, NOW() - INTERVAL '13 days'),
(3, 3, 'Both', 14500.00, 1, 1, NOW() - INTERVAL '10 days'),
(4, 4, 'TradeOnly', 0.00, 1, 1, NOW() - INTERVAL '9 days'),
(5, 5, 'SellOnly', 800.00, 1, 1, NOW() - INTERVAL '5 days'),
(6, 6, 'SellOnly', 150.00, 1, 1, NOW() - INTERVAL '4 days'),
(7, 7, 'SellOnly', 290.00, 1, 1, NOW() - INTERVAL '4 days'),
(8, 8, 'Both', 450.00, 1, 1, NOW() - INTERVAL '3 days'),
(9, 11, 'SellOnly', 2200.00, 1, 1, NOW() - INTERVAL '2 days'),
(10, 12, 'SellOnly', 350.00, 1, 1, NOW() - INTERVAL '1 day'),
(11, 13, 'SellOnly', 400.00, 1, 1, NOW() - INTERVAL '1 day'),
(12, 15, 'Both', 650.00, 1, 1, NOW() - INTERVAL '2 hours');

SELECT setval(pg_get_serial_sequence('"Post"', 'post_id'), 12);


-- ------------------------------------------
-- 7. OFFER (6 Offers)
-- ------------------------------------------
INSERT INTO "Offer" ("offer_id", "post_id", "proposer_id", "additional_money", "status", "created_at") VALUES
(1, 3, 4, 2000.00, 'Pending', NOW() - INTERVAL '8 days'),
(2, 4, 3, 0.00, 'Rejected', NOW() - INTERVAL '7 days'),
(3, 8, 2, 100.00, 'Accepted', NOW() - INTERVAL '2 days'),
(4, 3, 6, 1000.00, 'Cancelled', NOW() - INTERVAL '5 days'),
(5, 12, 10, 0.00, 'Pending', NOW() - INTERVAL '1 hour'),
(6, 4, 5, 500.00, 'Withdrawn', NOW() - INTERVAL '3 days');

SELECT setval(pg_get_serial_sequence('"Offer"', 'offer_id'), 6);


-- ------------------------------------------
-- 8. OFFER_ITEM (Junction Table)
-- ------------------------------------------
INSERT INTO "Offer_Item" ("offer_id", "item_id") VALUES
(1, 4),  -- อนันต์ยื่น หูฟัง Sony (item 4) ขอแลก iPad (post 3)
(2, 3),  -- สมศรียื่น iPad (item 3)
(3, 1),  -- สมชายยื่น หนังสือ Calculus (item 1) ขอแลก Physics (post 8)
(4, 7),  -- ธนวัฒน์ยื่น โคมไฟ LED (item 7)
(5, 13), -- ภูริตยื่น รองเท้าคัทชู (item 13)
(6, 6);  -- พิมพ์ชนกยื่น ชุดกาวน์ (item 6)


-- ------------------------------------------
-- 9. REPORT (5 Reports)
-- ------------------------------------------
INSERT INTO "Report" ("report_id", "reporter_id", "report_type", "target_id", "reason_category", "details", "evidence_urls", "status", "handled_by", "resolution_note", "handled_at", "created_at") VALUES
(1, 3, 'Transaction', 1, 'Non-responsive seller', 'ผู้ขายไม่ยอมมาตามนัดหมายที่หอสมุดและติดต่อไม่ได้เกิน 24 ชม.', '["https://picsum.photos/id/10/800/600"]'::jsonb, 'Under_Investigation', 1, NULL, NULL, NOW() - INTERVAL '6 days'),
(2, 6, 'Post', 5, 'Misleading description', 'จักรยานเบรคเสื่อมสภาพมาก ไม่ตรงตามที่ลงไว้ในรายละเอียด', '["https://picsum.photos/id/11/800/600"]'::jsonb, 'Pending', NULL, NULL, NULL, NOW() - INTERVAL '3 days'),
(3, 4, 'User', 11, 'Harassment', 'ส่งข้อความก่อกวนและใช้คำไม่สุภาพในระบบแชต', '["https://picsum.photos/id/12/800/600"]'::jsonb, 'Violation_Confirmed', 1, 'ทำการระงับการใช้งานผู้ใช้เรียบร้อยแล้ว', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days'),
(4, 5, 'Post', 1, 'Spam', 'โพสต์ขายหนังสือซ้ำๆ หลายครั้ง', NULL, 'Report_Dismissed', 1, 'ตรวจสอบแล้วไม่อยู่ในเงื่อนไขการสแปม', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '1 day'),
(5, 7, 'User', 9, 'Suspicious behavior', 'บัญชีผู้ใช้นี้เข้าข่ายบัญชีปลอม', NULL, 'Pending', NULL, NULL, NULL, NOW() - INTERVAL '2 hours');

SELECT setval(pg_get_serial_sequence('"Report"', 'report_id'), 5);


-- ------------------------------------------
-- 10. TRANSACTION (6 Transactions)
-- ------------------------------------------
INSERT INTO "Transaction" ("transaction_id", "post_id", "offer_id", "buyer_id", "seller_id", "quantity", "status", "active_report_id", "delivery_method", "slip_image_url", "tracking_number", "estimated_delivery_date", "payment_confirmed_by_buyer_at", "payment_confirmed_by_seller_at", "item_received_confirmed_by_buyer_at", "item_received_confirmed_by_seller_at", "item_return_confirmed_at", "cancellation_requested_by", "refund_slip_url", "refund_confirmed_by_buyer", "created_at") VALUES
(1, 1, NULL, 3, 2, 1, 'Processing', 1, 'Meetup', 'https://picsum.photos/id/20/600/800', NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NULL, NULL, NULL, NULL, NULL, FALSE, NOW() - INTERVAL '7 days'),
(2, 2, NULL, 6, 2, 1, 'Completed', NULL, 'Meetup', 'https://picsum.photos/id/21/600/800', NULL, NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days', NULL, NULL, NULL, FALSE, NOW() - INTERVAL '11 days'),
(3, 6, NULL, 8, 5, 1, 'Pending', NULL, 'Shipping', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, NOW() - INTERVAL '2 days'),
(4, 7, NULL, 10, 6, 1, 'Processing', NULL, 'Shipping', 'https://picsum.photos/id/22/600/800', 'TH123456789', '2026-08-10', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NULL, NULL, NULL, NULL, NULL, FALSE, NOW() - INTERVAL '1 day'),
(5, 5, NULL, 4, 5, 1, 'Cancelled', NULL, 'Meetup', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, FALSE, NOW() - INTERVAL '4 days'),
(6, 8, 3, 2, 7, 1, 'Completed', NULL, 'Meetup', 'https://picsum.photos/id/23/600/800', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours', NULL, NULL, NULL, FALSE, NOW() - INTERVAL '2 days');

SELECT setval(pg_get_serial_sequence('"Transaction"', 'transaction_id'), 6);


-- ------------------------------------------
-- 11. APPOINTMENT_CARD (4 Cards)
-- ------------------------------------------
INSERT INTO "Appointment_Card" ("appointment_id", "transaction_id", "proposed_by", "date", "time", "location", "status", "created_at") VALUES
(1, 1, 2, '2026-08-10', '13:00:00', 'สำนักหอสมุด มก. (หน้าประตูทางเข้าหลัก)', 'Confirmed', NOW() - INTERVAL '7 days'),
(2, 2, 2, '2026-08-05', '16:30:00', 'อาคารเรียนรวม 4 (ศร.4) ชั้น 1', 'Confirmed', NOW() - INTERVAL '11 days'),
(3, 5, 4, '2026-08-07', '10:00:00', 'บาร์ใหม่ (โรงอาหารกลาง 1)', 'Rejected', NOW() - INTERVAL '4 days'),
(4, 6, 7, '2026-08-08', '15:00:00', 'หน้าคณะวิทยาศาสตร์ มก.', 'Confirmed', NOW() - INTERVAL '2 days');

SELECT setval(pg_get_serial_sequence('"Appointment_Card"', 'appointment_id'), 4);


-- ------------------------------------------
-- 12. GIVEAWAY_POST (4 Giveaway Posts)
-- ------------------------------------------
INSERT INTO "Giveaway_Post" ("giveaway_id", "item_name", "description", "pickup_location", "giver_id", "allocation_method", "pickup_deadline", "status", "created_at") VALUES
(1, 'ชีทสรุป ฟิสิกส์ 1 พร้อมคลังข้อสอบเก่า', 'แจกต่อให้น้องๆ ครับ ปริ้นท์มาเกินไม่ได้ใช้เลย', 'โรงอาหารกลาง 1 (บาร์ใหม่)', 2, 'FirstCome', '2026-08-15 17:00:00', 'Active', NOW() - INTERVAL '5 days'),
(2, 'เสื้อช็อปคณะวิศวกรรมศาสตร์ Size M', 'ส่งต่อครับ เรียนจบแล้ว สภาพยังดีอยู่มาก', 'ตึกช็อปวิศวะ (หน้าลานเกียร์)', 8, 'Random', '2026-08-20 18:00:00', 'Active', NOW() - INTERVAL '3 days'),
(3, 'สมุดโน้ตสเปกตรัม KU ใหม่เอี่ยม 3 เล่ม', 'แจกเหมาหมด 3 เล่ม มารับเองที่หอพักใน', 'หอพักนิสิตชาย หอ 2', 5, 'Manual', '2026-08-12 12:00:00', 'Active', NOW() - INTERVAL '1 day'),
(4, 'ขนมปังและคุกกี้สโมสรนิสิต', 'แจกเพื่อนๆ ก่อนปิดเทอมครับ', 'อาคารสโมสรนิสิต', 10, 'FirstCome', '2026-08-01 16:00:00', 'Closed', NOW() - INTERVAL '10 days');

SELECT setval(pg_get_serial_sequence('"Giveaway_Post"', 'giveaway_id'), 4);


-- ------------------------------------------
-- 13. GIVEAWAY_IMAGE (5 Images)
-- ------------------------------------------
INSERT INTO "Giveaway_Image" ("image_id", "giveaway_id", "image_url", "display_order", "created_at") VALUES
(1, 1, 'https://picsum.photos/id/24/800/600', 1, NOW()),
(2, 2, 'https://picsum.photos/id/1025/800/600', 1, NOW()),
(3, 3, 'https://picsum.photos/id/367/800/600', 1, NOW()),
(4, 4, 'https://picsum.photos/id/1080/800/600', 1, NOW()),
(5, 2, 'https://picsum.photos/id/1026/800/600', 2, NOW());

SELECT setval(pg_get_serial_sequence('"Giveaway_Image"', 'image_id'), 5);


-- ------------------------------------------
-- 14. GIVEAWAY_TICKET (6 Tickets)
-- ------------------------------------------
INSERT INTO "Giveaway_Ticket" ("ticket_id", "giveaway_id", "receiver_id", "qr_token", "status", "updated_at") VALUES
(1, 1, 4, 'GW-TOKEN-8888-AAA', 'Waiting', NOW() - INTERVAL '4 days'),
(2, 1, 7, 'GW-TOKEN-8888-BBB', 'Waiting', NOW() - INTERVAL '3 days'),
(3, 2, 5, 'GW-TOKEN-9999-CCC', 'Waiting', NOW() - INTERVAL '2 days'),
(4, 3, 3, 'GW-TOKEN-7777-DDD', 'Waiting', NOW() - INTERVAL '12 hours'),
(5, 4, 6, 'GW-TOKEN-1111-EEE', 'Received', NOW() - INTERVAL '9 days'),
(6, 4, 8, 'GW-TOKEN-1111-FFF', 'Expired', NOW() - INTERVAL '8 days');

SELECT setval(pg_get_serial_sequence('"Giveaway_Ticket"', 'ticket_id'), 6);


-- ------------------------------------------
-- 15. CHAT_ROOM (6 Rooms)
-- ------------------------------------------
INSERT INTO "Chat_Room" ("room_id", "transaction_id", "giveaway_id", "created_at") VALUES
(1, 1, NULL, NOW() - INTERVAL '7 days'), -- ซื้อขายหนังสือแคลคูลัส
(2, 2, NULL, NOW() - INTERVAL '11 days'), -- ซื้อขายเสื้อนิสิต
(3, NULL, 1, NOW() - INTERVAL '5 days'),  -- กลุ่มแจกชีทฟิสิกส์
(4, 4, NULL, NOW() - INTERVAL '1 day'),  -- ซื้อขายโคมไฟ
(5, 6, NULL, NOW() - INTERVAL '2 days'), -- แลกหนังสือ
(6, NULL, 2, NOW() - INTERVAL '3 days');  -- กลุ่มแจกเสื้อช็อป

SELECT setval(pg_get_serial_sequence('"Chat_Room"', 'room_id'), 6);


-- ------------------------------------------
-- 16. CHAT_MESSAGE (12 Messages)
-- ------------------------------------------
INSERT INTO "Chat_Message" ("message_id", "room_id", "sender_id", "content", "image_urls", "created_at") VALUES
(1, 1, 3, 'สวัสดีครับพี่ โอนเงินค่าหนังสือแคลคูลัสเรียบร้อยแล้วนะครับ', '["https://picsum.photos/id/20/600/800"]'::jsonb, NOW() - INTERVAL '7 days'),
(2, 1, 2, 'ได้รับยอดแล้วครับ สะดวกนัดรับวันจันทร์ตอนบ่ายโมงไหมครับ?', NULL, NOW() - INTERVAL '7 days'),
(3, 1, 3, 'สะดวกครับ เจอตรงหน้าประตูทางเข้าหอสมุดนะครับ', NULL, NOW() - INTERVAL '6 days'),
(4, 2, 6, 'เสื้อนิสิตซักตากเรียบร้อยแล้วใช่ไหมครับ', NULL, NOW() - INTERVAL '11 days'),
(5, 2, 2, 'ใช่ครับ ซักรีดเรียบร้อยพร้อมใส่ได้เลยครับ', NULL, NOW() - INTERVAL '11 days'),
(6, 3, 2, 'ยินดีด้วยกับน้องๆ ที่กดรับสิทธิ์ทันนะครับ นัดรับชีทที่บาร์ใหม่ได้เลย', NULL, NOW() - INTERVAL '5 days'),
(7, 3, 4, 'ขอบคุณมากครับพี่ เดี๋ยวไปรับตามเวลาครับ', NULL, NOW() - INTERVAL '4 days'),
(8, 4, 10, 'จัดส่งแบบพัสดุแล้วขอเลข Tracking ด้วยนะครับ', NULL, NOW() - INTERVAL '1 day'),
(9, 4, 6, 'ส่งแล้วครับ เลข TH123456789 นะครับ', NULL, NOW() - INTERVAL '20 hours'),
(10, 5, 2, 'เสนอแลกหนังสือ Physics กับ Calculus นะครับ เพิ่มเงินให้ 100 บาท', NULL, NOW() - INTERVAL '2 days'),
(11, 5, 7, 'ตกลงครับ นัดเจอกันหน้าคณะวิทยาศาสตร์ครับ', NULL, NOW() - INTERVAL '2 days'),
(12, 6, 8, 'เริ่มสุ่มแจกเสื้อช็อปวันไหนครับพี่', NULL, NOW() - INTERVAL '1 day');

SELECT setval(pg_get_serial_sequence('"Chat_Message"', 'message_id'), 12);


-- ------------------------------------------
-- 17. APPEAL (2 Appeals)
-- ------------------------------------------
INSERT INTO "Appeal" ("appeal_id", "report_id", "appellant_id", "reason", "evidence_urls", "status", "handled_by", "resolution_note", "created_at", "handled_at") VALUES
(1, 1, 2, 'วันนั้นติดสอบกะทันหันครับ พยายามติดต่อผู้ซื้อแล้วแต่สัญญาณโทรศัพท์ในห้องสอบไม่มี', '["https://picsum.photos/id/30/800/600"]'::jsonb, 'Pending', NULL, NULL, NOW() - INTERVAL '5 days', NULL),
(2, 3, 11, 'ไม่ได้มีเจตนาจะก่อกวนครับ ไอดีอาจจะโดนเพื่อนแกล้งเอาไปพิมพ์', NULL, 'Rejected', 1, 'พิจารณาจากหลักฐานแล้วพบว่าเป็นการพิมพ์จากผู้ใช้งานจริง คำอุทธรณ์ฟังไม่ขึ้น', NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours');

SELECT setval(pg_get_serial_sequence('"Appeal"', 'appeal_id'), 2);
