import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QCM } from '../entities/qcm.entity';
import { Course } from '../entities/course.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { CreateQcmDto } from './dto/qcm/create-qcm.dto';

@Injectable()
export class ExamAdminService {
  constructor(
    @InjectRepository(QCM)
    private qcmRepository: Repository<QCM>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
  ) {}

  async createQcm(createQcmDto: CreateQcmDto) {
    // Validate course exists
    const course = await this.courseRepository.findOne({
      where: { id: createQcmDto.courseId }
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${createQcmDto.courseId} not found`);
    }

    // Get the highest question number for this course
    const highestQcm = await this.qcmRepository.findOne({
      where: { courseId: createQcmDto.courseId },
      order: { questionNumber: 'DESC' }
    });

    const questionNumber = highestQcm ? highestQcm.questionNumber + 1 : 1;
    const orderIndex = highestQcm ? highestQcm.orderIndex + 1 : 0;

    // Create the QCM
    const qcm = this.qcmRepository.create({
      ...createQcmDto,
      questionNumber,
      orderIndex
    });

    return this.qcmRepository.save(qcm);
  }

  async getCourseQcms(courseId: number) {
    // Validate course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const qcms = await this.qcmRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' }
    });

    return qcms;
  }

  async deleteQcm(courseId: number, questionNumber: number) {
    const qcm = await this.qcmRepository.findOne({
      where: { courseId, questionNumber }
    });

    if (!qcm) {
      throw new NotFoundException('QCM not found');
    }

    await this.qcmRepository.remove(qcm);
    return { message: 'QCM deleted successfully' };
  }

  async reorderQcms(courseId: number, qcmIds: number[]) {
    // Validate course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Validate all QCMs exist and belong to this course
    const qcms = await this.qcmRepository.find({
      where: { id: In(qcmIds), courseId }
    });

    if (qcms.length !== qcmIds.length) {
      throw new BadRequestException('Some QCM IDs are invalid or do not belong to this course');
    }

    // Update order indexes
    const updates = qcmIds.map((id, index) => {
      return this.qcmRepository.update(id, { orderIndex: index });
    });

    await Promise.all(updates);

    return {
      message: 'QCMs reordered successfully',
      order: qcmIds
    };
  }

  async updateQcm(courseId: number, questionNumber: number, updateQcmDto: CreateQcmDto) {
    const qcm = await this.qcmRepository.findOne({
      where: { courseId, questionNumber }
    });

    if (!qcm) {
      throw new NotFoundException('QCM not found');
    }

    // Update QCM properties
    Object.assign(qcm, updateQcmDto);
    
    // Keep the original question number and course ID
    qcm.questionNumber = questionNumber;
    qcm.courseId = courseId;

    return this.qcmRepository.save(qcm);
  }

  async createQcmsBatch(createQcmDtos: CreateQcmDto[]) {
    const savedQcms = [];
    for (const dto of createQcmDtos) {
      savedQcms.push(await this.createQcm(dto));
    }
    return savedQcms;
  }

  async getAllExamResults(courseId?: number, userId?: number) {
    // Build the query with optional filters
    const query: any = {};
    
    if (courseId) {
      query.courseId = courseId;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    const examAttempts = await this.examAttemptRepository.find({
      where: query,
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' }
    });
    
    // Format the results to include user and course info
    return examAttempts.map(attempt => ({
      id: attempt.id,
      user: {
        id: attempt.user.id,
        name: attempt.user.name,
        email: attempt.user.email
      },
      course: {
        id: attempt.course.id,
        title: attempt.course.title
      },
      score: attempt.score,
      passed: attempt.passed,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationInSeconds: attempt.durationInSeconds,
      createdAt: attempt.createdAt
    }));
  }

  async getExamResultById(id: number) {
    const examAttempt = await this.examAttemptRepository.findOne({
      where: { id },
      relations: ['user', 'course']
    });
    
    if (!examAttempt) {
      throw new NotFoundException('Exam attempt not found');
    }
    
    return {
      id: examAttempt.id,
      user: {
        id: examAttempt.user.id,
        name: examAttempt.user.name,
        email: examAttempt.user.email
      },
      course: {
        id: examAttempt.course.id,
        title: examAttempt.course.title
      },
      score: examAttempt.score,
      passed: examAttempt.passed,
      answers: examAttempt.answers,
      startedAt: examAttempt.startedAt,
      submittedAt: examAttempt.submittedAt,
      durationInSeconds: examAttempt.durationInSeconds,
      createdAt: examAttempt.createdAt
    };
  }
} 