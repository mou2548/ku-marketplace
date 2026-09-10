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
    "quantity" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity" > 0),
    "deleted_at" TIMESTAMP,
    "condition" VARCHAR(50) NOT NULL CHECK("condition" IN ('New', 'Good', 'Acceptable', 'Poor')),
    "description" TEXT,
    "item_status" VARCHAR(20) DEFAULT 'Unlisted' CHECK("item_status" IN ('Unlisted', 'Listed', 'Transferred')),
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
    "deleted_at" TIMESTAMP,
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
    "sanction" VARCHAR(30),
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
    -- §appointment loop fix — set once a newer proposal supersedes this card or
    -- the other party rejects it. The live card is the newest row with
    -- deleted_at NULL; handover needs that row Confirmed. Keeps "Another time"
    -- from re-exposing an older Confirmed card.
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Giveaway_Post Table
CREATE TABLE "Giveaway_Post" (
    "giveaway_id" SERIAL PRIMARY KEY,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1 CHECK("quantity" > 0),
    "description" TEXT,
    "pickup_location" VARCHAR(255) NOT NULL,
    "giver_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "allocation_method" VARCHAR(20) NOT NULL CHECK("allocation_method" IN ('FirstCome', 'Random', 'Manual')),
    "pickup_deadline" TIMESTAMP,
    "giveaway_status" VARCHAR(20) DEFAULT 'Active' CHECK("giveaway_status" IN ('Active', 'Closed', 'Completed')),
    "register_deadline" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Giveaway_Ticket Table
CREATE TABLE "Giveaway_Ticket" (
    "ticket_id" SERIAL PRIMARY KEY,
    "giveaway_id" INTEGER NOT NULL REFERENCES "Giveaway_Post"("giveaway_id"),
    "receiver_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
    "qr_token" VARCHAR(255) UNIQUE,
    -- §giveaway QR — when qr_token was minted. One code per 15 minutes.
    "qr_issued_at" TIMESTAMP,
    "ticket_status" VARCHAR(20) DEFAULT 'Registered' CHECK("ticket_status" IN ('Registered', 'Waiting', 'NotSelected', 'Received', 'Forfeited', 'Expired')),
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("giveaway_id", "receiver_id")
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

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "refund_submitted_at" TIMESTAMP;
CREATE TABLE IF NOT EXISTS "Notification" (
  "notification_id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "User"("user_id"),
  "event_key" VARCHAR(255) NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at");

-- ==========================================
-- KU MARKETPLACE - EXTENDED MOCK DATA SCRIPT (WITH WORKING IMAGE URLS)
-- ==========================================

-- 1. User (10 Users)
-- Every seeded account uses the password: KuDemo123!
-- (bcrypt hash below, cost 10). Log in with any email, e.g. user1@ku.th.
INSERT INTO "User" ("email", "first_name_en", "last_name_en", "first_name_th", "last_name_th", "password_hash", "phone_number", "user_status", "email_verified_at", "isAdmin") VALUES
('admin1@ku.th', 'Admin', 'One', 'แอดมิน', 'หนึ่ง', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0811111111', 'Active', NOW(), TRUE),
('admin2@ku.th', 'Admin', 'Two', 'แอดมิน', 'สอง', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0811111112', 'Active', NOW(), TRUE),
('user1@ku.th', 'Somchai', 'Jaidee', 'สมชาย', 'ใจดี', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0822222221', 'Active', NOW(), FALSE),
('user2@ku.th', 'Somsri', 'Maneerat', 'สมศรี', 'มณีรัตน์', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0822222222', 'Active', NOW(), FALSE),
('user3@ku.th', 'Anan', 'Suksan', 'อานนท์', 'สุขสันต์', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0822222223', 'Active', NOW(), FALSE),
('user4@ku.th', 'Kanya', 'Thongdee', 'กัญญา', 'ทองดี', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0822222224', 'Active', NOW(), FALSE),
('user5@ku.th', 'Nattapong', 'Ruang', 'ณัฐพงษ์', 'เรือง', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0822222225', 'Active', NOW(), FALSE),
('user6@ku.th', 'Ploy', 'Suay', 'พลอย', 'สวย', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0822222226', 'Active', NOW(), FALSE),
('user7@ku.th', 'Wichai', 'Keng', 'วิชัย', 'เก่ง', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0822222227', 'Active', NOW(), FALSE),
('user8@ku.th', 'Bad', 'Guy', 'แย่', 'จัง', '$2b$10$nkEpbywQE3uVixi8fzp/me.So1j5nTf7GUvnsPvyXvMfm/B8CQYyi', '0899999999', 'Suspended', NOW(), FALSE);

-- 2. Item (17 Items)
INSERT INTO "Item" ("owner_id", "name", "category", "condition", "description", "item_status", "course_name", "brand_model", "warranty_expiry", "size") VALUES
(3, 'หนังสือ Physics I', 'Books', 'Good', 'มีรอยไฮไลท์เล็กน้อย 85%', 'Listed', '01420111', 'KU Press', NULL, NULL),
(3, 'เสื้อนิสิตทรงบอย', 'Clothing', 'New', 'ยังไม่เคยใส่', 'Transferred', NULL, 'ร้านมุมทอง', NULL, 'XL'),
(4, 'iPad Air 5 64GB', 'Electronics', 'Good', 'ติดฟิล์มกระดาษ', 'Listed', NULL, 'Apple', '2026-12-31', '64GB'),
(5, 'เครื่องคิดเลข FX-991EX', 'Electronics', 'Good', 'ใช้สอบเสร็จส่งต่อ', 'Transferred', NULL, 'Casio', NULL, NULL),
(6, 'หูฟัง Sony WH-1000XM4', 'Electronics', 'Good', 'อุปกรณ์ครบ', 'Listed', NULL, 'Sony', '2026-10-15', NULL),
(5, 'รองเท้าคอนเวิร์ส สีขาว', 'Clothing', 'Acceptable', 'สภาพใช้งาน', 'Unlisted', NULL, 'Converse', NULL, '42'),
(6, 'หนังสือ Calculus II', 'Books', 'Good', 'ไม่มีรอยเขียน', 'Unlisted', '01417112', 'KU Press', NULL, NULL),
(7, 'พัดลม Hatari 16 นิ้ว', 'Appliances', 'Acceptable', 'ลมแรงปกติ', 'Transferred', NULL, 'Hatari', NULL, NULL),
(4, 'แว่นตา Rayban', 'Accessories', 'New', 'ของแท้', 'Unlisted', NULL, 'Rayban', NULL, NULL),
(3, 'กระเป๋า Anello', 'Bags', 'Good', 'ใช้งานได้ปกติ', 'Transferred', NULL, 'Anello', NULL, 'Medium'),
(7, 'คีย์บอร์ด Keychron K2', 'Electronics', 'Good', 'สวิตช์สีน้ำตาล', 'Listed', NULL, 'Keychron', NULL, NULL),
(8, 'ชีทสรุป Gen Chem', 'Books', 'Acceptable', 'จดครบทุกบท', 'Listed', '01403111', NULL, NULL, NULL),
(8, 'ตุ๊กตาหมี IKEA', 'Toys', 'New', 'ป้ายห้อย', 'Listed', NULL, 'IKEA', NULL, NULL),
(9, 'เมาส์ไร้สาย Logitech', 'Electronics', 'Poor', 'คลิกซ้ายเบิ้ลนิดหน่อย', 'Listed', NULL, 'Logitech', NULL, NULL),
(9, 'กางเกงวอร์ม KU', 'Clothing', 'Good', 'ใส่ไป 2 ครั้ง', 'Listed', NULL, 'KU Shop', NULL, 'L'),
(5, 'Trade demo headphones', 'Electronics', 'Good', 'Available for the pending iPad offer', 'Unlisted', NULL, NULL, NULL, NULL),
(3, 'Trade demo notebook', 'Stationery', 'New', 'Available after a withdrawn offer', 'Unlisted', NULL, NULL, NULL, NULL);

-- One iPad is reserved by transaction 4; a second remains available for offers.
UPDATE "Item" SET "quantity" = 2 WHERE "item_id" = 3;

-- 3. Item_Image (15 Images - curated Unsplash photos matching each item)
INSERT INTO "Item_Image" ("item_id", "item_image_status", "image_url", "is_primary", "display_order") VALUES
(1, 'Active', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(2, 'Active', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(3, 'Active', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(3, 'Active', 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&h=600&fit=crop&crop=entropy&q=80', FALSE, 2),
(4, 'Active', 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(5, 'Active', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(6, 'Active', 'https://images.unsplash.com/photo-1597350593642-08a98ed51a42?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(7, 'Active', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(8, 'Active', 'https://images.unsplash.com/photo-1601084195907-44baaa49dabd?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(11, 'Active', 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(12, 'Active', 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(13, 'Active', 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(14, 'Active', 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(15, 'Active', 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600&h=600&fit=crop&crop=entropy&q=80', TRUE, 1),
(15, 'Active', 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=600&fit=crop&crop=entropy&q=80', FALSE, 2);

-- 4. Post (10 Posts)
INSERT INTO "Post" ("item_id", "post_type", "post_status", "price", "quantity_total", "quantity_remaining") VALUES
(1, 'SellOnly', 'Active', 150.00, 1, 0),
(2, 'SellOnly', 'Inactive', 100.00, 1, 0),
(3, 'Both', 'Active', 13500.00, 2, 1),
(4, 'TradeOnly', 'Inactive', 0.00, 1, 0),
(5, 'Both', 'Active', 7000.00, 1, 1),
(11, 'SellOnly', 'Active', 1500.00, 1, 0),
(12, 'Both', 'Active', 50.00, 1, 1),
(13, 'TradeOnly', 'Active', 0.00, 1, 0),
(14, 'SellOnly', 'Active', 80.00, 1, 1),
(15, 'SellOnly', 'Active', 200.00, 1, 0);

-- 5. Offer (8 Offers; offers 1 and 8 compete for the available iPad)
INSERT INTO "Offer" ("post_id", "proposer_id", "additional_money", "offer_status") VALUES
(3, 5, 12000.00, 'Pending'),
(4, 3, 0.00, 'Accepted'),
(3, 6, 13000.00, 'Rejected'),
(5, 4, 6000.00, 'Pending'),
(8, 5, 50.00, 'Accepted'),
(7, 3, 0.00, 'Withdrawn'),
(4, 7, 100.00, 'Cancelled'),
(3, 6, 12500.00, 'Pending');

-- 6. Offer_Item (7 Rows)
INSERT INTO "Offer_Item" ("offer_id", "item_id") VALUES
(1, 16),
(2, 10),
(3, 7),
(4, 9),
(5, 6),
(6, 17),
(8, 7);

-- 7. Report (5 Reports)
INSERT INTO "Report" ("reporter_id", "report_type", "target_id", "reason_category", "details", "report_status", "handled_by", "resolution_note", "handled_at") VALUES
(5, 'Post', 2, 'Inappropriate Content', 'รูปภาพไม่เหมาะสม', 'Violation_Confirmed', 1, 'แบนโพสต์เรียบร้อย', '2026-09-01 10:00:00'),
(4, 'User', 10, 'Scam', 'โอนแล้วไม่ส่งของ', 'Under_Investigation', 2, 'รอตรวจสอบสลิปเพิ่มเติม', NULL),
(3, 'Transaction', 1, 'Payment Issue', 'สลิปปลอม', 'Pending', NULL, NULL, NULL),
(6, 'Post', 1, 'Duplicate Post', 'โพสต์ซ้ำ', 'Report_Dismissed', 1, 'ไม่ซ้ำ เป็นคนละสภาพ', '2026-09-02 08:00:00'),
(7, 'User', 4, 'Harassment', 'ด่าทอในแชท', 'Pending', NULL, NULL, NULL);

-- 8. Transaction (8 Transactions - Using placehold.co for Slips)
INSERT INTO "Transaction" ("post_id", "offer_id", "buyer_id", "seller_id", "quantity", "transaction_status", "active_report_id", "delivery_method", "slip_image_url", "tracking_number", "payment_confirmed_by_buyer_at", "payment_confirmed_by_seller_at") VALUES
(1, NULL, 4, 3, 1, 'Processing', NULL, 'Meetup', 'https://placehold.co/400x600/000000/FFF?text=Slip+TX1', NULL, '2026-09-01 14:00:00', '2026-09-01 14:05:00'),
(2, NULL, 5, 3, 1, 'Completed', NULL, 'Shipping', 'https://placehold.co/400x600/000000/FFF?text=Slip+TX2', 'TH123456789', '2026-08-25 09:00:00', '2026-08-25 09:10:00'),
(4, 2, 3, 5, 1, 'Completed', NULL, 'Meetup', NULL, NULL, NULL, NULL),
(3, NULL, 6, 4, 1, 'Pending', NULL, 'Meetup', NULL, NULL, NULL, NULL),
(8, 5, 5, 8, 1, 'Processing', NULL, 'Meetup', 'https://placehold.co/400x600/000000/FFF?text=Slip+TX5', NULL, '2026-09-01 15:00:00', '2026-09-01 15:30:00'),
(6, NULL, 8, 7, 1, 'Pending Refund', 3, 'Shipping', 'https://placehold.co/400x600/000000/FFF?text=Slip+TX6', NULL, '2026-09-02 07:00:00', NULL),
(9, NULL, 3, 9, 1, 'Cancelled', NULL, 'Shipping', NULL, NULL, NULL, NULL),
(10, NULL, 4, 9, 1, 'Processing', NULL, 'Meetup', 'https://placehold.co/400x600/000000/FFF?text=Slip+TX8', NULL, '2026-09-02 09:00:00', '2026-09-02 09:10:00');

-- 9. Appointment_Card (6 Cards)
-- created_at is explicit so FE and BE agree on which card is newest even when
-- two are created close together (tie-break is appointment_id).
-- Transaction 1: a Confirmed meetup, then one side proposed a change (row 2)
-- which the other side declined. Both rows are retired (deleted_at set), so the
-- deal is back at "propose a new time" — it must NOT re-show the old Confirmed
-- card. This is the regression fixture for the "Another time" loop.
INSERT INTO "Appointment_Card" ("transaction_id", "proposed_by", "date", "time", "location", "appointment_status", "created_at", "deleted_at") VALUES
(1, 3, '2026-09-05', '12:30:00', 'บาร์ใหม่', 'Confirmed', '2026-09-01 09:00:00', '2026-09-02 08:00:00'),
(1, 4, '2026-09-04', '11:00:00', 'หน้า มก.', 'Rejected',  '2026-09-02 08:00:00', '2026-09-02 09:00:00'),
(3, 5, '2026-09-06', '16:00:00', 'สำนักหอสมุด', 'Confirmed', '2026-09-01 10:00:00', NULL),
(4, 6, '2026-09-07', '10:00:00', 'ตึก SC1', 'Pending', '2026-09-01 11:00:00', NULL),
(5, 5, '2026-09-05', '13:00:00', 'โรงอาหารกลาง 2', 'Confirmed', '2026-09-01 12:00:00', NULL),
(8, 9, '2026-09-08', '17:00:00', 'Kasetsart BTS', 'Pending', '2026-09-01 13:00:00', NULL);

-- 10. Giveaway_Post (6 Giveaways)
INSERT INTO "Giveaway_Post" ("item_name", "quantity", "description", "pickup_location", "giver_id", "allocation_method", "pickup_deadline", "register_deadline", "giveaway_status") VALUES
('สรุปสูตรฟิสิกส์', 5, 'แจก 5 ชุด นัดรับพร้อมกัน', 'ตึก LH1', 3, 'FirstCome', '2026-09-10 17:00:00', '2026-09-08 17:00:00', 'Active'),
('เสื้อพละ มก.', 1, 'สภาพดี แจกฟรี', 'บาร์ใหม่', 4, 'Random', '2026-09-15 18:00:00', '2026-09-10 12:00:00', 'Active'),
('หนังสือศัพท์ TOEIC', 2, 'แจก 2 เล่ม', 'หอพัก', 5, 'Manual', '2026-09-12 20:00:00', '2026-09-09 23:59:59', 'Active'),
('สายชาร์จ iPhone', 1, 'ยังใช้งานได้ดี', 'หน้าตึก SC1', 6, 'FirstCome', '2026-08-30 12:00:00', '2026-08-28 12:00:00', 'Closed'),
('แก้วน้ำ YETI (ปลอม)', 1, 'เก็บความเย็นได้อยู่', 'บาร์ใหม่', 7, 'Random', '2026-08-25 15:00:00', '2026-08-20 15:00:00', 'Completed'),
('ไม้บรรทัดเหล็ก', 3, 'ปิดการแจกแล้ว', 'หอสมุด', 3, 'FirstCome', '2026-08-20 12:00:00', '2026-08-18 12:00:00', 'Closed');

-- 11. Giveaway_Ticket (9 Tickets)
INSERT INTO "Giveaway_Ticket" ("giveaway_id", "receiver_id", "qr_token", "ticket_status") VALUES
(1, 4, 'TOK_1_PHY_A', 'Waiting'),
(1, 5, 'TOK_1_PHY_B', 'Waiting'),
(1, 6, 'TOK_1_PHY_C', 'Waiting'),
(2, 7, 'TOK_2_SHIRT', 'Registered'),
(3, 8, 'TOK_3_TOEIC_A', 'Registered'),
(4, 3, 'TOK_4_CABLE', 'Expired'),
(5, 4, 'TOK_5_GLASS', 'Received'),
(5, 5, 'TOK_5_GLASS_LOSE', 'Expired'),
(6, 4, 'TOK_6_RULER_FORFEITED', 'Forfeited');

-- 12. Giveaway_Image (6 Images - curated Unsplash photos matching each giveaway)
INSERT INTO "Giveaway_Image" ("giveaway_id", "image_status", "image_url", "display_order") VALUES
(1, 'Active', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=600&fit=crop&crop=entropy&q=80', 1),
(2, 'Active', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop&crop=entropy&q=80', 1),
(3, 'Active', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=600&fit=crop&crop=entropy&q=80', 1),
(4, 'Active', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&h=600&fit=crop&crop=entropy&q=80', 1),
(5, 'Active', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop&crop=entropy&q=80', 1),
(6, 'Active', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=600&fit=crop&crop=entropy&q=80', 1);

-- 13. Chat_Room (8 Rooms)
INSERT INTO "Chat_Room" ("transaction_id", "giveaway_id", "chat_room_status") VALUES
(1, NULL, 'Active'),
(2, NULL, 'Inactive'),
(3, NULL, 'Active'),
(4, NULL, 'Active'),
(5, NULL, 'Active'),
(NULL, 1, 'Active'),
(NULL, 2, 'Active'),
(NULL, 3, 'Active');

-- 14. Chat_Message (15 Messages)
INSERT INTO "Chat_Message" ("room_id", "sender_id", "content", "image_urls") VALUES
(1, 4, 'สวัสดีครับ สะดวกเจอบาร์ใหม่กี่โมงครับ?', NULL),
(1, 3, 'เที่ยงครึ่งวันพุธได้เลยครับ', NULL),
(1, 4, 'โอเคครับ ตามนั้นเลย', NULL),
(2, 5, 'โอนเงินแล้วนะครับ ขอเลขพัสดุด้วย', '["https://placehold.co/400x600/222222/FFF?text=Chat+Slip"]'),
(2, 3, 'จัดส่งเรียบร้อยครับ เลขพัสดุ TH123456789', NULL),
(3, 3, 'ผมเอาหนังสือไปให้ที่ตึกเลยมั้ยครับ?', NULL),
(3, 5, 'ได้ครับ รออยู่ใต้ตึก', NULL),
(6, 4, 'ลงทะเบียนรับสรุปเรียบร้อยครับ ขอบคุณมากครับ', NULL),
(6, 3, 'ยินดีครับ เจอกันตามนัดนะ', NULL),
(7, 7, 'ลุ้นๆ ขอให้สุ่มได้ทีเถอะ', NULL),
(8, 8, 'เลือกผมหน่อยค้าบบบ อยากได้มากก', '["https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400&h=400&fit=crop&crop=faces&q=80"]'),
(4, 6, 'iPad ลดได้อีกไหมครับ?', NULL),
(4, 4, 'เต็มที่แล้วครับผม ราคานี้เน็ตแล้ว', NULL),
(5, 5, 'ตุ๊กตาสภาพโอเคไหมครับ', NULL),
(5, 8, 'ใหม่มากครับ ป้ายยังอยู่เลย', NULL);

-- 15. Appeal (3 Appeals)
INSERT INTO "Appeal" ("report_id", "appellant_id", "reason", "appeal_status", "handled_by", "resolution_note", "handled_at") VALUES
(1, 3, 'ภาพถ่ายถูกต้องตามระเบียบครับ', 'Pending', NULL, NULL, NULL),
(2, 10, 'เพิ่งสอบเสร็จครับ กำลังจะไปส่งของ', 'Under_Review', 2, NULL, NULL),
(4, 6, 'สเปคสินค้ามันคล้ายกัน แต่คนละชิ้นครับ', 'Approved', 1, 'ปลดล็อคโพสต์ให้แล้ว', '2026-09-02 08:30:00');

-- 16. Subscription (8 Subscriptions)
INSERT INTO "Subscription" ("user_id", "tier", "posts_used_this_month", "subscription_status", "start_date", "end_date") VALUES
(3, 'Gold', 3, 'Active', '2026-09-01 00:00:00', '2026-09-30 23:59:59'),
(4, 'Free', 1, 'Active', '2026-09-01 00:00:00', '2026-09-30 23:59:59'),
(5, 'Silver', 2, 'Active', '2026-09-01 00:00:00', '2026-09-30 23:59:59'),
(6, 'Diamond', 5, 'Active', '2026-09-01 00:00:00', '2026-09-30 23:59:59'),
(7, 'Free', 0, 'Active', '2026-09-01 00:00:00', '2026-09-30 23:59:59'),
(8, 'Gold', 2, 'Expired', '2026-07-01 00:00:00', '2026-07-31 23:59:59'),
(9, 'Silver', 0, 'Cancelled', '2026-08-01 00:00:00', '2026-08-31 23:59:59'),
(10, 'Diamond', 0, 'Active', '2026-09-01 00:00:00', '2026-09-30 23:59:59');

-- 17. Subscription_Payment (8 Payments - Using placehold.co for Slips)
INSERT INTO "Subscription_Payment" ("subscription_id", "user_id", "amount", "slip_image_url", "payment_status", "rejection_reason", "handled_by", "handled_at") VALUES
(1, 3, 99, 'https://placehold.co/400x600/000000/FFF?text=Sub+Gold', 'Verified', NULL, 1, '2026-09-01 09:00:00'),
(3, 5, 49, 'https://placehold.co/400x600/000000/FFF?text=Sub+Silver', 'Verified', NULL, 1, '2026-09-01 09:10:00'),
(4, 6, 199, 'https://placehold.co/400x600/000000/FFF?text=Sub+Diamond', 'Verified', NULL, 2, '2026-09-01 09:15:00'),
(6, 8, 99, 'https://placehold.co/400x600/000000/FFF?text=Sub+Gold+Old', 'Verified', NULL, 1, '2026-07-01 10:00:00'),
(7, 9, 49, 'https://placehold.co/400x600/000000/FFF?text=Sub+Silver+Cancel', 'Verified', NULL, 2, '2026-08-01 11:00:00'),
(8, 10, 199, 'https://placehold.co/400x600/000000/FFF?text=Sub+Diamond+Pend', 'Pending', NULL, NULL, NULL),
(1, 3, 99, 'https://placehold.co/400x600/000000/FFF?text=Sub+Fake', 'Rejected', 'สลิปซ้ำซ้อน', 1, '2026-09-01 08:30:00'),
(5, 7, 49, 'https://placehold.co/400x600/000000/FFF?text=Sub+Silver+Pend', 'Pending', NULL, NULL, NULL);
