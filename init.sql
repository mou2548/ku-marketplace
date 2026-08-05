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
    "cancellation_reason" TEXT,
    "cancellation_requested_at" TIMESTAMP,
    "cancellation_response" VARCHAR(20) CHECK("cancellation_response" IN ('Pending', 'Approved', 'Rejected')),
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
-- RICH MOCK DATA FOR KU MARKETPLACE (UPDATED SCHEMA)
-- ==========================================

-- ------------------------------------------
-- 1. USERS (นิสิต 14 คน + Admin 1 คน)
-- Password ของทุกคนคือ: password123
-- ------------------------------------------
INSERT INTO "User" (user_id, email, first_name_en, last_name_en, first_name_th, last_name_th, password_hash, phone_number, status, email_verified_at, isAdmin) VALUES
(1, 'admin.ku@ku.th', 'Admin', 'Marketplace', 'แอดมิน', 'มก', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0800000000', 'Active', NOW(), TRUE),
(2, 'somchai.s@ku.th', 'Somchai', 'Saetang', 'สมชาย', 'แซ่ตั้ง', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0812345678', 'Active', NOW(), FALSE),
(3, 'somsri.k@ku.th', 'Somsri', 'Kaewmanee', 'สมศรี', 'แก้วมณี', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0823456789', 'Active', NOW(), FALSE),
(4, 'anan.p@ku.th', 'Anan', 'Prakarn', 'อนันต์', 'ปราการ', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0834567890', 'Active', NOW(), FALSE),
(5, 'pimchanok.s@ku.th', 'Pimchanok', 'Suwan', 'พิมพ์ชนก', 'สุวรรณ', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0845678901', 'Active', NOW(), FALSE),
(6, 'thanawat.p@ku.th', 'Thanawat', 'Phak', 'ธนวัฒน์', 'ภักดี', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0856789012', 'Active', NOW(), FALSE),
(7, 'chutima.m@ku.th', 'Chutima', 'Manee', 'ชุติมา', 'มณี', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0867890123', 'Active', NOW(), FALSE),
(8, 'nat.t@ku.th', 'Natthapong', 'Thong', 'ณัฐพงษ์', 'ธงชัย', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0878901234', 'Active', NOW(), FALSE),
(9, 'kamon.v@ku.th', 'Kamonchanok', 'Vong', 'กมลชนก', 'วงษา', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0889012345', 'Suspended', NOW(), FALSE),
(10, 'phurit.k@ku.th', 'Phurit', 'Kij', 'ภูริต', 'กิจเจริญ', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0890123456', 'Banned', NOW(), FALSE),
(11, 'nicha.w@ku.th', 'Nicha', 'Wong', 'ณิชา', 'วงศ์', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0611112222', 'Active', NOW(), FALSE),
(12, 'teera.j@ku.th', 'Teera', 'Jai', 'ธีระ', 'ใจดี', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0622223333', 'Active', NOW(), FALSE),
(13, 'siriporn.r@ku.th', 'Siriporn', 'Rak', 'ศิริพร', 'รักษ์', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0633334444', 'Active', NOW(), FALSE),
(14, 'pawat.s@ku.th', 'Pawat', 'Siri', 'ปวัตน์', 'ศิริ', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0644445555', 'Active', NOW(), FALSE),
(15, 'arisa.m@ku.th', 'Arisa', 'Mai', 'อริสา', 'ใหม่', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0655556666', 'Active', NOW(), FALSE);

SELECT setval(pg_get_serial_sequence('"User"', 'user_id'), 15);

-- ------------------------------------------
-- 16. SUBSCRIPTIONS & 17. PAYMENTS
-- ------------------------------------------
INSERT INTO "Subscription" (subscription_id, user_id, tier, posts_used_this_month, status, start_date, end_date) VALUES
(1, 1, 'Diamond', 0, 'Active', NOW(), NOW() + INTERVAL '1 year'),
(2, 2, 'Gold', 4, 'Active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days'),
(3, 3, 'Silver', 2, 'Active', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days'),
(4, 4, 'Free', 1, 'Active', NOW(), NULL),
(5, 5, 'Diamond', 10, 'Active', NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days'),
(6, 6, 'Free', 0, 'Active', NOW(), NULL),
(7, 7, 'Free', 0, 'Active', NOW(), NULL),
(8, 8, 'Silver', 1, 'Active', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days'),
(9, 9, 'Free', 0, 'Active', NOW(), NULL),
(10, 10, 'Free', 0, 'Active', NOW(), NULL),
(11, 11, 'Gold', 2, 'Active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days'),
(12, 12, 'Free', 0, 'Active', NOW(), NULL),
(13, 13, 'Free', 0, 'Active', NOW(), NULL),
(14, 14, 'Free', 0, 'Active', NOW(), NULL),
(15, 15, 'Free', 0, 'Active', NOW(), NULL);

SELECT setval(pg_get_serial_sequence('"Subscription"', 'subscription_id'), 15);

INSERT INTO "Subscription_Payment" (payment_id, subscription_id, user_id, amount, slip_image_url, status, handled_by) VALUES
(1, 2, 2, 199, 'https://picsum.photos/id/10/600/800', 'Verified', 1),
(2, 3, 3, 99, 'https://picsum.photos/id/11/600/800', 'Verified', 1),
(3, 5, 5, 499, 'https://picsum.photos/id/12/600/800', 'Verified', 1),
(4, 8, 8, 99, 'https://picsum.photos/id/13/600/800', 'Verified', 1),
(5, 11, 11, 199, 'https://picsum.photos/id/14/600/800', 'Verified', 1);

SELECT setval(pg_get_serial_sequence('"Subscription_Payment"', 'payment_id'), 5);

-- ------------------------------------------
-- 2. ITEMS (สินค้า 20 ชิ้น)
-- ------------------------------------------
INSERT INTO "Item" (item_id, owner_id, name, category, condition, description, status, course_name, brand_model, warranty_expiry, size) VALUES
(1, 2, 'หนังสือ Calculus 1', 'Books', 'Good', 'มีรอยไฮไลท์เล็กน้อย สภาพดีมาก', 'Listed', '01417111', 'KU Press', NULL, NULL),
(2, 2, 'เสื้อนิสิตชาย แขนยาว', 'Clothing', 'Good', 'ใส่สอบ 2 ครั้ง', 'Listed', NULL, 'มุมทอง', NULL, 'L'),
(3, 3, 'iPad Air 5 64GB', 'Electronics', 'Good', 'มีรอยเคสกัดนิดหน่อย อุปกรณ์ครบ', 'Listed', NULL, 'Apple iPad Air 5', '2025-10-01', NULL),
(4, 4, 'หูฟัง Sony WH-1000XM4', 'Electronics', 'Acceptable', 'ฟองน้ำลอกนิดหน่อย ใช้งานปกติ', 'Listed', NULL, 'Sony', NULL, NULL),
(5, 5, 'จักรยาน LA', 'Vehicles', 'Poor', 'เบรคหลังหลวม ต้องไปซ่อมเอง', 'Listed', NULL, 'LA Bicycle', NULL, NULL),
(6, 6, 'ชุดกาวน์แลบเคมี', 'Clothing', 'New', 'ซื้อมาผิดไซส์ ยังไม่แกะถุง', 'Listed', '01403111', 'KU Co-op', NULL, 'M'),
(7, 7, 'โคมไฟอ่านหนังสือ Xiaomi', 'Home & Living', 'Good', 'ใช้งานปกติ เปลี่ยนแสงได้ 3 สี', 'Listed', NULL, 'Xiaomi', NULL, NULL),
(8, 8, 'เครื่องคิดเลข Casio FX-991EX', 'Electronics', 'Good', 'ปุ่มกดชัดเจน ใช้เข้าห้องสอบได้', 'Transferred', '01417112', 'Casio', NULL, NULL),
(9, 11, 'หนังสือ General Psychology', 'Books', 'Acceptable', 'เยินนิดหน่อยแต่หน้าครบ', 'Listed', '01387111', 'KU Press', NULL, NULL),
(10, 11, 'กระโปรงพลีท จีบเล็ก', 'Clothing', 'Good', 'ยาว 24 นิ้ว เอวยืดได้', 'Listed', NULL, 'มุมทอง', NULL, 'Free Size'),
(11, 12, 'คีย์บอร์ด Keychron K8', 'Electronics', 'Good', 'สวิตช์ Brown พิมพ์สนุก', 'Listed', NULL, 'Keychron', NULL, NULL),
(12, 13, 'ตุ๊กตาน้อง KuKu', 'Others', 'New', 'ของสะสม งานรับปริญญา', 'Listed', NULL, 'KU Souvenir', NULL, NULL),
(13, 14, 'แร็คเกตแบดมินตัน Yonex', 'Sports', 'Good', 'เอ็นเพิ่งขึ้นใหม่ 24 ปอนด์', 'Listed', '01175113', 'Yonex', NULL, NULL),
(14, 15, 'กล่องสุ่ม Art Toy Crybaby', 'Toys', 'New', 'ยังไม่แกะกล่อง ลุ้นซีเคร็ท', 'Listed', NULL, 'Pop Mart', NULL, NULL),
(15, 2, 'รองเท้าผ้าใบขาว', 'Clothing', 'Acceptable', 'เลอะนิดหน่อย ซักออกได้', 'Listed', NULL, 'Baoji', NULL, '42'),
(16, 3, 'สายชาร์จ iPhone แท้', 'Electronics', 'Good', 'ซื้อมาสำรอง ไม่ค่อยได้ใช้', 'Unlisted', NULL, 'Apple', NULL, NULL),
(17, 4, 'ชีทสรุป Bio 1', 'Books', 'Good', 'จดสีสวย อ่านง่าย', 'Listed', '01424111', NULL, NULL, NULL),
(18, 5, 'กางเกงวอร์ม มก.', 'Clothing', 'Poor', 'มีรูที่เข่า เอาไปใส่เล่นๆได้', 'Unlisted', NULL, 'KU Co-op', NULL, 'XL'),
(19, 6, 'หม้อหุงข้าวเด็กหอ', 'Home & Living', 'Good', 'ขนาด 1 ลิตร ร้อนไว', 'Listed', NULL, 'Sharp', NULL, NULL),
(20, 7, 'ไม้บรรทัดสเกล', 'Stationery', 'Good', 'ของคณะสถาปัตย์', 'Listed', '02201111', 'Rotring', NULL, NULL);

SELECT setval(pg_get_serial_sequence('"Item"', 'item_id'), 20);

-- ------------------------------------------
-- 3. ITEM IMAGES
-- ------------------------------------------
INSERT INTO "Item_Image" (item_id, image_url, is_primary) VALUES
(1, 'https://picsum.photos/id/1010/800/600', TRUE),
(2, 'https://picsum.photos/id/1011/800/600', TRUE),
(3, 'https://picsum.photos/id/1012/800/600', TRUE), (3, 'https://picsum.photos/id/1013/800/600', FALSE),
(4, 'https://picsum.photos/id/1014/800/600', TRUE),
(5, 'https://picsum.photos/id/146/800/600', TRUE),
(6, 'https://picsum.photos/id/1015/800/600', TRUE),
(7, 'https://picsum.photos/id/1016/800/600', TRUE),
(8, 'https://picsum.photos/id/1018/800/600', TRUE),
(9, 'https://picsum.photos/id/1019/800/600', TRUE),
(10, 'https://picsum.photos/id/1020/800/600', TRUE),
(11, 'https://picsum.photos/id/1021/800/600', TRUE),
(12, 'https://picsum.photos/id/1022/800/600', TRUE),
(13, 'https://picsum.photos/id/1023/800/600', TRUE),
(14, 'https://picsum.photos/id/1024/800/600', TRUE),
(15, 'https://picsum.photos/id/1025/800/600', TRUE),
(17, 'https://picsum.photos/id/1026/800/600', TRUE),
(19, 'https://picsum.photos/id/1027/800/600', TRUE),
(20, 'https://picsum.photos/id/1028/800/600', TRUE);

-- ------------------------------------------
-- 4. POSTS (โพสต์ขาย 17 โพสต์)
-- ------------------------------------------
INSERT INTO "Post" (post_id, item_id, post_type, price, quantity_total, quantity_remaining) VALUES
(1, 1, 'SellOnly', 250.00, 1, 1),
(2, 2, 'SellOnly', 150.00, 1, 1),
(3, 3, 'Both', 12000.00, 1, 1),   -- ขายและรับเทรด
(4, 4, 'TradeOnly', 0.00, 1, 1),  -- รับเทรดเท่านั้น
(5, 5, 'SellOnly', 500.00, 1, 1),
(6, 6, 'SellOnly', 180.00, 1, 1),
(7, 7, 'SellOnly', 200.00, 1, 1),
(8, 8, 'SellOnly', 450.00, 1, 0), -- โอนของแล้ว (Transferred)
(9, 9, 'SellOnly', 120.00, 1, 1),
(10, 10, 'Both', 100.00, 1, 1),
(11, 11, 'SellOnly', 1500.00, 1, 1),
(12, 12, 'SellOnly', 300.00, 1, 1),
(13, 13, 'SellOnly', 800.00, 1, 1),
(14, 14, 'Both', 400.00, 1, 1),
(15, 15, 'SellOnly', 150.00, 1, 1),
(16, 17, 'SellOnly', 50.00, 1, 1),
(17, 19, 'SellOnly', 290.00, 1, 1);

SELECT setval(pg_get_serial_sequence('"Post"', 'post_id'), 17);

-- ------------------------------------------
-- 5. OFFERS & 6. OFFER_ITEMS (ข้อเสนอเทรด)
-- ------------------------------------------
-- Offer 1: อนันต์ (4) เอาหูฟัง (Item 4) + เงิน 5000 ไปเทรดกับ iPad (Post 3 ของสมศรี)
INSERT INTO "Offer" (offer_id, post_id, proposer_id, additional_money, status) VALUES 
(1, 3, 4, 5000.00, 'Pending'),
-- Offer 2: สมศรี (3) เอาสายชาร์จ (Item 16) ไปเทรดกับ กล่องสุ่ม (Post 14)
(2, 14, 3, 100.00, 'Rejected'),
-- Offer 3: ธีระ (12) เอาคีย์บอร์ด (Item 11) ไปเทรดกับ iPad (Post 3)
(3, 3, 12, 8000.00, 'Pending');

SELECT setval(pg_get_serial_sequence('"Offer"', 'offer_id'), 3);

INSERT INTO "Offer_Item" (offer_id, item_id) VALUES
(1, 4), (2, 16), (3, 11);

-- ------------------------------------------
-- 8. TRANSACTIONS (การซื้อขาย)
-- ------------------------------------------
INSERT INTO "Transaction" (transaction_id, post_id, offer_id, buyer_id, seller_id, quantity, status, delivery_method, slip_image_url) VALUES
(1, 1, NULL, 3, 2, 1, 'Processing', 'Meetup', 'https://picsum.photos/id/200/600/800'),
(2, 8, NULL, 4, 8, 1, 'Completed', 'Shipping', 'https://picsum.photos/id/201/600/800'),
(3, 5, NULL, 11, 5, 1, 'Pending', 'Meetup', NULL),
(4, 9, NULL, 12, 11, 1, 'Pending Refund', 'Shipping', 'https://picsum.photos/id/202/600/800'),
(5, 11, NULL, 14, 12, 1, 'Processing', 'Shipping', 'https://picsum.photos/id/203/600/800');

-- อัปเดตข้อมูลเพิ่มเติมให้ Transaction บางอัน
UPDATE "Transaction" SET tracking_number = 'TH123456789' WHERE transaction_id = 2;
UPDATE "Transaction" SET cancellation_reason = 'ผู้ขายส่งผิดเล่ม', cancellation_requested_by = 12 WHERE transaction_id = 4;

SELECT setval(pg_get_serial_sequence('"Transaction"', 'transaction_id'), 5);

-- ------------------------------------------
-- 9. APPOINTMENT CARDS (ใบนัดรับของ)
-- ------------------------------------------
INSERT INTO "Appointment_Card" (appointment_id, transaction_id, proposed_by, date, time, location, status) VALUES
(1, 1, 2, '2026-08-15', '13:00:00', 'หอสมุดกลาง มก.', 'Confirmed'),
(2, 3, 5, '2026-08-20', '16:00:00', 'บาร์ใหม่ โรงอาหารกลาง 1', 'Pending');

SELECT setval(pg_get_serial_sequence('"Appointment_Card"', 'appointment_id'), 2);

-- ------------------------------------------
-- 7. REPORTS & 15. APPEALS (การร้องเรียน)
-- ------------------------------------------
INSERT INTO "Report" (report_id, reporter_id, report_type, target_id, reason_category, details, evidence_urls, status, handled_by) VALUES
(1, 11, 'Transaction', 5, 'Damaged Item', 'จักรยานเบรคพัง ขี่ไม่ได้เลยครับ ไม่ตรงปก', '["https://picsum.photos/id/300/800/600"]'::jsonb, 'Under_Investigation', 1),
(2, 2, 'User', 10, 'Scam/Fraud', 'นายภูริต หลอกให้โอนเงินแล้วบล็อกแชตหนี', '["https://picsum.photos/id/301/800/600"]'::jsonb, 'Violation_Confirmed', 1),
(3, 14, 'Transaction', 5, 'Late Shipping', 'เลยกำหนดมา 7 วันแล้วผู้ขายยังไม่ส่งของ', NULL, 'Pending', NULL);

-- ผูก Report เข้ากับ Transaction 
UPDATE "Transaction" SET active_report_id = 1 WHERE transaction_id = 3;
UPDATE "Transaction" SET active_report_id = 3 WHERE transaction_id = 5;

SELECT setval(pg_get_serial_sequence('"Report"', 'report_id'), 3);

INSERT INTO "Appeal" (appeal_id, report_id, appellant_id, reason, evidence_urls, status) VALUES
(1, 1, 5, 'ผมแจ้งใน description แล้วว่าเบรคหลังหลวมต้องไปซ่อมเองครับ', '["https://picsum.photos/id/305/800/600"]'::jsonb, 'Pending');

SELECT setval(pg_get_serial_sequence('"Appeal"', 'appeal_id'), 1);

-- ------------------------------------------
-- 10. GIVEAWAY POSTS & 12. IMAGES
-- ------------------------------------------
INSERT INTO "Giveaway_Post" (giveaway_id, item_name, description, pickup_location, giver_id, allocation_method, pickup_deadline, status) VALUES
(1, 'ชีทสรุป ฟิสิกส์ 1', 'แจกฟรี ปริ้นท์เกินมา', 'ตึกศร.3', 2, 'FirstCome', '2026-08-10 17:00:00', 'Closed'),
(2, 'เสื้อช็อปวิศวะ ไซส์ M', 'เรียนจบแล้วส่งต่อครับ', 'ลานเกียร์', 8, 'Random', '2026-08-25 18:00:00', 'Active'),
(3, 'กล่องข้าว Super Lock', 'ไม่ได้ใช้แล้ว สภาพยังดี', 'หอพักหญิง', 11, 'FirstCome', '2026-08-15 12:00:00', 'Active');

SELECT setval(pg_get_serial_sequence('"Giveaway_Post"', 'giveaway_id'), 3);

INSERT INTO "Giveaway_Image" (giveaway_id, image_url, display_order) VALUES
(1, 'https://picsum.photos/id/401/800/600', 1),
(2, 'https://picsum.photos/id/402/800/600', 1),
(3, 'https://picsum.photos/id/403/800/600', 1);

-- ------------------------------------------
-- 11. GIVEAWAY TICKETS (คิวรับของฟรี)
-- ------------------------------------------
INSERT INTO "Giveaway_Ticket" (ticket_id, giveaway_id, receiver_id, qr_token, status) VALUES
(1, 1, 4, 'GW-1-TOKEN-AAA', 'Received'),
(2, 2, 5, 'GW-2-TOKEN-BBB', 'Waiting'),
(3, 2, 6, 'GW-2-TOKEN-CCC', 'Waiting'),
(4, 3, 14, 'GW-3-TOKEN-DDD', 'Waiting');

SELECT setval(pg_get_serial_sequence('"Giveaway_Ticket"', 'ticket_id'), 4);

-- ------------------------------------------
-- 13. CHAT ROOMS & 14. CHAT MESSAGES
-- ------------------------------------------
INSERT INTO "Chat_Room" (room_id, transaction_id, giveaway_id) VALUES
(1, 1, NULL), -- ห้องแชตซื้อขายหนังสือ
(2, 3, NULL), -- ห้องแชตซื้อขายจักรยาน
(3, NULL, 2); -- ห้องแชตกลุ่มแจกเสื้อช็อป

SELECT setval(pg_get_serial_sequence('"Chat_Room"', 'room_id'), 3);

INSERT INTO "Chat_Message" (message_id, room_id, sender_id, content) VALUES
(1, 1, 3, 'พี่คะ โอนเงินเรียบร้อยแล้วนะคะ'),
(2, 1, 2, 'ได้รับแล้วครับ สะดวกนัดรับวันไหนครับ?'),
(3, 1, 3, 'วันพฤหัสบดีที่ 15 ได้ไหมคะ ที่หอสมุด'),
(4, 2, 11, 'พี่ครับ จักรยานนี่ขี่ได้ปกติเลยใช่ไหมครับ'),
(5, 2, 5, 'ขี่ได้ปกติครับ แต่เบรคหลังมันหลวมๆ หน่อยนะ'),
(6, 2, 11, 'โอเคครับ เดี๋ยวผมไปซ่อมเอง'),
(7, 3, 8, 'ใครได้สิทธิ์รับเสื้อช็อป เจอกันที่ลานเกียร์นะน้องๆ');

SELECT setval(pg_get_serial_sequence('"Chat_Message"', 'message_id'), 7);

-- ==========================================
-- END OF MOCK DATA
-- ==========================================
