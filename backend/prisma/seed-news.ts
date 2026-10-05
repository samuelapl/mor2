/**
 * Demo news for the public news pages and the /news-management workflow.
 *
 * Creates 15 posts (mostly Amharic, some English — shown exactly as written):
 *   • 11 PUBLISHED (2 featured) with likes, dislikes and comments (one comment hidden)
 *   • 1 ARCHIVED, 1 PENDING_REVIEW, 1 DRAFT, 1 REJECTED — one per admin tab
 * Covers come from prisma/seed-assets/news and are uploaded to MinIO.
 *
 * Re-runnable: posts are matched by headline and their reactions/comments are rebuilt, so
 * running it again refreshes the demo data instead of duplicating it. Publish dates are
 * relative to "now" so the feed always looks current. No notifications are sent.
 *
 * Run: npm run seed:news (or npx ts-node prisma/seed-news.ts)
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NewsCategory, NewsReactionType, NewsStatus, PrismaClient, RoleName } from '@prisma/client';
import { Client } from 'minio';
import { v4 as uuid } from 'uuid';
import { slugCandidates, slugForId } from '../src/modules/news/news-slug.util';

const prisma = new PrismaClient();

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = process.env.MINIO_PORT || '9000';
const BUCKET = process.env.MINIO_BUCKET || 'eltms-files';
const minio = new Client({
  endPoint: MINIO_ENDPOINT,
  port: parseInt(MINIO_PORT, 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const ASSETS = join(__dirname, 'seed-assets', 'news');
const DAY = 24 * 60 * 60 * 1000;

type Cover =
  | 'press-1'
  | 'press-2'
  | 'announce-1'
  | 'announce-2'
  | 'event-1'
  | 'event-2'
  | 'notice-1'
  | 'notice-2';

interface SeedComment {
  /** Email of a demo account; skipped when that account does not exist. */
  by: string;
  content: string;
  hidden?: boolean;
}

interface SeedNews {
  headline: string;
  content: string;
  summary?: string;
  category: NewsCategory;
  cover: Cover | null;
  status: NewsStatus;
  daysAgo: number;
  featured?: boolean;
  allowComments?: boolean;
  rejectionReason?: string;
  likes?: number;
  dislikes?: number;
  views?: number;
  shares?: number;
  comments?: SeedComment[];
}

const NEWS: SeedNews[] = [
  {
    headline: 'የገቢዎች ሚኒስቴር የሩብ ዓመት የገቢ አፈጻጸሙን ገመገመ',
    category: NewsCategory.PRESS_RELEASE,
    cover: 'press-1',
    status: NewsStatus.PUBLISHED,
    daysAgo: 2,
    featured: true,
    likes: 9,
    dislikes: 1,
    views: 412,
    shares: 37,
    content: `<p>የገቢዎች ሚኒስቴር የበጀት ዓመቱን የመጀመሪያ ሩብ ዓመት የገቢ አሰባሰብ አፈጻጸም ከዋና መሥሪያ ቤትና ከቅርንጫፍ ጽሕፈት ቤቶች አመራሮች ጋር ገምግሟል።</p>
<p>በግምገማው ላይ የግብር ከፋዮችን አገልግሎት ማሻሻል፣ የኤሌክትሮኒክ ግብር አከፋፈልን ማስፋፋት እና የታክስ ሕግ ተገዢነትን ማሳደግ በቀጣይ ትኩረት የሚሰጣቸው ጉዳዮች መሆናቸው ተገልጿል።</p>
<h3>ቀጣይ የትኩረት አቅጣጫዎች</h3>
<ul>
<li>የኤሌክትሮኒክ የግብር ማስታወቂያና ክፍያ ተጠቃሚዎችን ቁጥር ማሳደግ</li>
<li>የታክስ ኦዲት ጥራትንና ሽፋንን ማሻሻል</li>
<li>የሠራተኞችን አቅም በተከታታይ ስልጠና መገንባት</li>
</ul>
<p>ሚኒስቴሩ ግብር ከፋዩ ማኅበረሰብ ግዴታውን በወቅቱ በመወጣት ለሀገር ልማት ላደረገው አስተዋጽኦ ምስጋናውን አቅርቧል።</p>`,
    comments: [
      { by: 'learner@gmail.com', content: 'ጥሩ ግምገማ ነው። የኤሌክትሮኒክ አገልግሎቱ መስፋፋቱ ለሁላችንም ይጠቅማል።' },
      { by: 'trainer@gmail.com', content: 'የሠራተኞች ስልጠና ላይ ትኩረት መሰጠቱ የሚበረታታ ነው።' },
      { by: 'owner@gmail.com', content: 'Great to see the focus on digital services.' },
    ],
  },
  {
    headline: 'የኤሌክትሮኒክ የግብር ማስታወቂያና ክፍያ አገልግሎት ለሁሉም ግብር ከፋዮች ተደራሽ ሆነ',
    category: NewsCategory.ANNOUNCEMENT,
    cover: 'announce-1',
    status: NewsStatus.PUBLISHED,
    daysAgo: 5,
    featured: true,
    likes: 8,
    views: 655,
    shares: 81,
    summary: 'ግብር ከፋዮች ወደ ቢሮ መሄድ ሳያስፈልጋቸው የግብር ማስታወቂያቸውን በኦንላይን ማቅረብና ክፍያቸውን በባንክ መፈጸም ይችላሉ።',
    content: `<p>ሚኒስቴሩ የኤሌክትሮኒክ የግብር ማስታወቂያና ክፍያ አገልግሎቱን ለሁሉም የግብር ከፋይ ደረጃዎች ተደራሽ አድርጓል። ግብር ከፋዮች ወደ ቢሮ መሄድ ሳያስፈልጋቸው ማስታወቂያቸውን በኦንላይን ማቅረብ ይችላሉ።</p>
<h3>አገልግሎቱን ለመጠቀም</h3>
<ol>
<li>የግብር ከፋይ መለያ ቁጥርዎን (TIN) ይዘው በአቅራቢያዎ ወደሚገኘው ቅርንጫፍ ጽሕፈት ቤት በመሄድ ይመዝገቡ</li>
<li>የተሰጠዎትን የመግቢያ መረጃ በመጠቀም ወደ ሥርዓቱ ይግቡ</li>
<li>ማስታወቂያዎን ያቅርቡ፤ ክፍያውን በተመረጡ ባንኮች በኩል ይፈጽሙ</li>
</ol>
<p>ለተጨማሪ መረጃ በአቅራቢያዎ የሚገኘውን የሚኒስቴሩን ቅርንጫፍ ጽሕፈት ቤት ያነጋግሩ።</p>`,
    comments: [
      { by: 'learner@gmail.com', content: 'በጣም ጠቃሚ አገልግሎት ነው፤ ጊዜ ይቆጥባል።' },
      { by: 'approver@gmail.com', content: 'ምዝገባው ስንት ቀን ይወስዳል?' },
      { by: 'trainer@gmail.com', content: 'ይህ አስተያየት ለሙከራ የተደበቀ ነው።', hidden: true },
    ],
  },
  {
    headline: 'Ministry of Revenues trains branch staff on risk-based tax audit',
    category: NewsCategory.EVENT,
    cover: 'event-1',
    status: NewsStatus.PUBLISHED,
    daysAgo: 9,
    likes: 6,
    views: 230,
    shares: 12,
    content: `<p>The Ministry of Revenues has completed a five-day training programme on risk-based tax audit for auditors drawn from its branch offices across the country.</p>
<p>The programme combined classroom sessions at the head office with self-paced modules on the Ministry's e-learning platform, allowing participants to continue their studies after returning to their branches.</p>
<h3>Topics covered</h3>
<ul>
<li>Selecting audit cases using risk indicators</li>
<li>Planning and documenting desk and field audits</li>
<li>Using third-party data to verify declarations</li>
<li>Communicating audit findings to taxpayers</li>
</ul>
<p>Participants who completed the final assessment received certificates through the e-learning platform.</p>`,
    comments: [
      {
        by: 'learner@gmail.com',
        content: 'The online modules were very helpful. Looking forward to the next session.',
      },
    ],
  },
  {
    headline: 'የወርሃዊ የተጨማሪ እሴት ታክስ ማስታወቂያ ማቅረቢያ ጊዜን በተመለከተ ማሳሰቢያ',
    category: NewsCategory.NOTICE,
    cover: 'notice-1',
    status: NewsStatus.PUBLISHED,
    daysAgo: 12,
    allowComments: false,
    likes: 4,
    dislikes: 1,
    views: 389,
    shares: 45,
    content: `<p>ለተጨማሪ እሴት ታክስ የተመዘገቡ ግብር ከፋዮች ወርሃዊ ማስታወቂያቸውን በሕጉ በተቀመጠው የጊዜ ገደብ ውስጥ እንዲያቀርቡና ክፍያቸውን እንዲፈጽሙ ሚኒስቴሩ ያሳስባል።</p>
<p>ማስታወቂያውን በወቅቱ አለማቅረብ ወይም ክፍያውን አለመፈጸም በሕጉ መሠረት ቅጣትና ወለድ ያስከትላል።</p>
<blockquote>ማስታወቂያዎን ወደ ቢሮ ሳይመጡ በኤሌክትሮኒክ የግብር አገልግሎት ማቅረብ ይችላሉ።</blockquote>`,
  },
  {
    headline: 'ታማኝ ግብር ከፋዮች ዕውቅና ተሰጣቸው',
    category: NewsCategory.PRESS_RELEASE,
    cover: 'press-2',
    status: NewsStatus.PUBLISHED,
    daysAgo: 16,
    likes: 7,
    views: 301,
    shares: 29,
    content: `<p>የገቢዎች ሚኒስቴር የግብር ግዴታቸውን በታማኝነትና በወቅቱ ለተወጡ ግብር ከፋዮች ዓመታዊ የዕውቅና መርሐ ግብር አካሂዷል።</p>
<p>ዕውቅናው ከፍተኛ፣ መካከለኛና አነስተኛ ግብር ከፋዮችን ያካተተ ሲሆን፣ ተሸላሚዎቹ ትክክለኛ ሂሳብ በመያዝ፣ ማስታወቂያቸውን በወቅቱ በማቅረብና ደረሰኝ በአግባቡ በመስጠት አርአያ መሆናቸው ተገልጿል።</p>
<p>ሚኒስቴሩ ሌሎች ግብር ከፋዮችም የዕውቅና ተሸላሚዎቹን ፈለግ እንዲከተሉ ጥሪ አቅርቧል።</p>`,
    comments: [{ by: 'owner@gmail.com', content: 'እንኳን ደስ አላችሁ! ለሌሎችም አርአያ ናችሁ።' }],
  },
  {
    headline: 'New e-learning courses now available for tax officers',
    category: NewsCategory.ANNOUNCEMENT,
    cover: 'announce-2',
    status: NewsStatus.PUBLISHED,
    daysAgo: 20,
    likes: 5,
    views: 274,
    shares: 18,
    content: `<p>New self-paced courses are now open to Ministry staff on the e-learning platform. Each course includes module quizzes and a final assessment, and successful learners receive a verifiable certificate.</p>
<h3>Now available</h3>
<ul>
<li>Ethiopian tax system fundamentals and digital filing</li>
<li>Tax audit techniques</li>
<li>Cybersecurity awareness for public servants</li>
<li>Ethics in public service</li>
</ul>
<p>Open <strong>Available Courses</strong> from your dashboard to enrol.</p>`,
    comments: [
      {
        by: 'learner@gmail.com',
        content: 'Already enrolled in the tax system course — very practical.',
      },
      { by: 'trainer@gmail.com', content: 'Please add more Amharic-language modules.' },
    ],
  },
  {
    headline: 'የግብር ንቅናቄ ሳምንት በትምህርት ቤቶች ተከበረ',
    category: NewsCategory.EVENT,
    cover: 'event-2',
    status: NewsStatus.PUBLISHED,
    daysAgo: 25,
    likes: 5,
    views: 198,
    shares: 22,
    content: `<p>ሚኒስቴሩ የግብርን ጠቀሜታ ለወጣቱ ትውልድ ለማስተዋወቅ በተለያዩ ትምህርት ቤቶች የግብር ንቅናቄ ሳምንት አክብሯል።</p>
<p>በሳምንቱ ውስጥ ተማሪዎች በግብርና በሀገር ልማት መካከል ስላለው ትስስር ውይይት ያደረጉ ሲሆን፣ የጥያቄና መልስ ውድድሮችና የጽሑፍ ውድድሮችም ተካሂደዋል።</p>
<p>ግንዛቤ ማስጨበጫ ሥራው በቀጣይም በሌሎች ትምህርት ቤቶች እንደሚቀጥል ተገልጿል።</p>`,
  },
  {
    headline: 'የግብር ከፋይ መለያ ቁጥር (TIN) መረጃ ማደሻ ማሳሰቢያ',
    category: NewsCategory.NOTICE,
    cover: 'notice-2',
    status: NewsStatus.PUBLISHED,
    daysAgo: 30,
    likes: 3,
    views: 260,
    shares: 31,
    content: `<p>ግብር ከፋዮች የአድራሻ፣ የስልክ ቁጥርና የኢሜይል መረጃቸው ሲቀየር በአቅራቢያቸው በሚገኝ የሚኒስቴሩ ቅርንጫፍ ጽሕፈት ቤት በማቅረብ እንዲያሳድሱ ይጠየቃሉ።</p>
<p>ትክክለኛ የመገናኛ መረጃ መያዝ ከሚኒስቴሩ የሚላኩ ማሳሰቢያዎችና ደብዳቤዎች በወቅቱ እንዲደርሱዎ ያደርጋል።</p>`,
  },
  {
    headline: 'Ministry and development partners review progress on tax administration reform',
    category: NewsCategory.PRESS_RELEASE,
    cover: 'press-1',
    status: NewsStatus.PUBLISHED,
    daysAgo: 38,
    likes: 4,
    views: 176,
    shares: 9,
    content: `<p>The Ministry of Revenues held a joint review meeting with its development partners on the progress of the ongoing tax administration reform programme.</p>
<p>The meeting assessed work on digital taxpayer services, data-driven compliance management and staff capacity building, and agreed on priorities for the coming period.</p>
<p>The Ministry thanked its partners for their continued technical support.</p>`,
  },
  {
    headline: 'የግብር ከፋዮች የቅሬታ አቀራረብ ሥርዓት ተሻሻለ',
    category: NewsCategory.ANNOUNCEMENT,
    cover: 'announce-1',
    status: NewsStatus.PUBLISHED,
    daysAgo: 45,
    likes: 3,
    views: 143,
    shares: 7,
    content: `<p>ሚኒስቴሩ ግብር ከፋዮች ቅሬታቸውን የሚያቀርቡበትን ሥርዓት አሻሽሏል። ቅሬታዎች በቅርንጫፍ ጽሕፈት ቤቶች የደንበኞች አገልግሎት ክፍሎች ወይም በጽሑፍ መቅረብ ይችላሉ።</p>
<p>እያንዳንዱ ቅሬታ ተመዝግቦ በተቀመጠው የአገልግሎት ደረጃ መሠረት ምላሽ ይሰጠዋል።</p>`,
  },
  {
    headline: 'የሚኒስቴሩ ሠራተኞች በበጎ ፈቃድ የደም ልገሳ መርሐ ግብር ተሳተፉ',
    category: NewsCategory.EVENT,
    cover: 'event-1',
    status: NewsStatus.PUBLISHED,
    daysAgo: 52,
    likes: 6,
    views: 120,
    shares: 5,
    content: `<p>የገቢዎች ሚኒስቴር ሠራተኞች በዋና መሥሪያ ቤቱ በተዘጋጀ የበጎ ፈቃድ የደም ልገሳ መርሐ ግብር ተሳትፈዋል።</p>
<p>መርሐ ግብሩ የሠራተኞችን ማኅበራዊ ኃላፊነት ለማጠናከር የሚካሄዱ ተግባራት አካል መሆኑ ተገልጿል።</p>`,
  },
  {
    headline: 'የበዓል ቀናት የሥራ ሰዓት ማሳሰቢያ',
    category: NewsCategory.NOTICE,
    cover: 'notice-2',
    status: NewsStatus.ARCHIVED,
    daysAgo: 70,
    likes: 2,
    views: 95,
    content: `<p>በበዓል ቀናት የሚኒስቴሩ ቅርንጫፍ ጽሕፈት ቤቶች ዝግ እንደሚሆኑና አገልግሎቱ ከበዓሉ ማግስት ጀምሮ በመደበኛ ሰዓት እንደሚቀጥል እናሳውቃለን።</p>`,
  },
  {
    headline: 'የግብር ከፋዮች የምክክር መድረክ በክልል ከተሞች ይካሄዳል',
    category: NewsCategory.EVENT,
    cover: 'announce-2',
    status: NewsStatus.PENDING_REVIEW,
    daysAgo: 1,
    content: `<p>ሚኒስቴሩ ከግብር ከፋዮች ጋር በአገልግሎት አሰጣጥና በታክስ ሕጎች አፈጻጸም ዙሪያ ለመወያየት በተለያዩ የክልል ከተሞች የምክክር መድረኮችን ያዘጋጃል።</p>`,
  },
  {
    headline: 'Year-end closing procedures for branch offices',
    category: NewsCategory.NOTICE,
    cover: null,
    status: NewsStatus.DRAFT,
    daysAgo: 0,
    content: `<p>Branch offices should complete reconciliation of collections and submit their year-end reports to the head office before the closing date.</p>`,
  },
  {
    headline: 'አዲሱ የደረሰኝ አጠቃቀም መመሪያ ተግባራዊ ይሆናል',
    category: NewsCategory.ANNOUNCEMENT,
    cover: 'notice-1',
    status: NewsStatus.REJECTED,
    daysAgo: 3,
    rejectionReason: 'የመመሪያውን ቁጥርና የሚጸናበትን ቀን ያክሉ።',
    content: `<p>ሚኒስቴሩ የደረሰኝ አጠቃቀምን የሚመለከት አዲስ መመሪያ ተግባራዊ ያደርጋል። ዝርዝሩ በቅርቡ ይፋ ይሆናል።</p>`,
  },
];

async function uploadCover(newsId: string, cover: Cover): Promise<string> {
  const key = `news/${newsId}/seed-${cover}.jpg`;
  const buffer = readFileSync(join(ASSETS, `${cover}.jpg`));
  await minio.putObject(BUCKET, key, buffer, buffer.length, { 'Content-Type': 'image/jpeg' });
  return `http://${MINIO_ENDPOINT}:${MINIO_PORT}/${BUCKET}/${key}`;
}

async function main() {
  console.log('🌱 Seeding news...');

  const author =
    (await prisma.user.findUnique({ where: { email: 'sadministrator@gmail.com' } })) ??
    (await prisma.user.findFirst({
      where: { roles: { some: { role: RoleName.SYSTEM_ADMIN } }, deletedAt: null },
    }));
  if (!author)
    throw new Error('No system admin found — run the main seed first (npm run prisma:seed).');

  if (!(await minio.bucketExists(BUCKET))) await minio.makeBucket(BUCKET);

  // Stable order so reruns give each post the same reactors.
  const reactors = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null, registrationStatus: 'APPROVED' },
    orderBy: { email: 'asc' },
    select: { id: true },
  });
  const commenters = new Map(
    (
      await prisma.user.findMany({
        where: {
          email: { in: [...new Set(NEWS.flatMap((n) => n.comments?.map((c) => c.by) ?? []))] },
        },
        select: { id: true, email: true },
      })
    ).map((u) => [u.email, u.id]),
  );

  const now = Date.now();
  for (const item of NEWS) {
    const date = new Date(now - item.daysAgo * DAY);
    const isLive = item.status === NewsStatus.PUBLISHED || item.status === NewsStatus.ARCHIVED;
    const reviewed = isLive || item.status === NewsStatus.REJECTED;

    const data = {
      headline: item.headline,
      summary: item.summary ?? null,
      content: item.content,
      category: item.category,
      status: item.status,
      isFeatured: Boolean(item.featured),
      allowComments: item.allowComments ?? true,
      rejectionReason: item.rejectionReason ?? null,
      publishedAt: isLive ? date : null,
      eventDate: item.category === NewsCategory.EVENT ? date : null,
      viewCount: item.views ?? 0,
      shareCount: item.shares ?? 0,
      updatedById: author.id,
      reviewedById: reviewed ? author.id : null,
      reviewedAt: reviewed ? date : null,
      deletedAt: null,
    };
    const existing = await prisma.news.findFirst({
      where: { headline: item.headline, createdById: author.id },
    });
    let news;
    if (existing) {
      news = await prisma.news.update({ where: { id: existing.id }, data });
    } else {
      // Same slug rule as the app: first 5 characters of the id, longer only on a clash.
      const id = uuid();
      const taken = await prisma.news.findMany({
        where: { slug: { in: slugCandidates(id) } },
        select: { slug: true },
      });
      const slug = slugForId(
        id,
        taken.map((t) => t.slug),
      );
      news = await prisma.news.create({
        data: { ...data, id, slug, createdById: author.id, createdAt: date },
      });
    }

    const coverImageUrl = item.cover ? await uploadCover(news.id, item.cover) : null;
    await prisma.news.update({ where: { id: news.id }, data: { coverImageUrl } });

    // Rebuild engagement from scratch on every run.
    await prisma.newsReaction.deleteMany({ where: { newsId: news.id } });
    await prisma.newsComment.deleteMany({ where: { newsId: news.id } });

    const likes = Math.min(item.likes ?? 0, reactors.length);
    const dislikes = Math.min(item.dislikes ?? 0, reactors.length - likes);
    const reactions = [
      ...reactors.slice(0, likes).map((u) => ({ userId: u.id, type: NewsReactionType.LIKE })),
      ...reactors
        .slice(likes, likes + dislikes)
        .map((u) => ({ userId: u.id, type: NewsReactionType.DISLIKE })),
    ];
    if (reactions.length) {
      await prisma.newsReaction.createMany({
        data: reactions.map((r) => ({ ...r, newsId: news.id })),
      });
    }

    let minutes = 30;
    for (const comment of item.comments ?? []) {
      const userId = commenters.get(comment.by);
      if (!userId) continue;
      await prisma.newsComment.create({
        data: {
          newsId: news.id,
          userId,
          content: comment.content,
          isHidden: Boolean(comment.hidden),
          hiddenById: comment.hidden ? author.id : null,
          createdAt: new Date(date.getTime() + minutes * 60 * 1000),
        },
      });
      minutes += 45;
    }

    console.log(
      `  ✓ ${item.status.padEnd(14)} ${item.featured ? '★' : ' '} ${item.headline.slice(0, 60)}`,
    );
  }

  console.log(`\n✅ Seeded ${NEWS.length} news posts (author: ${author.email}).`);
  console.log('   Public pages: /news   •   Admin: /news-management');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding news:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
