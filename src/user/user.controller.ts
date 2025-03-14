import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserGuard } from '../auth/guards/user.guard';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { IsArray, IsNotEmpty, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsNotEmpty()
  qcmId: number;

  @IsNotEmpty()
  answer: number;
}

class SubmitExamDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one answer is required' })
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

@Controller('user')
@UseGuards(JwtAuthGuard, UserGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Req() req) {
    return this.userService.getProfile(req.user.id);
  }

  @Get('courses')
  getEnrolledCourses(@Req() req) {
    return this.userService.getEnrolledCourses(req.user.id);
  }

  @Post('enroll')
  enrollCourse(@Req() req, @Body() enrollCourseDto: EnrollCourseDto) {
    return this.userService.enrollCourse(req.user.id, enrollCourseDto.courseId);
  }

  @Get('courses/:courseId')
  getCourseDetails(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.getCourseDetails(req.user.id, courseId);
  }

  @Get('courses/:courseId/exam')
  getExam(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.getExam(req.user.id, courseId);
  }

  @Post('courses/:courseId/exam/submit')
  submitExam(
    @Req() req, 
    @Param('courseId') courseId: number,
    @Body() submitExamDto: SubmitExamDto
  ) {
    return this.userService.submitExam(req.user.id, courseId, submitExamDto.answers);
  }
  
  @Get('courses/:courseId/exam/results')
  getExamResults(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.getExamResults(req.user.id, courseId);
  }

  @Post('courses/:courseId/exam/start')
  startExam(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.startExam(req.user.id, courseId);
  }

  @Get('courses/:courseId/exam/time-remaining')
  getExamTimeRemaining(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.getExamTimeRemaining(req.user.id, courseId);
  }

  @Get('exam-history')
  getExamHistory(@Req() req) {
    return this.userService.getExamHistory(req.user.id);
  }

  @Get('courses/:courseId/exam-history')
  getCourseExamHistory(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.getCourseExamHistory(req.user.id, courseId);
  }
} 