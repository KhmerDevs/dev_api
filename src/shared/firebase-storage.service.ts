import { Injectable, Logger } from '@nestjs/common';
import { storage } from '../config/firebase.config';

@Injectable()
export class FirebaseStorageService {
  private readonly logger = new Logger(FirebaseStorageService.name);

  async uploadFile(file: Buffer, fileName: string, folderPath: string = 'certificates'): Promise<string> {
    try {
      const bucket = storage.bucket();
      const fullPath = `${folderPath}/${fileName}`;
      const fileRef = bucket.file(fullPath);


      await fileRef.save(file, {
        contentType: 'application/pdf'
      });


      await fileRef.makePublic();


      const publicUrl = fileRef.publicUrl();
      
      return publicUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file to Firebase Storage: ${error.message}`);
      throw error;
    }
  }
} 