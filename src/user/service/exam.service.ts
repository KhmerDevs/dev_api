import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { QCM } from '../../entities/qcm.entity';
import { ExamAttempt } from '../../entities/exam-attempt.entity';
import { UserActivity } from '../../entities/user-activity.entity';
import { ActivityType } from '../../entities/user-activity.entity';
import { EnrollmentService } from './enrollment.service';
import { CourseProgressService } from './course-progress.service';
import { CertificateService } from './certificate.service';
import { Not, IsNull } from 'typeorm';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(QCM)
    private qcmRepository: Repository<QCM>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>,
    private enrollmentService: EnrollmentService,
    private courseProgressService: CourseProgressService,
    private certificateService: CertificateService,
  ) {}

  async getExam(userId: number, courseId: number) {
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);

    // Get course and QCMs
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const qcms = await this.qcmRepository.find({
      where: { courseId },
      order: { questionNumber: 'ASC' },
    });

    if (!qcms || qcms.length === 0) {
      throw new NotFoundException('No exam questions found for this course');
    }

    // Format QCMs for exam (without correct answers)
    return {
      courseId: course.id,
      courseTitle: course.title,
      examDuration: course.examDuration,
      examPassScore: course.examPassScore,
      questions: qcms.map((qcm, index) => ({
        id: qcm.id,
        questionNumber: index + 1,
        question: qcm.question,
        options: qcm.options,
        // Correct answer is not included in response
      })),
    };
  }

  async getCertificateForCourse(userId: number, courseId: number) {
    return this.certificateService.findExistingCertificate(userId, courseId);
  }

  async submitExam(userId: number, courseId: number, answers: { qcmId: number, answer: number }[]) {
    // Get the current exam attempt
    const examAttempt = await this.examAttemptRepository.findOne({
      where: {
        userId,
        courseId,
        isCompleted: false
      },
      order: { startedAt: 'DESC' }
    });

    if (!examAttempt) {
      throw new BadRequestException('No active exam attempt found. Please start the exam first.');
    }

    // Check if exam time has expired
    const now = new Date();
    const startTime = examAttempt.startedAt;
    if (!startTime) {
      throw new BadRequestException('Exam start time not recorded. Please start a new exam.');
    }

    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const timeElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000); // in seconds
    if (timeElapsed > course.examDuration * 60) {
      examAttempt.isCompleted = true;
      examAttempt.submittedAt = now;
      examAttempt.durationInSeconds = timeElapsed;
      await this.examAttemptRepository.save(examAttempt);
      throw new BadRequestException('Exam time has expired');
    }

    // Check if the exam is already submitted
    if (examAttempt.submittedAt) {
      throw new BadRequestException('This exam has already been submitted');
    }

    // Get all QCMs for this course
    const qcms = await this.qcmRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' }
    });

    if (qcms.length === 0) {
      throw new NotFoundException('No questions found for this course');
    }

    // Calculate score
    let correctAnswers = 0;
    const questionResults = [];

    for (const qcm of qcms) {
      const userAnswer = answers.find(a => a.qcmId === qcm.id);
      const isCorrect = userAnswer && userAnswer.answer === qcm.correctAnswer;
      
      if (isCorrect) {
        correctAnswers++;
      }
      
      // Add result for this question
      questionResults.push({
        qcmId: qcm.id,
        questionNumber: qcm.questionNumber,
        question: qcm.question,
        userAnswer: userAnswer ? userAnswer.answer : null,
        correctAnswer: qcm.correctAnswer,
        isCorrect: isCorrect,
        explanation: qcm.explanation || null
      });
    }

    const totalQuestions = qcms.length;
    const score = (correctAnswers / totalQuestions) * 100;
    const passed = score >= course.examPassScore;

    // Update exam attempt
    examAttempt.answers = answers;
    examAttempt.score = score;
    examAttempt.passed = passed;
    examAttempt.submittedAt = now;
    examAttempt.durationInSeconds = timeElapsed;
    examAttempt.isCompleted = true;

    // Save the attempt
    await this.examAttemptRepository.save(examAttempt);

    // Create user activity record
    const activity = this.userActivityRepository.create({
      userId,
      courseId,
      activityType: ActivityType.COMPLETE_EXAM,
      examId: examAttempt.id,
      timeSpentSeconds: timeElapsed
    });

    await this.userActivityRepository.save(activity);

    // If passed, update course progress
    if (passed) {
      await this.courseProgressService.updateCourseProgress(userId, courseId);
    }

    // Certificate handling - Check if a certificate already exists
    let certificate = null;
    if (passed) {
      try {
        // First check if user already has a certificate for this course
        certificate = await this.getCertificateForCourse(userId, courseId);
        
        // If no existing certificate, generate one
        if (!certificate) {
          this.logger.log(`Generating new certificate for userId ${userId}, courseId ${courseId}`);
          certificate = await this.certificateService.generateCertificate(userId, courseId, examAttempt.id);
        } else {
          this.logger.log(`Using existing certificate for userId ${userId}, courseId ${courseId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to handle certificate: ${error.message}`);
        // Continue without certificate
      }
    }

    // Return detailed result
    return {
      examId: examAttempt.id,
      score,
      passingScore: course.examPassScore,
      passed,
      correctAnswers,
      totalQuestions,
      durationInSeconds: timeElapsed,
      questionDetails: questionResults,
      certificate: certificate ? {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        pdfUrl: certificate.pdfUrl,
        issuedAt: certificate.issuedAt
      } : null
    };
  }

  async getExamResults(userId: number, courseId: number) {
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);

    // Get latest exam attempt
    const examAttempt = await this.examAttemptRepository.findOne({
      where: { userId, courseId },
      order: { createdAt: 'DESC' },
    });

    if (!examAttempt) {
      throw new NotFoundException('No exam attempts found for this course');
    }

    // Get course details for pass score
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    // Return results
    return {
      score: examAttempt.score,
      passScore: course.examPassScore,
      passed: examAttempt.passed,
      attemptDate: examAttempt.createdAt,
      answers: examAttempt.answers,
    };
  }

  async startExam(userId: number, courseId: number) {
    this.logger.log(`Starting exam for user ${userId} in course ${courseId}`);
    
    // Check enrollment
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get course
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // First, clean up any stale attempts that haven't been completed
    await this.examAttemptRepository.update(
      {
        userId,
        courseId,
        isCompleted: false
      },
      {
        isCompleted: true
      }
    );
    
    this.logger.log(`Cleaned up stale attempts for user ${userId} in course ${courseId}`);
    
    // Create new exam attempt
    const now = new Date();
    const examAttempt = this.examAttemptRepository.create({
      userId,
      courseId,
      startedAt: now,
      isCompleted: false
    });
    
    const savedAttempt = await this.examAttemptRepository.save(examAttempt);
    this.logger.log(`Created new exam attempt with ID ${savedAttempt.id} at ${savedAttempt.startedAt}`);
    
    // Record activity
    const activity = this.userActivityRepository.create({
      userId,
      courseId,
      examId: savedAttempt.id,
      activityType: ActivityType.START_EXAM
    });
    
    await this.userActivityRepository.save(activity);
    
    return {
      message: 'Exam started successfully',
      examId: savedAttempt.id,
      startedAt: savedAttempt.startedAt,
      examDuration: course.examDuration
    };
  }

  async getExamTimeRemaining(userId: number, courseId: number) {
    this.logger.log(`Getting exam time remaining for user ${userId} in course ${courseId}`);
    
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get course to check exam duration
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // Find active attempt - with simplified query
    const examAttempt = await this.examAttemptRepository.findOne({
      where: { 
        userId, 
        courseId, 
        isCompleted: false
      },
      order: { 
        createdAt: 'DESC' 
      }
    });
    
    this.logger.log(`Found exam attempt: ${JSON.stringify(examAttempt || 'No attempt found')}`);
    
    if (!examAttempt) {
      throw new NotFoundException('No active exam found. Please start the exam first.');
    }
    
    if (!examAttempt.startedAt) {
      // If we somehow have an attempt with no start time, fix it
      examAttempt.startedAt = new Date();
      await this.examAttemptRepository.save(examAttempt);
      this.logger.warn(`Fixed missing start time for exam attempt ${examAttempt.id}`);
    }
    
    const startTime = new Date(examAttempt.startedAt);
    const currentTime = new Date();
    const elapsedSeconds = (currentTime.getTime() - startTime.getTime()) / 1000;
    const remainingSeconds = Math.max(0, course.examDuration * 60 - elapsedSeconds);
    
    this.logger.log(`Time calculation: Started at ${startTime}, elapsed ${elapsedSeconds} seconds, remaining ${remainingSeconds} seconds`);
    
    // If time has expired, mark the attempt as completed
    if (remainingSeconds <= 0) {
      examAttempt.isCompleted = true;
      await this.examAttemptRepository.save(examAttempt);
      throw new BadRequestException('Exam time has expired');
    }
    
    return {
      attemptId: examAttempt.id,
      startedAt: examAttempt.startedAt,
      timeRemainingMinutes: Math.floor(remainingSeconds / 60),
      timeRemainingSeconds: Math.floor(remainingSeconds),
      examDuration: course.examDuration
    };
  }

  async getExamHistory(userId: number) {
    const examAttempts = await this.examAttemptRepository.find({
      where: { userId, isCompleted: true },
      relations: ['course'],
      order: { createdAt: 'DESC' }
    });

    // Get all relevant course IDs from attempts
    const courseIds = [...new Set(examAttempts.map(attempt => attempt.courseId))];
    
    // Get certificates for all these courses in one query
    const certificates = await this.certificateService.getUserCertificatesForCourses(userId, courseIds);

    // Map attempt data and add certificate information if available
    return Promise.all(examAttempts.map(async (attempt) => {
      const certificate = certificates.find(cert => cert.courseId === attempt.courseId);
      
      return {
        examId: attempt.id,
        courseId: attempt.courseId,
        courseTitle: attempt.course.title,
        score: attempt.score,
        passed: attempt.passed,
        attemptDate: attempt.createdAt,
        durationInSeconds: attempt.durationInSeconds,
        certificate: certificate ? {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          pdfUrl: certificate.pdfUrl,
          issuedAt: certificate.issuedAt
        } : null
      };
    }));
  }

  async getCourseExamHistory(userId: number, courseId: number) {
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);

    const examAttempts = await this.examAttemptRepository.find({
      where: { userId, courseId, isCompleted: true },
      order: { createdAt: 'DESC' }
    });

    // Get certificate for this course
    const certificate = await this.getCertificateForCourse(userId, courseId);

    return examAttempts.map(attempt => ({
      examId: attempt.id,
      score: attempt.score,
      passed: attempt.passed,
      attemptDate: attempt.createdAt,
      durationInSeconds: attempt.durationInSeconds,
      certificate: certificate && attempt.passed ? {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        pdfUrl: certificate.pdfUrl,
        issuedAt: certificate.issuedAt
      } : null
    }));
  }

  async getExamQuestions(userId: number, courseId: number) {
    // Check enrollment
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get active exam attempt
    const activeAttempt = await this.examAttemptRepository.findOne({
      where: {
        userId,
        courseId,
        isCompleted: false
      }
    });
    
    if (!activeAttempt) {
      throw new BadRequestException('No active exam. Please start an exam first.');
    }
    
    // Get course
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['qcms']
    });
    
    if (!course || !course.qcms || course.qcms.length === 0) {
      throw new NotFoundException('No questions found for this exam');
    }
    
    // Sort questions by orderIndex
    const sortedQuestions = course.qcms.sort((a, b) => a.orderIndex - b.orderIndex);
    
    // Return questions without correct answers
    return {
      examId: activeAttempt.id,
      startedAt: activeAttempt.startedAt,
      examDuration: course.examDuration,
      questions: sortedQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        questionNumber: q.questionNumber || q.orderIndex
      }))
    };
  }

  async getLatestPassingAttempt(userId: number, courseId: number) {
    return this.examAttemptRepository.findOne({
      where: {
        userId,
        courseId,
        passed: true,
        isCompleted: true
      },
      order: { submittedAt: 'DESC' }
    });
  }
} 