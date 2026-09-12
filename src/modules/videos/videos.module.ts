import { Module } from '@nestjs/common';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { LikesController } from './likes/likes.controller';
import { LikesService } from './likes/likes.service';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({
  controllers: [VideosController, CommentsController, LikesController],
  providers: [VideosService, CommentsService, LikesService],
  exports: [VideosService],
})
export class VideosModule {}
