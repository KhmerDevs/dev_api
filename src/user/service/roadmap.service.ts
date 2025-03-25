import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roadmap } from '../../entities/roadmap.entity';

@Injectable()
export class RoadmapService {
  constructor(
    @InjectRepository(Roadmap)
    private roadmapRepository: Repository<Roadmap>,
  ) {}

  async getRoadmaps() {
    const roadmaps = await this.roadmapRepository.find({
      where: { published: true }, // Only return published roadmaps
      relations: ['category'],
      order: { createdAt: 'DESC' }
    });

    return roadmaps.map(roadmap => ({
      id: roadmap.id,
      title: roadmap.title,
      description: roadmap.description,
      numberOfStages: roadmap.numberOfStages,
      categoryId: roadmap.categoryId,
      category: roadmap.category?.name,
      imageUrl: roadmap.imageUrl
    }));
  }

  async getRoadmapById(id: number) {
    const roadmap = await this.roadmapRepository.findOne({
      where: { id, published: true }, // Only return published roadmaps
      relations: ['category']
    });

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    return {
      id: roadmap.id,
      title: roadmap.title,
      description: roadmap.description,
      numberOfStages: roadmap.numberOfStages,
      categoryId: roadmap.categoryId,
      category: roadmap.category?.name,
      imageUrl: roadmap.imageUrl
    };
  }

  async getRoadmapsByCategory(categoryId: number) {
    const roadmaps = await this.roadmapRepository.find({
      where: { categoryId, published: true }, // Only return published roadmaps
      relations: ['category'],
      order: { createdAt: 'DESC' }
    });

    return roadmaps.map(roadmap => ({
      id: roadmap.id,
      title: roadmap.title,
      description: roadmap.description,
      numberOfStages: roadmap.numberOfStages,
      categoryId: roadmap.categoryId,
      category: roadmap.category?.name,
      imageUrl: roadmap.imageUrl
    }));
  }
} 