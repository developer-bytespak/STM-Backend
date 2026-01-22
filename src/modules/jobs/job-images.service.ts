import { Injectable, BadRequestException } from '@nestjs/common';
import { put } from '@vercel/blob';

@Injectable()
export class JobImagesService {
  /**
   * Validate image file
   */
  private validateImage(file: Express.Multer.File) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    // Validate file type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }
  }

  /**
   * Upload multiple job images
   */
  async uploadJobImages(
    files: Express.Multer.File[],
  ): Promise<{ imageUrls: string[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 images allowed');
    }

    console.log(`📁 Received ${files.length} files for upload`);
    
    // Validate all files first
    files.forEach((file) => {
      console.log(`📋 Validating: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
      this.validateImage(file);
    });

    // Upload all images to Vercel Blob
    const uploadPromises = files.map(async (file, index) => {
      const filename = `job-requests/${Date.now()}-${Math.random().toString(36).substring(7)}.${
        file.mimetype.split('/')[1]
      }`;

      console.log(`🚀 Uploading ${index + 1}/${files.length}: ${filename}`);
      
      const blob = await put(filename, file.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      console.log(`✅ Upload complete: ${blob.url}`);
      return blob.url;
    });

    const imageUrls = await Promise.all(uploadPromises);

    console.log(`🎉 All ${imageUrls.length} images uploaded successfully`);
    console.log('📍 URLs:', imageUrls);
    
    return { imageUrls };
  }
}
