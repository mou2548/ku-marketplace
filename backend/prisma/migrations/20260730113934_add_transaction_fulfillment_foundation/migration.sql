-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('Books', 'Electronics', 'Fashion', 'Stationery', 'DormSupplies', 'Sports', 'SpecializedEquipment', 'Vehicles', 'EventTickets', 'Other');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('New', 'Very_Good', 'Good', 'Acceptable');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('Unlisted', 'Listed', 'Transferred');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('SellOnly', 'TradeOnly', 'Both');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('Pending', 'Accepted', 'Rejected', 'Cancelled', 'Withdrawn');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('Pending', 'Processing', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('Meetup', 'Shipping');

-- CreateTable
CREATE TABLE "Item" (
    "item_id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "condition" "ItemCondition" NOT NULL,
    "description" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'Unlisted',
    "course_name" VARCHAR(100),
    "brand_model" VARCHAR(100),
    "warranty_expiry" DATE,
    "size" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "Post" (
    "post_id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "post_type" "PostType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity_total" INTEGER NOT NULL DEFAULT 1,
    "quantity_remaining" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "offer_id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "proposer_id" INTEGER NOT NULL,
    "additional_money" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" "OfferStatus" NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("offer_id")
);

-- CreateTable
CREATE TABLE "Offer_Item" (
    "offer_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,

    CONSTRAINT "Offer_Item_pkey" PRIMARY KEY ("offer_id","item_id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "offer_id" INTEGER,
    "buyer_id" INTEGER NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "TransactionStatus" NOT NULL DEFAULT 'Pending',
    "active_report_id" INTEGER,
    "delivery_method" "DeliveryMethod" NOT NULL,
    "slip_image_url" VARCHAR(500),
    "tracking_number" VARCHAR(100),
    "estimated_delivery_date" DATE,
    "payment_confirmed_by_buyer_at" TIMESTAMP(3),
    "payment_received_by_seller_at" TIMESTAMP(3),
    "delivery_confirmed_by_buyer_at" TIMESTAMP(3),
    "cancel_requested_by" INTEGER,
    "cancel_requested_at" TIMESTAMP(3),
    "refund_slip_url" VARCHAR(500),
    "refund_confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_proposer_id_fkey" FOREIGN KEY ("proposer_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer_Item" ADD CONSTRAINT "Offer_Item_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offer"("offer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer_Item" ADD CONSTRAINT "Offer_Item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offer"("offer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_active_report_id_fkey" FOREIGN KEY ("active_report_id") REFERENCES "Report"("report_id") ON DELETE SET NULL ON UPDATE CASCADE;
