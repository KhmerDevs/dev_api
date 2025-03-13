import { Injectable } from '@nestjs/common';

@Injectable()
export class FileUploadService {
  // This method now just validates and returns the URL
  async validateImageUrl(imageUrl: string): Promise<string> {
    // You could add URL validation logic here if needed
    // For example, check if it's a valid image URL format
    // For now, we'll just return the URL as is
    return imageUrl;
  }
} 