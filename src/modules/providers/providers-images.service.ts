import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { put, del } from '@vercel/blob';

@Injectable()
export class ProvidersImagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate image file
   */
  private validateImage(
    file: Express.Multer.File,
    maxSizeMB: number,
    allowedTypes: string[],
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size must be less than ${maxSizeMB}MB`,
      );
    }

    // Validate file type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }
  }

  /**
   * Verify provider exists and user has access
   */
  private async verifyProvider(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { service_provider: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'service_provider') {
      throw new ForbiddenException('Only service providers can upload images');
    }

    if (!user.service_provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    return user.service_provider;
  }

  /**
   * Upload logo image
   */
  async uploadLogo(
    userId: number,
    file: Express.Multer.File,
  ): Promise<{ logoUrl: string }> {
    const provider = await this.verifyProvider(userId);

    // Validate image (2MB max, only images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.validateImage(file, 2, allowedTypes);

    // Delete old logo if exists
    if (provider.logo_url) {
      try {
        await del(provider.logo_url, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (error) {
        // Log but don't fail if deletion fails
        console.error('Failed to delete old logo:', error);
      }
    }

    // Generate unique filename
    const filename = `providers/${provider.id}/logo-${Date.now()}.${
      file.mimetype.split('/')[1]
    }`;

    // Upload to Vercel Blob
    const blob = await put(filename, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Update database
    await this.prisma.service_providers.update({
      where: { id: provider.id },
      data: { logo_url: blob.url },
    });

    return { logoUrl: blob.url };
  }

  /**
   * Upload banner image (main homepage image)
   */
  async uploadBanner(
    userId: number,
    file: Express.Multer.File,
  ): Promise<{ bannerUrl: string }> {
    const provider = await this.verifyProvider(userId);

    // Validate image (3MB max, only images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.validateImage(file, 3, allowedTypes);

    // Delete old banner if exists
    if (provider.banner_url) {
      try {
        await del(provider.banner_url, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (error) {
        console.error('Failed to delete old banner:', error);
      }
    }

    // Generate unique filename
    const filename = `providers/${provider.id}/banner-${Date.now()}.${
      file.mimetype.split('/')[1]
    }`;

    // Upload to Vercel Blob
    const blob = await put(filename, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Update database
    await this.prisma.service_providers.update({
      where: { id: provider.id },
      data: { banner_url: blob.url },
    });

    return { bannerUrl: blob.url };
  }

  /**
   * Upload gallery image
   */
  async uploadGalleryImage(
    userId: number,
    file: Express.Multer.File,
    caption?: string,
  ): Promise<{ image: { id: string; url: string; caption?: string; order: number } }> {
    const provider = await this.verifyProvider(userId);

    // Validate image (5MB max, only images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.validateImage(file, 5, allowedTypes);

    // Get current gallery images
    const currentGallery =
      (provider.gallery_images as Array<{
        id: string;
        url: string;
        caption?: string;
        order: number;
      }>) || [];

    // Generate unique filename
    const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const filename = `providers/${provider.id}/gallery/${imageId}.${
      file.mimetype.split('/')[1]
    }`;

    // Upload to Vercel Blob
    const blob = await put(filename, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Calculate next order number
    const nextOrder =
      currentGallery.length > 0
        ? Math.max(...currentGallery.map((img) => img.order)) + 1
        : 1;

    // Create new image object
    const newImage = {
      id: imageId,
      url: blob.url,
      caption: caption || undefined,
      order: nextOrder,
    };

    // Update gallery in database
    const updatedGallery = [...currentGallery, newImage];
    await this.prisma.service_providers.update({
      where: { id: provider.id },
      data: { gallery_images: updatedGallery },
    });

    return { image: newImage };
  }

  /**
   * Delete gallery image
   */
  async deleteGalleryImage(
    userId: number,
    imageId: string,
  ): Promise<{ success: boolean }> {
    const provider = await this.verifyProvider(userId);

    // Get current gallery images
    const currentGallery =
      (provider.gallery_images as Array<{
        id: string;
        url: string;
        caption?: string;
        order: number;
      }>) || [];

    // Find image to delete
    const imageToDelete = currentGallery.find((img) => img.id === imageId);
    if (!imageToDelete) {
      throw new NotFoundException('Gallery image not found');
    }

    // Delete from Vercel Blob
    try {
      await del(imageToDelete.url, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (error) {
      console.error('Failed to delete image from blob storage:', error);
      // Continue with DB deletion even if blob deletion fails
    }

    // Remove from database
    const updatedGallery = currentGallery.filter((img) => img.id !== imageId);
    await this.prisma.service_providers.update({
      where: { id: provider.id },
      data: { gallery_images: updatedGallery },
    });

    return { success: true };
  }

  /**
   * Reorder gallery images
   */
  async reorderGalleryImages(
    userId: number,
    imageIds: string[],
  ): Promise<{ success: boolean }> {
    const provider = await this.verifyProvider(userId);

    // Get current gallery images
    const currentGallery =
      (provider.gallery_images as Array<{
        id: string;
        url: string;
        caption?: string;
        order: number;
      }>) || [];

    // Verify all image IDs exist
    const existingIds = currentGallery.map((img) => img.id);
    const invalidIds = imageIds.filter((id) => !existingIds.includes(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid image IDs: ${invalidIds.join(', ')}`,
      );
    }

    // Reorder images
    const reorderedGallery = imageIds.map((id, index) => {
      const image = currentGallery.find((img) => img.id === id);
      return {
        ...image!,
        order: index + 1,
      };
    });

    // Update database
    await this.prisma.service_providers.update({
      where: { id: provider.id },
      data: { gallery_images: reorderedGallery },
    });

    return { success: true };
  }

  /**
   * Get provider images
   */
  async getProviderImages(userId: number) {
    const provider = await this.verifyProvider(userId);

    return {
      logoUrl: provider.logo_url,
      bannerUrl: provider.banner_url,
      galleryImages:
        (provider.gallery_images as Array<{
          id: string;
          url: string;
          caption?: string;
          order: number;
        }>) || [],
    };
  }
}

