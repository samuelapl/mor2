import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { NewsService } from './news.service';
import { NEWS_MANAGE, NEWS_PUBLISH } from './news.constants';
import {
  AdminListNewsQueryDto,
  CreateNewsDto,
  FeatureNewsDto,
  ListCommentsQueryDto,
  ModerateNewsCommentDto,
  ReviewNewsDto,
  UpdateNewsDto,
  UpdateNewsImageDto,
  UploadNewsImageQueryDto,
} from './dto';

/**
 * Writing and publishing news. Routes open to both permissions do the finer
 * author/status checks in NewsService (see assertCanEdit).
 */
@ApiTags('news-admin')
@ApiBearerAuth()
@Controller('news/admin')
export class NewsAdminController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @Permissions(NEWS_MANAGE, NEWS_PUBLISH)
  @ApiOperation({ summary: 'List news in any status, with engagement stats' })
  list(@Query() query: AdminListNewsQueryDto) {
    return this.newsService.adminList(query);
  }

  @Get(':id')
  @Permissions(NEWS_MANAGE, NEWS_PUBLISH)
  @ApiOperation({ summary: 'Get a news post for editing' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.adminGet(id);
  }

  @Post()
  @Permissions(NEWS_MANAGE)
  @ApiOperation({ summary: 'Create a draft' })
  create(@Body() dto: CreateNewsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.newsService.create(user, dto);
  }

  @Patch(':id')
  @Permissions(NEWS_MANAGE, NEWS_PUBLISH)
  @ApiOperation({ summary: 'Update a post (authors: own DRAFT/REJECTED; publishers: any)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNewsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.newsService.update(user, id, dto);
  }

  @Delete(':id')
  @Permissions(NEWS_MANAGE, NEWS_PUBLISH)
  @ApiOperation({ summary: 'Soft-delete a post (authors: own DRAFT/REJECTED; publishers: any)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.newsService.remove(user, id);
  }

  // ── Images ───────────────────────────────────────────

  @Post(':id/images')
  @Permissions(NEWS_MANAGE, NEWS_PUBLISH)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Upload the cover (?cover=true) or a gallery image (JPEG/PNG/WebP)' })
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: UploadNewsImageQueryDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.newsService.uploadImage(user, id, file, Boolean(query.cover));
  }

  @Patch(':id/images/:imageId')
  @Permissions(NEWS_MANAGE, NEWS_PUBLISH)
  @ApiOperation({ summary: 'Update a gallery image caption or order' })
  updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateNewsImageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.newsService.updateImage(user, id, imageId, dto);
  }

  @Delete(':id/images/:imageId')
  @Permissions(NEWS_MANAGE, NEWS_PUBLISH)
  @ApiOperation({ summary: 'Delete a gallery image' })
  deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.newsService.deleteImage(user, id, imageId);
  }

  // ── Workflow ─────────────────────────────────────────

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Permissions(NEWS_MANAGE)
  @ApiOperation({ summary: 'Submit own DRAFT/REJECTED post for review' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.newsService.submit(user, id);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(NEWS_PUBLISH)
  @ApiOperation({ summary: 'Approve (publish) or reject a pending post — not your own' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewNewsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.newsService.review(user, id, dto);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @Permissions(NEWS_PUBLISH)
  @ApiOperation({ summary: 'Take a published post down (ARCHIVED)' })
  unpublish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.newsService.unpublish(user, id);
  }

  @Post(':id/republish')
  @HttpCode(HttpStatus.OK)
  @Permissions(NEWS_PUBLISH)
  @ApiOperation({ summary: 'Publish an archived post again' })
  republish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.newsService.republish(user, id);
  }

  @Patch(':id/feature')
  @Permissions(NEWS_PUBLISH)
  @ApiOperation({ summary: 'Feature or unfeature a published post (max 3 featured)' })
  feature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FeatureNewsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.newsService.setFeatured(user, id, dto.isFeatured);
  }

  // ── Comment moderation ───────────────────────────────

  @Get(':id/comments')
  @Permissions(NEWS_PUBLISH)
  @ApiOperation({ summary: 'List all comments on a post, including hidden ones' })
  listComments(@Param('id', ParseUUIDPipe) id: string, @Query() query: ListCommentsQueryDto) {
    return this.newsService.adminListComments(id, query);
  }

  @Patch(':id/comments/:commentId')
  @Permissions(NEWS_PUBLISH)
  @ApiOperation({ summary: 'Hide or unhide a comment' })
  moderateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: ModerateNewsCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.newsService.moderateComment(user, id, commentId, dto.isHidden);
  }

  @Delete(':id/comments/:commentId')
  @Permissions(NEWS_PUBLISH)
  @ApiOperation({ summary: 'Delete any comment' })
  deleteComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.newsService.adminDeleteComment(id, commentId);
  }
}
