import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roadmap } from '../../entities/roadmap.entity';
import { CourseCategory } from '../../entities/course_category.entity';
import { CreateRoadmapDto } from '../dto/roadmap/create-roadmap.dto';

@Injectable()
export class RoadmapAdminService {
  constructor(
    @InjectRepository(Roadmap)
    private roadmapRepository: Repository<Roadmap>,
    @InjectRepository(CourseCategory)
    private courseCategoryRepository: Repository<CourseCategory>,
  ) {}

  async createRoadmap(createRoadmapDto: CreateRoadmapDto) {
    // Validate category exists if provided
    if (createRoadmapDto.categoryId) {
      const category = await this.courseCategoryRepository.findOne({
        where: { id: createRoadmapDto.categoryId }
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${createRoadmapDto.categoryId} not found`);
      }
    }

    const roadmap = this.roadmapRepository.create({
      ...createRoadmapDto,
      published: false // Default to unpublished
    });

    return this.roadmapRepository.save(roadmap);
  }

  async getAllRoadmaps() {
    return this.roadmapRepository.find({
      relations: ['category'],
      order: { createdAt: 'DESC' }
    });
  }

  async getRoadmap(id: number) {
    const roadmap = await this.roadmapRepository.findOne({
      where: { id },
      relations: ['category']
    });

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    return roadmap;
  }

  async updateRoadmap(id: number, updateRoadmapDto: CreateRoadmapDto) {
    const roadmap = await this.roadmapRepository.findOne({
      where: { id }
    });

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    // Validate category exists if provided
    if (updateRoadmapDto.categoryId) {
      const category = await this.courseCategoryRepository.findOne({
        where: { id: updateRoadmapDto.categoryId }
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${updateRoadmapDto.categoryId} not found`);
      }
    }

    await this.roadmapRepository.update(id, updateRoadmapDto);
    return this.getRoadmap(id);
  }

  async deleteRoadmap(id: number) {
    const roadmap = await this.roadmapRepository.findOne({
      where: { id }
    });

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    await this.roadmapRepository.remove(roadmap);
    return { message: 'Roadmap deleted successfully' };
  }

  async saveRoadmapImageUrl(id: number, imageUrl: string) {
    const roadmap = await this.roadmapRepository.findOne({
      where: { id }
    });
    
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    await this.roadmapRepository.update(id, { imageUrl });
    return this.getRoadmap(id);
  }

  async publishRoadmap(id: number) {
    const roadmap = await this.roadmapRepository.findOne({
      where: { id }
    });

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    roadmap.published = !roadmap.published;
    await this.roadmapRepository.save(roadmap);

    return {
      id: roadmap.id,
      published: roadmap.published,
      message: roadmap.published ? 'Roadmap published successfully' : 'Roadmap unpublished'
    };
  }
} 