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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, OptionalAuth, Public } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { NewsService } from './news.service';
import { NewsEngagementService } from './news-engagement.service';
import { NewsThrottlerGuard } from './news-throttler.guard';
import {
  CreateNewsCommentDto,
  ListCommentsQueryDto,
  ListNewsQueryDto,
  ReactToNewsDto,
} from './dto';

const ONE_MINUTE = 60_000;

/** Public news pages plus the reader interactions (reactions, comments) that need a login. */
@ApiTags('news')
@UseGuards(NewsThrottlerGuard)
@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly engagementService: NewsEngagementService,
  ) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: 'List published news (featured first, then newest)' })
  list(@Query() query: ListNewsQueryDto, @CurrentUser() user?: AuthenticatedUser | null) {
    return this.newsService.listPublished(query, user?.id);
  }

  // Declared before ':slug' so "featured" is not read as a slug.
  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Up to 3 featured (else latest) posts for the landing page' })
  featured() {
    return this.newsService.listFeatured();
  }

  @Get(':slug')
  @OptionalAuth()
  @ApiOperation({ summary: 'Get a published news post by slug' })
  getBySlug(@Param('slug') slug: string, @CurrentUser() user?: AuthenticatedUser | null) {
    return this.newsService.getPublishedBySlug(slug, user?.id);
  }

  @Post(':id/view')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: ONE_MINUTE } })
  @ApiOperation({ summary: 'Count a view' })
  async view(@Param('id', ParseUUIDPipe) id: string) {
    await this.engagementService.recordView(id);
  }

  @Post(':id/share')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: ONE_MINUTE } })
  @ApiOperation({ summary: 'Count a share' })
  async share(@Param('id', ParseUUIDPipe) id: string) {
    await this.engagementService.recordShare(id);
  }

  @Put(':id/reaction')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 30, ttl: ONE_MINUTE } })
  @ApiOperation({ summary: 'Like or dislike; sending your current reaction again removes it' })
  react(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReactToNewsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.engagementService.react(user.id, id, dto.type);
  }

  @Delete(':id/reaction')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 30, ttl: ONE_MINUTE } })
  @ApiOperation({ summary: 'Remove your reaction' })
  removeReaction(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.engagementService.removeReaction(user.id, id);
  }

  @Get(':id/comments')
  @OptionalAuth()
  @ApiOperation({ summary: 'List visible comments (oldest first)' })
  listComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListCommentsQueryDto,
    @CurrentUser() user?: AuthenticatedUser | null,
  ) {
    return this.engagementService.listComments(id, query, user?.id);
  }

  @Post(':id/comments')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: ONE_MINUTE } })
  @ApiOperation({ summary: 'Add a comment' })
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNewsCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.engagementService.addComment(user.id, id, dto.content);
  }

  @Patch(':id/comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit your own comment' })
  updateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: CreateNewsCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.engagementService.updateOwnComment(user.id, id, commentId, dto.content);
  }

  @Delete(':id/comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete your own comment' })
  deleteComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.engagementService.deleteOwnComment(user.id, id, commentId);
  }
}
