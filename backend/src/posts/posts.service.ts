import { Injectable } from '@nestjs/common';

export interface CreatePostPayload {
  item_id?: number;
  post_type?: string;
  price?: number;
  quantity_total?: number;
}

export interface UpdatePostPayload {
  price?: number;
}

export interface BuyPostPayload {
  delivery_method?: string;
  quantity?: number;
}

export interface CreateOfferPayload {
  item_ids?: number[];
  additional_money?: number;
}

export interface AcceptOfferPayload {
  delivery_method?: string;
}

@Injectable()
export class PostsService {
  createPost(payload: CreatePostPayload) {
    return {
      success: true,
      message: 'สร้างโพสต์สำเร็จ',
      data: {
        post_id: 'post_001',
        item_id: payload.item_id ?? 145,
        post_type: payload.post_type ?? 'Both',
        price: payload.price ?? 250,
        quantity_total: payload.quantity_total ?? 1,
        quantity_available: payload.quantity_total ?? 1,
        status: 'active',
        created_at: '2026-07-29T10:00:00.000Z',
      },
    };
  }

  findAllPosts() {
    return {
      success: true,
      message: 'นำโพสต์ทั้งหมดมาแสดงสำเร็จ',
      data: [
        {
          post_id: 'post_001',
          item_id: 145,
          post_type: 'Both',
          item_name: 'หนังสือ Calculus เล่ม 1',
          price: 250,
          quantity_total: 1,
          quantity_available: 1,
          status: 'active',
        },
        {
          post_id: 'post_002',
          item_id: 201,
          post_type: 'Sell',
          item_name: 'เสื้อคณะไซส์ M',
          price: 180,
          quantity_total: 1,
          quantity_available: 1,
          status: 'active',
        },
      ],
    };
  }

  getPostById(postId: string) {
    return {
      success: true,
      message: 'รายละเอียดโพสต์สำเร็จ',
      data: {
        post_id: postId,
        item_id: 145,
        post_type: 'Both',
        item_name: 'หนังสือ Calculus เล่ม 1',
        price: 250,
        quantity_total: 1,
        quantity_available: 1,
        description: 'มีรอยขีดเขียนบางหน้า',
        status: 'active',
      },
    };
  }

  updatePostPrice(postId: string, payload: UpdatePostPayload) {
    return {
      success: true,
      message: 'แก้ไขโพสต์สำเร็จ',
      data: {
        post_id: postId,
        price: payload.price ?? 250,
        updated_at: '2026-07-29T10:15:00.000Z',
      },
    };
  }

  deletePost(postId: string) {
    return {
      success: true,
      message: 'ลบโพสต์สำเร็จ',
      data: {
        post_id: postId,
        deleted: true,
      },
    };
  }

  buyPost(postId: string, payload: BuyPostPayload) {
    return {
      success: true,
      message: 'ทำการซื้อสำเร็จ',
      data: {
        transaction_id: 'transaction_001',
        post_id: postId,
        buyer_id: 'user_001',
        delivery_method: payload.delivery_method ?? 'Meetup',
        quantity: payload.quantity ?? 1,
        status: 'purchased',
      },
    };
  }

  createOffer(postId: string, payload: CreateOfferPayload) {
    return {
      success: true,
      message: 'เสนอข้อแลกเปลี่ยนสำเร็จ',
      data: {
        post_id: postId,
        offer_id: 'offer_001',
        offerer_id: 'user_002',
        item_ids: payload.item_ids ?? [201, 205],
        additional_money: payload.additional_money ?? 100,
        status: 'pending',
        created_at: '2026-07-29T10:20:00.000Z',
      },
    };
  }

  getOffers(postId: string) {
    return {
      success: true,
      message: 'แสดงข้อแลกเปลี่ยนสำเร็จ',
      data: {
        post_id: postId,
        offers: [
          {
            offer_id: 'offer_001',
            offerer_id: 'user_002',
            item_ids: [201, 205],
            additional_money: 100,
            status: 'pending',
          },
        ],
      },
    };
  }

  acceptOffer(postId: string, offerId: string, payload: AcceptOfferPayload) {
    return {
      success: true,
      message: 'ตอบรับข้อเสนอสำเร็จ',
      data: {
        transaction_id: 'transaction_002',
        post_id: postId,
        offer_id: offerId,
        delivery_method: payload.delivery_method ?? 'Shipping',
        status: 'accepted',
      },
    };
  }

  withdrawOffer(offerId: string) {
    return {
      success: true,
      message: 'ถอนข้อเสนอสำเร็จ',
      data: {
        offer_id: offerId,
        status: 'withdrawn',
      },
    };
  }

  rejectOffer(postId: string, offerId: string) {
    return {
      success: true,
      message: 'ปฏิเสธข้อเสนอสำเร็จ',
      data: {
        post_id: postId,
        offer_id: offerId,
        status: 'rejected',
      },
    };
  }
}
