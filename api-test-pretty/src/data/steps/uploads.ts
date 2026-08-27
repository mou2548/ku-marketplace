import type { StepGroup } from '../types';

export const uploadsStep: StepGroup = {
  id: 'uploads',
  step: 9,
  title: 'อัปโหลดรูปภาพ (Cloudinary)',
  icon: 'image',
  description: 'อัปโหลดรูปจริง ได้ URL กลับมาไปใส่ในฟิลด์ image_url/slip_image_url/proofImageUrl ของขั้นก่อนๆ ได้ทันที',
  endpoints: [
    {
      id: 'upload-image',
      method: 'POST',
      path: '/uploads/image',
      label: 'อัปโหลดรูปภาพ',
      needsAuth: true,
      isFileUpload: true,
      captures: [{ responseKeys: ['url'], sessionKey: 'lastUploadUrl' }],
    },
  ],
};
