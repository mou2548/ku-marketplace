import { Injectable } from '@nestjs/common';

@Injectable()
export class PostsService {
  async createPost(payload: Record<string, any>) {
    return {
      success: true,
      message: 'สร้างโพสต์สำเร็จ',
      data: {
        post_id: 'post_001',
        status: 'draft',
        ...payload,
      },
    };
  }

  async findAllPosts() {
    return {
      success: true,
      message: 'นำโพสต์ทั้งหมดมาแสดงสำเร็จ',
      data: [
        {
          post_id: 'post_001',
          title: 'เสื้อผ้าแยกขาย',
          price: 250,
          status: 'active',
        },
      ],
    };
  }

  async getPostById(postId: string) {
    return {
      success: true,
      message: 'รายละเอียดโพสต์สำเร็จ',
      data: {
        post_id: postId,
        title: 'เสื้อผ้าแยกขาย',
        price: 250,
        description: 'โพสต์ตัวอย่างสำหรับการทดสอบ',
        status: 'active',
      },
    };
  }

  async updatePostPrice(postId: string, payload: Record<string, any>) {
    return {
      success: true,
      message: 'แก้ไขโพสต์สำเร็จ',
      data: {
        post_id: postId,
        price: payload.price ?? 250,
        updated_at: new Date().toISOString(),
      },
    };
  }

  async deletePost(postId: string) {
    return {
      success: true,
      message: 'ลบโพสต์สำเร็จ',
      data: {
        post_id: postId,
        deleted: true,
      },
    };
  }

  async buyPost(postId: string) {
    return {
      success: true,
      message: 'ทำการซื้อสำเร็จ',
      data: {
        post_id: postId,
        buyer_id: 'user_001',
        status: 'purchased',
      },
    };
  }

  async createOffer(postId: string, payload: Record<string, any>) {
    return {
      success: true,
      message: 'เสนอข้อแลกเปลี่ยนสำเร็จ',
      data: {
        post_id: postId,
        offer_id: 'offer_001',
        ...payload,
        status: 'pending',
      },
    };
  }

  async getOffers(postId: string) {
    return {
      success: true,
      message: 'แสดงข้อแลกเปลี่ยนสำเร็จ',
      data: {
        post_id: postId,
        offers: [
          {
            offer_id: 'offer_001',
            status: 'pending',
            proposed_item: 'หนังสือ',
          },
        ],
      },
    };
  }

  async acceptOffer(postId: string, offerId: string) {
    return {
      success: true,
      message: 'ตอบรับข้อเสนอสำเร็จ',
      data: {
        post_id: postId,
        offer_id: offerId,
        status: 'accepted',
      },
    };
  }

  async withdrawOffer(offerId: string) {
    return {
      success: true,
      message: 'ถอนข้อเสนอสำเร็จ',
      data: {
        offer_id: offerId,
        status: 'withdrawn',
      },
    };
  }

  async rejectOffer(postId: string, offerId: string) {
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
