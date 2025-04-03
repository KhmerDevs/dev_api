import { Injectable, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from '../../entities/certificate.entity';
import { User } from '../../entities/user.entity';
import { Course } from '../../entities/course.entity';
import { ExamAttempt } from '../../entities/exam-attempt.entity';
import * as crypto from 'crypto';
import * as PDFDocument from 'pdfkit';
import { FirebaseStorageService } from '../../shared/firebase-storage.service';
import { Readable } from 'stream';
import { ExamService } from './exam.service';
import { In } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
    @Inject(forwardRef(() => ExamService))
    private examService: ExamService,
    private firebaseStorageService: FirebaseStorageService,
  ) {}

  async generateCertificate(userId: number, courseId: number, examAttemptId: number): Promise<Certificate> {
    // First check if certificate already exists
    const existingCertificate = await this.findExistingCertificate(userId, courseId);
    if (existingCertificate) {
      return existingCertificate; // Return existing certificate instead of creating a new one
    }

    // Verify the exam attempt is valid and passed
    const examAttempt = await this.examAttemptRepository.findOne({
      where: { id: examAttemptId, userId, courseId, passed: true, isCompleted: true }
    });

    if (!examAttempt) {
      throw new NotFoundException('No passing exam attempt found');
    }

    // Get user and course details
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const course = await this.courseRepository.findOne({ where: { id: courseId } });

    if (!user || !course) {
      throw new NotFoundException('User or course not found');
    }

    // Generate a unique certificate number
    const certificateNumber = this.generateCertificateNumber(userId, courseId, examAttemptId);

    // Create certificate record
    const certificate = this.certificateRepository.create({
      userId,
      courseId,
      examAttemptId,
      certificateNumber,
      isValid: true
    });

    // Save certificate to database
    const savedCertificate = await this.certificateRepository.save(certificate);

    // Generate PDF certificate
    const pdfUrl = await this.generatePdfCertificate(savedCertificate, user, course);
    
    // Update certificate with PDF URL
    savedCertificate.pdfUrl = pdfUrl;
    return this.certificateRepository.save(savedCertificate);
  }

  async getUserCertificates(userId: number) {
    const certificates = await this.certificateRepository.find({
      where: { userId, isValid: true },
      relations: ['course'],
      order: { issuedAt: 'DESC' }
    });

    return certificates.map(cert => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      courseTitle: cert.course.title,
      courseId: cert.courseId,
      issuedAt: cert.issuedAt,
      pdfUrl: cert.pdfUrl
    }));
  }

  async getCertificateById(id: number) {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: ['user', 'course', 'examAttempt']
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  async verifyCertificate(certificateNumber: string) {
    const certificate = await this.certificateRepository.findOne({
      where: { certificateNumber },
      relations: ['user', 'course']
    });

    if (!certificate || !certificate.isValid) {
      return { valid: false };
    }

    return {
      valid: true,
      certificateInfo: {
        id: certificate.id,
        userName: certificate.user.name,
        courseTitle: certificate.course.title,
        issuedAt: certificate.issuedAt
      }
    };
  }

  private generateCertificateNumber(userId: number, courseId: number, examAttemptId: number): string {
    const timestamp = Date.now().toString();
    const data = `${userId}-${courseId}-${examAttemptId}-${timestamp}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `CERT-${hash.substring(0, 8)}-${hash.substring(8, 16)}`.toUpperCase();
  }

  // Changed from private to public so ExamService can use it
  async generatePdfCertificate(certificate: Certificate, user: User, course: Course): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 0,
        });

        // Create a buffer to store the PDF
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const fileName = `certificate_${certificate.id}_${Date.now()}.pdf`;
            
            // Upload to Firebase Storage
            const pdfUrl = await this.firebaseStorageService.uploadFile(
              pdfBuffer,
              fileName,
              {
                folderPath: 'certificates',
                mimeType: 'application/pdf'
              }
            );
            
            resolve(pdfUrl);
          } catch (error) {
            reject(error);
          }
        });

        // Define dimensions for easier positioning
        const width = doc.page.width;
        const height = doc.page.height;
        
        // Add background color
        doc.rect(0, 0, width, height)
           .fill('#FFF8E8');
        
        // Add border
        doc.rect(20, 20, width - 40, height - 40)
           .lineWidth(2)
           .stroke('#333333');
        
        // Add decorative corners
        doc.polygon([20, 20], [60, 20], [20, 60])
           .fill('#FFA500');
        
        doc.polygon([width - 20, 20], [width - 60, 20], [width - 20, 60])
           .fill('#FFA500');
        
        doc.polygon([20, height - 20], [60, height - 20], [20, height - 60])
           .fill('#FFA500');
        
        doc.polygon([width - 20, height - 20], [width - 60, height - 20], [width - 20, height - 60])
           .fill('#FFA500');
        
        // Add certificate title
        doc.fontSize(36)
           .font('Helvetica-Bold')
           .fillColor('#333333');
        
        doc.text('CERTIFICATE OF COMPLETION', 0, 80, {
          align: 'center',
          width: width
        });
        
        // Add KhmerDev subtitle
        doc.fontSize(18)
           .font('Helvetica')
           .fillColor('#666666');
        
        doc.text('KhmerDev Learning Platform', 0, 130, {
          align: 'center',
          width: width
        });
        
        // Add recipient name
        doc.fontSize(28)
           .font('Helvetica-Bold')
           .fillColor('#333333');
        
        doc.text(user.name, 0, 200, {
          align: 'center',
          width: width
        });
        
        // Add completion text
        doc.fontSize(16)
           .font('Helvetica')
           .fillColor('#333333');
        
        doc.text('has successfully completed the course', 0, 250, {
          align: 'center',
          width: width
        });
        
        // Add course title
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#333333');
        
        doc.text(course.title, 0, 290, {
          align: 'center',
          width: width
        });
        
        // Add certificate number
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#666666');
        
        doc.text(`Certificate ID: ${certificate.certificateNumber}`, 0, 350, {
          align: 'center',
          width: width
        });
        
        // Add issue date
        const issueDate = new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        doc.text(`Issued on: ${issueDate}`, 0, 380, {
          align: 'center',
          width: width
        });
        
        // Add signature image
        const signaturePath = path.join(process.cwd(), 'public', 'signature.png');
        if (fs.existsSync(signaturePath)) {
          // Move signature up even more
          doc.image(signaturePath, width / 2 - 75, 400, { 
            width: 150,
            align: 'center'
          });
          
          // Adjust all text positions to be higher
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#333333');
          
          doc.text('HENG BUNKHEANG', 0, 480, { 
            align: 'center',
            width: width
          });
          
          doc.fontSize(12)
             .font('Helvetica')
             .fillColor('#666666');
          
          doc.text('Lead Developer', 0, 500, { 
            align: 'center',
            width: width
          });
          
          // Move tagline up and make it more visible
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#FFA500');
          
          doc.text('YOUTH TO TECHNOLOGY', 0, 530, {
            align: 'center',
            width: width
          });
          
          // Add verification text with clear separation - moved higher
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#999999');
          
          doc.text(`Verify this certificate at: ${process.env.BASE_URL || 'http://localhost:8001'}/user/certificates/verify/${certificate.certificateNumber}`, 0, 560, {
            align: 'center',
            width: width
          });
        } else {
          // Adjust fallback positioning as well
          doc.moveTo(width / 2 - 100, 420)
             .lineTo(width / 2 + 100, 420)
             .lineWidth(1)
             .stroke();
          
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#333333');
          
          doc.text('HENG BUNKHEANG', 0, 440, { 
            align: 'center',
            width: width
          });
          
          doc.fontSize(12)
             .font('Helvetica')
             .fillColor('#666666');
          
          doc.text('Lead Developer', 0, 460, { 
            align: 'center',
            width: width
          });
          
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#FFA500');
          
          doc.text('YOUTH TO TECHNOLOGY', 0, 490, {
            align: 'center',
            width: width
          });
          
          // Add verification text with clear separation - moved higher
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#999999');
          
          doc.text(`Verify this certificate at: ${process.env.BASE_URL || 'http://localhost:8001'}/user/certificates/verify/${certificate.certificateNumber}`, 0, 520, {
            align: 'center',
            width: width
          });
        }
        
        // Finalize the PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Add this method to find existing certificate
  async findExistingCertificate(userId: number, courseId: number): Promise<Certificate | null> {
    return this.certificateRepository.findOne({
      where: { userId, courseId },
      order: { issuedAt: 'DESC' }
    });
  }

  // Add this method to get certificates for multiple courses at once
  async getUserCertificatesForCourses(userId: number, courseIds: number[]): Promise<Certificate[]> {
    if (!courseIds.length) return [];
    
    return this.certificateRepository.find({
      where: { 
        userId, 
        courseId: In(courseIds) 
      },
      order: { issuedAt: 'DESC' }
    });
  }
} 