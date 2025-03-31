import { Injectable, Logger } from '@nestjs/common';
import { storage } from '../config/firebase.config';
import sharp from 'sharp';

@Injectable()
export class FirebaseStorageService {
  private readonly logger = new Logger(FirebaseStorageService.name);
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  async uploadFile(
    file: Buffer,
    fileName: string,
    options: {
      folderPath?: string;
      mimeType?: string;
      compress?: boolean;
      maxWidth?: number;
    } = {}
  ): Promise<string> {
    try {
      // Validate file
      if (file.length > this.MAX_FILE_SIZE) {
        throw new Error('File size exceeds maximum limit');
      }
      if (!this.ALLOWED_MIME_TYPES.includes(options.mimeType)) {
        throw new Error('Invalid file type');
      }

      let processedFile = file;
      if (options.compress && options.mimeType.startsWith('image/')) {
        processedFile = await sharp(file)
          .resize(options.maxWidth || 1200)
          .jpeg({ quality: 80 })
          .toBuffer();
      }

      const bucket = storage.bucket();
      const fullPath = `${options.folderPath || 'uploads'}/${Date.now()}-${fileName}`;
      const fileRef = bucket.file(fullPath);

      await fileRef.save(processedFile, {
        contentType: options.mimeType,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });

      await fileRef.makePublic();
      return fileRef.publicUrl();
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }
} 