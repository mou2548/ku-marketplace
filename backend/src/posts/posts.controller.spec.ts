import { PostsController } from './posts.controller';
import type { PostsService } from './posts.service';

describe('PostsController authenticated identity', () => {
  it('uses the token identity instead of buyer/proposer IDs supplied by the caller', () => {
    const service = { buyPost: jest.fn(), createOffer: jest.fn() };
    const controller = new PostsController(service as unknown as PostsService);
    const user = { userId: 4, email: 'user2@ku.th', isAdmin: false };
    controller.buyPost('1', { buyer_id: 99 }, user);
    expect(service.buyPost).toHaveBeenCalledWith('1', { buyer_id: 4 });
    controller.createOffer('1', { proposer_id: 99, item_ids: [2] }, user);
    expect(service.createOffer).toHaveBeenCalledWith('1', {
      proposer_id: 4,
      item_ids: [2],
    });
  });
});
