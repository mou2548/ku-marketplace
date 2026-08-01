-- ==========================================
-- PostgreSQL Database Initialization Script
-- ==========================================

-- 1. User Table
CREATE TABLE "User" (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name_en VARCHAR(100) NOT NULL,
    last_name_en VARCHAR(100) NOT NULL,
    first_name_th VARCHAR(100) NOT NULL,
    last_name_th VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Active',
    email_verified_at TIMESTAMP,
    isAdmin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Item Table
CREATE TABLE "Item" (
    item_id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES "User"(user_id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Unlisted',
    course_name VARCHAR(100),
    brand_model VARCHAR(100),
    warranty_expiry DATE,
    size VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Item_Image Table
CREATE TABLE "Item_Image" (
    image_id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES "Item"(item_id),
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Post Table
CREATE TABLE "Post" (
    post_id SERIAL PRIMARY KEY,
    item_id INTEGER UNIQUE NOT NULL REFERENCES "Item"(item_id),
    post_type VARCHAR(20) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity_total INTEGER NOT NULL DEFAULT 1,
    quantity_remaining INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Offer Table
CREATE TABLE "Offer" (
    offer_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES "Post"(post_id),
    proposer_id INTEGER NOT NULL REFERENCES "User"(user_id),
    additional_money DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Offer_Item Table (Junction Table)
CREATE TABLE "Offer_Item" (
    offer_id INTEGER NOT NULL REFERENCES "Offer"(offer_id),
    item_id INTEGER NOT NULL REFERENCES "Item"(item_id),
    PRIMARY KEY (offer_id, item_id)
);

-- 7. Report Table
CREATE TABLE "Report" (
    report_id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES "User"(user_id),
    report_type VARCHAR(20) NOT NULL,
    target_id INTEGER NOT NULL,
    reason_category VARCHAR(100) NOT NULL,
    details TEXT,
    evidence_urls JSONB,
    status VARCHAR(20) DEFAULT 'Pending',
    handled_by INTEGER REFERENCES "User"(user_id),
    resolution_note TEXT,
    handled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Transaction Table
CREATE TABLE "Transaction" (
    transaction_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES "Post"(post_id),
    offer_id INTEGER REFERENCES "Offer"(offer_id),
    buyer_id INTEGER NOT NULL REFERENCES "User"(user_id),
    seller_id INTEGER NOT NULL REFERENCES "User"(user_id),
    quantity INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'Pending',
    active_report_id INTEGER REFERENCES "Report"(report_id),
    delivery_method VARCHAR(20) NOT NULL,
    slip_image_url VARCHAR(500),
    tracking_number VARCHAR(100),
    estimated_delivery_date DATE,
    payment_confirmed_by_buyer_at TIMESTAMP,
    payment_confirmed_by_seller_at TIMESTAMP,
    item_received_confirmed_by_buyer_at TIMESTAMP,
    item_received_confirmed_by_seller_at TIMESTAMP,
    item_return_confirmed_at TIMESTAMP,
    cancellation_requested_by INTEGER REFERENCES "User"(user_id),
    refund_slip_url VARCHAR(500),
    refund_confirmed_by_buyer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Appointment_Card Table
CREATE TABLE "Appointment_Card" (
    appointment_id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES "Transaction"(transaction_id),
    proposed_by INTEGER NOT NULL REFERENCES "User"(user_id),
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Giveaway_Post Table
CREATE TABLE "Giveaway_Post" (
    giveaway_id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    pickup_location VARCHAR(255) NOT NULL,
    giver_id INTEGER NOT NULL REFERENCES "User"(user_id),
    allocation_method VARCHAR(20) NOT NULL,
    pickup_deadline TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Giveaway_Ticket Table
CREATE TABLE "Giveaway_Ticket" (
    ticket_id SERIAL PRIMARY KEY,
    giveaway_id INTEGER NOT NULL REFERENCES "Giveaway_Post"(giveaway_id),
    receiver_id INTEGER NOT NULL REFERENCES "User"(user_id),
    qr_token VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'Waiting',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Giveaway_Image Table
CREATE TABLE "Giveaway_Image" (
    image_id SERIAL PRIMARY KEY,
    giveaway_id INTEGER NOT NULL REFERENCES "Giveaway_Post"(giveaway_id),
    image_url VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Chat_Room Table
CREATE TABLE "Chat_Room" (
    room_id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES "Transaction"(transaction_id),
    giveaway_id INTEGER REFERENCES "Giveaway_Post"(giveaway_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Chat_Message Table
CREATE TABLE "Chat_Message" (
    message_id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES "Chat_Room"(room_id),
    sender_id INTEGER NOT NULL REFERENCES "User"(user_id),
    content TEXT,
    image_urls JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Appeal Table
CREATE TABLE "Appeal" (
    appeal_id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES "Report"(report_id),
    appellant_id INTEGER NOT NULL REFERENCES "User"(user_id),
    reason TEXT NOT NULL,
    evidence_urls JSONB,
    status VARCHAR(20) NOT NULL,
    handled_by INTEGER REFERENCES "User"(user_id),
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    handled_at TIMESTAMP
);

-- 16. Subscription Table
CREATE TABLE "Subscription" (
    subscription_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "User"(user_id),
    tier VARCHAR(20) NOT NULL,
    posts_used_this_month INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Active',
    start_date TIMESTAMP,
    end_date TIMESTAMP
);

-- 17. Subscription_Payment Table
CREATE TABLE "Subscription_Payment" (
    payment_id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES "Subscription"(subscription_id),
    user_id INTEGER NOT NULL REFERENCES "User"(user_id),
    amount INTEGER NOT NULL,
    slip_image_url VARCHAR(500) NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'Pending',
    rejection_reason TEXT,
    handled_by INTEGER REFERENCES "User"(user_id),
    handled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- RICH MOCK DATA FOR KU MARKETPLACE
-- ==========================================

-- ------------------------------------------
-- 1. USERS (นิสิต 9 คน + Admin 1 คน)
-- ------------------------------------------
INSERT INTO "User" (user_id, email, first_name_en, last_name_en, first_name_th, last_name_th, password_hash, phone_number, status, email_verified_at, isAdmin) VALUES
(1, 'admin.ku@ku.th', 'Admin', 'Marketplace', 'แอดมิน', 'มก', '$2b$10$abcdefghijklmnopqrstuuu', '0800000000', 'Active', NOW(), TRUE),
(2, 'somchai.sae@ku.th', 'Somchai', 'Saetang', 'สมชาย', 'แซ่ตั้ง', '$2b$10$abcdefghijklmnopqrstuuu', '0812345678', 'Active', NOW(), FALSE),
(3, 'somsri.kew@ku.th', 'Somsri', 'Kaewmanee', 'สมศรี', 'แก้วมณี', '$2b$10$abcdefghijklmnopqrstuuu', '0823456789', 'Active', NOW(), FALSE),
(4, 'anan.pra@ku.th', 'Anan', 'Prakarn', 'อนันต์', 'ปราการ', '$2b$10$abcdefghijklmnopqrstuuu', '0834567890', 'Active', NOW(), FALSE),
(5, 'pimchanok.s@ku.th', 'Pimchanok', 'Suwannarat', 'พิมพ์ชนก', 'สุวรรณรัตน์', '$2b$10$abcdefghijklmnopqrstuuu', '0845678901', 'Active', NOW(), FALSE),
(6, 'thanawat.p@ku.th', 'Thanawat', 'Phakdee', 'ธนวัฒน์', 'ภักดี', '$2b$10$abcdefghijklmnopqrstuuu', '0856789012', 'Active', NOW(), FALSE),
(7, 'chutima.m@ku.th', 'Chutima', 'Maneerat', 'ชุติมา', 'มณีรัตน์', '$2b$10$abcdefghijklmnopqrstuuu', '0867890123', 'Active', NOW(), FALSE),
(8, 'natthapong.t@ku.th', 'Natthapong', 'Thongchai', 'ณัฐพงษ์', 'ธงชัย', '$2b$10$abcdefghijklmnopqrstuuu', '0878901234', 'Active', NOW(), FALSE),
(9, 'kamonchanok.v@ku.th', 'Kamonchanok', 'Vongsa', 'กมลชนก', 'วงษา', '$2b$10$abcdefghijklmnopqrstuuu', '0889012345', 'Suspended', NOW(), FALSE),
(10, 'phurit.k@ku.th', 'Phurit', 'Kijcharoen', 'ภูริต', 'กิจเจริญ', '$2b$10$abcdefghijklmnopqrstuuu', '0890123456', 'Active', NOW(), FALSE);

SELECT setval(pg_get_serial_sequence('"User"', 'user_id'), 10);

-- ------------------------------------------
-- 2. SUBSCRIPTIONS & PAYMENTS
-- ------------------------------------------
INSERT INTO "Subscription" (subscription_id, user_id, tier, posts_used_this_month, status, start_date, end_date) VALUES
(1, 1, 'Diamond', 0, 'Active', NOW(), NOW() + INTERVAL '1 year'),
(2, 2, 'Gold', 4, 'Active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days'),
(3, 3, 'Silver', 2, 'Active', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days'),
(4, 4, 'Free', 1, 'Active', NOW(), NULL),
(5, 5, 'Gold', 1, 'Active', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days'),
(6, 6, 'Free', 0, 'Active', NOW(), NULL),
(7, 7, 'Free', 0, 'Active', NOW(), NULL),
(8, 8, 'Free', 0, 'Active', NOW(), NULL),
(9, 9, 'Free', 0, 'Active', NOW(), NULL),
(10, 10, 'Free', 0, 'Active', NOW(), NULL);

SELECT setval(pg_get_serial_sequence('"Subscription"', 'subscription_id'), 10);

INSERT INTO "Subscription_Payment" (payment_id, subscription_id, user_id, amount, slip_image_url, status, rejection_reason, handled_by, handled_at) VALUES
(1, 2, 2, 199, 'https://picsum.photos/id/101/600/800', 'Verified', NULL, 1, NOW() - INTERVAL '10 days'),
(2, 3, 3, 99, 'https://picsum.photos/id/102/600/800', 'Verified', NULL, 1, NOW() - INTERVAL '5 days'),
(3, 5, 5, 199, 'https://picsum.photos/id/103/600/800', 'Verified', NULL, 1, NOW() - INTERVAL '2 days'),
(4, 4, 4, 199, 'https://picsum.photos/id/104/600/800', 'Reject', 'สลิปซ้ำ ไม่พบยอดเงินเข้า', 1, NOW() - INTERVAL '1 day');

SELECT setval(pg_get_serial_sequence('"Subscription_Payment"', 'payment_id'), 4);

-- ------------------------------------------
-- 3. ITEMS & ITEM IMAGES (สินค้าในระบบ)
-- ------------------------------------------
INSERT INTO "Item" (item_id, owner_id, name, category, condition, description, status, course_name, brand_model, warranty_expiry, size) VALUES
(1, 2, 'หนังสือเรียน Calculus 1 (01417111)', 'Books', 'Good', 'มีรอยไฮไลท์จดตามคาบอาจารย์เล็กน้อย สภาพดีมาก', 'Listed', '01417111', 'สำนักพิมพ์ มก.', NULL, NULL),
(2, 2, 'เสื้อเชิ้ตนิสิตชาย แขนยาว Size 42', 'Clothing', 'Very Good', 'ใส่เฉพาะวันสอบ 2 ครั้ง สภาพเหมือนใหม่', 'Listed', NULL, 'มุมทอง', NULL, '42'),
(3, 3, 'iPad Air 5 64GB WiFi Space Gray', 'Electronics', 'Very Good', 'แถมเคสและติดฟิล์มกระจกแล้ว สภาพ 95% อุปกรณ์ครบกล่อง', 'Listed', NULL, 'Apple iPad Air 5', '2027-01-01', NULL),
(4, 4, 'หูฟังไร้สาย Sony WH-1000XM4', 'Electronics', 'Good', 'ตัดเสียงรบกวนดีมาก เหมาะใส่อ่านหนังสือในหอสมุด', 'Listed', NULL, 'Sony WH-1000XM4', NULL, NULL),
(5, 5, 'จักรยานปั่นในมก. สีเขียว', 'Vehicles', 'Acceptable', 'ใช้งานปั่นไปเรียนได้ปกติ ยางเพิ่งเปลี่ยนใหม่', 'Listed', NULL, 'LA Bicycle', NULL, NULL),
(6, 5, 'ชุดกาวน์แลบ คณะวิทยาศาสตร์ Size L', 'Clothing', 'Good', 'ซักสะอาดเรียบร้อย ไม่มีรอยเปื้อนเคมี', 'Listed', '01403111', 'KU Co-op', NULL, 'L'),
(7, 6, 'โคมไฟอ่านหนังสือตั้งโต๊ะ LED', 'Home & Living', 'Very Good', 'ปรับความสว่างได้ 3 ระดับ ชาร์จ USB ได้', 'Listed', NULL, 'Xiaomi', NULL, NULL),
(8, 7, 'หนังสือ Physics for Scientists (01420111)', 'Books', 'New', 'ซื้อมาซ้ำยังไม่ได้แกะซีลเลยครับ', 'Listed', '01420111', 'Pearson', NULL, NULL),
(9, 8, 'เครื่องคิดเลขวิทยาศาสตร์ FX-991EX', 'Electronics', 'Good', 'ใช้เข้าห้องสอบวิศวะ/วิทยาได้แน่นอน', 'Transferred', '01417112', 'Casio FX-991EX', NULL, NULL),
(10, 10, 'กระเป๋าเป้ใส่โน้ตบุ๊ก 15.6 นิ้ว', 'Bags', 'Good', 'กันน้ำได้ระดับหนึ่ง มีช่องใส่ของเยอะ', 'Unlisted', NULL, 'Targus', NULL, NULL);

SELECT setval(pg_get_serial_sequence('"Item"', 'item_id'), 10);

INSERT INTO "Item_Image" (image_id, item_id, image_url, is_primary, display_order) VALUES
(1, 1, 'https://picsum.photos/id/24/800/600', TRUE, 1),
(2, 2, 'https://picsum.photos/id/1059/800/600', TRUE, 1),
(3, 3, 'https://picsum.photos/id/0/800/600', TRUE, 1),
(4, 3, 'https://picsum.photos/id/1/800/600', FALSE, 2),
(5, 4, 'https://picsum.photos/id/1082/800/600', TRUE, 1),
(6, 5, 'https://picsum.photos/id/146/800/600', TRUE, 1),
(7, 6, 'https://picsum.photos/id/1025/800/600', TRUE, 1),
(8, 7, 'https://picsum.photos/id/201/800/600', TRUE, 1),
(9, 8, 'https://picsum.photos/id/367/800/600', TRUE, 1),
(10, 9, 'https://picsum.photos/id/160/800/600', TRUE, 1),
(11, 10, 'https://picsum.photos/id/1062/800/600', TRUE, 1);

SELECT setval(pg_get_serial_sequence('"Item_Image"', 'image_id'), 11);

-- ------------------------------------------
-- 4. POSTS & OFFERS (โพสต์ขาย/ข้อเสนอแลก)
-- ------------------------------------------
INSERT INTO "Post" (post_id, item_id, post_type, price, quantity_total, quantity_remaining) VALUES
(1, 1, 'SellOnly', 250.00, 1, 1),
(2, 2, 'SellOnly', 180.00, 1, 1),
(3, 3, 'Both', 14500.00, 1, 1),  -- ขายหรือรับเทรด
(4, 4, 'TradeOnly', 0.00, 1, 1), -- รับเทรดเท่านั้น
(5, 5, 'SellOnly', 800.00, 1, 1),
(6, 6, 'SellOnly', 150.00, 1, 1),
(7, 7, 'SellOnly', 290.00, 1, 1),
(8, 8, 'Both', 450.00, 1, 1);

SELECT setval(pg_get_serial_sequence('"Post"', 'post_id'), 8);

-- อนันต์ (user_id: 4) เอาหูฟัง Sony (item_id: 4) + เงิน 2,000 ไปขอแลก iPad (post_id: 3) ของสมศรี
INSERT INTO "Offer" (offer_id, post_id, proposer_id, additional_money, status) VALUES
(1, 3, 4, 2000.00, 'Pending'),
(2, 4, 3, 0.00, 'Rejected'); -- สมศรีเคยยื่นแลกหูฟังแต่โดนปฏิเสธ

SELECT setval(pg_get_serial_sequence('"Offer"', 'offer_id'), 2);

INSERT INTO "Offer_Item" (offer_id, item_id) VALUES
(1, 4),
(2, 3);

-- ------------------------------------------
-- 5. REPORTS & TRANSACTIONS
-- ------------------------------------------
INSERT INTO "Report" (report_id, reporter_id, report_type, target_id, reason_category, details, evidence_urls, status, handled_by, resolution_note) VALUES
(1, 3, 'Transaction', 1, 'Non-responsive seller', 'ผู้ขายไม่ยอมมาตามนัดหมายที่หอสมุดและติดต่อไม่ได้', '["https://picsum.photos/id/10/800/600"]'::jsonb, 'Under_Investigation', 1, NULL),
(2, 6, 'Post', 5, 'Misleading description', 'จักรยานเบรคเสื่อมสภาพมากไม่ตรงตามที่ลงไว้', '["https://picsum.photos/id/11/800/600"]'::jsonb, 'Pending', NULL, NULL);

SELECT setval(pg_get_serial_sequence('"Report"', 'report_id'), 2);

INSERT INTO "Transaction" (transaction_id, post_id, offer_id, buyer_id, seller_id, quantity, status, active_report_id, delivery_method, slip_image_url) VALUES
(1, 1, NULL, 3, 2, 1, 'Processing', 1, 'Meetup', 'https://picsum.photos/id/20/600/800'),
(2, 2, NULL, 6, 2, 1, 'Completed', NULL, 'Meetup', 'https://picsum.photos/id/21/600/800'),
(3, 6, NULL, 8, 5, 1, 'Pending', NULL, 'Shipping', NULL);

SELECT setval(pg_get_serial_sequence('"Transaction"', 'transaction_id'), 3);

-- ------------------------------------------
-- 6. APPOINTMENT CARDS (ใบนัดหมาย)
-- ------------------------------------------
INSERT INTO "Appointment_Card" (appointment_id, transaction_id, proposed_by, date, time, location, status) VALUES
(1, 1, 2, '2026-08-10', '13:00:00', 'สำนักหอสมุด มก. (หน้าประตูทางเข้าหลัก)', 'Confirmed'),
(2, 2, 2, '2026-08-05', '16:30:00', 'อาคารเรียนรวม 4 (ศร.4) ชั้น 1', 'Confirmed');

SELECT setval(pg_get_serial_sequence('"Appointment_Card"', 'appointment_id'), 2);

-- ------------------------------------------
-- 7. GIVEAWAY SYSTEM (โพสต์แจกของฟรี)
-- ------------------------------------------
INSERT INTO "Giveaway_Post" (giveaway_id, item_name, description, pickup_location, giver_id, allocation_method, pickup_deadline, status) VALUES
(1, 'ชีทสรุป ฟิสิกส์ 1 พร้อมคลังข้อสอบเก่า', 'แจกต่อให้น้องๆ ครับ ปริ้นท์มาเกินไม่ได้ใช้เลย', 'โรงอาหารกลาง 1 (บาร์ใหม่)', 2, 'FirstCome', '2026-08-15 17:00:00', 'Active'),
(2, 'เสื้อช็อปคณะวิศวกรรมศาสตร์ Size M', 'ส่งต่อครับ เรียนจบแล้ว สภาพยังดีอยู่มาก', 'ตึกช็อปวิศวะ (หน้าลานเกียร์)', 8, 'Random', '2026-08-20 18:00:00', 'Active');

SELECT setval(pg_get_serial_sequence('"Giveaway_Post"', 'giveaway_id'), 2);

INSERT INTO "Giveaway_Ticket" (ticket_id, giveaway_id, receiver_id, qr_token, status) VALUES
(1, 1, 4, 'GW-TOKEN-8888-AAA', 'Waiting'),
(2, 1, 7, 'GW-TOKEN-8888-BBB', 'Waiting'),
(3, 2, 5, 'GW-TOKEN-9999-CCC', 'Waiting');

SELECT setval(pg_get_serial_sequence('"Giveaway_Ticket"', 'ticket_id'), 3);

INSERT INTO "Giveaway_Image" (giveaway_id, image_url, display_order) VALUES
(1, 'https://picsum.photos/id/24/800/600', 1),
(2, 'https://picsum.photos/id/1025/800/600', 1);

SELECT setval(pg_get_serial_sequence('"Giveaway_Image"', 'image_id'), 2);

-- ------------------------------------------
-- 8. CHAT SYSTEM & MESSAGES
-- ------------------------------------------
INSERT INTO "Chat_Room" (room_id, transaction_id, giveaway_id) VALUES
(1, 1, NULL), -- ห้องแชตซื้อขายหนังสือ แคลคูลัส 1
(2, 2, NULL), -- ห้องแชตซื้อขายเสื้อนิสิต
(3, NULL, 1); -- ห้องแชตกลุ่มแจกชีทฟิสิกส์ 1

SELECT setval(pg_get_serial_sequence('"Chat_Room"', 'room_id'), 3);

INSERT INTO "Chat_Message" (message_id, room_id, sender_id, content) VALUES
(1, 1, 3, 'สวัสดีครับพี่ โอนเงินค่าหนังสือแคลคูลัสเรียบร้อยแล้วนะครับ'),
(2, 1, 2, 'ได้รับยอดแล้วครับ สะดวกนัดรับวันจันทร์ตอนบ่ายโมงไหมครับ?'),
(3, 1, 3, 'สะดวกครับ เจอตรงหน้าประตูทางเข้าหอสมุดนะครับ'),
(4, 2, 6, 'เสื้อนิสิตซักตากเรียบร้อยแล้วใช่ไหมครับ'),
(5, 2, 2, 'ใช่ครับ ซักรีดเรียบร้อยพร้อมใส่ได้เลยครับ'),
(6, 3, 2, 'ยินดีด้วยกับน้องๆ ที่กดรับสิทธิ์ทันนะครับ นัดรับชีทที่บาร์ใหม่ได้เลย');

SELECT setval(pg_get_serial_sequence('"Chat_Message"', 'message_id'), 6);

-- ------------------------------------------
-- 9. APPEALS (การยื่นอุทธรณ์)
-- ------------------------------------------
INSERT INTO "Appeal" (appeal_id, report_id, appellant_id, reason, evidence_urls, status, handled_by) VALUES
(1, 1, 2, 'วันนั้นติดสอบกะทันหันครับ พยายามติดต่อผู้ซื้อแล้วแต่สัญญาณโทรศัพท์ไม่มี', '["https://picsum.photos/id/30/800/600"]'::jsonb, 'Pending', NULL);

SELECT setval(pg_get_serial_sequence('"Appeal"', 'appeal_id'), 1);
