import { BadRequestException, Injectable } from '@nestjs/common';
import AdmZip = require('adm-zip');
import { XMLParser } from 'fast-xml-parser';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** MinIO file reference returned to the frontend after upload. */
export interface ScormFileRef {
  url: string;
  key: string;
  name: string;
  size: number;
}

/** One SCORM `<item>` after recursive parsing. */
interface ScormItem {
  identifier: string;
  identifierref?: string;
  title: string;
  href?: string;
  children: ScormItem[];
}

/** One `<resource>` entry — maps identifierref → launch URL + files. */
interface ScormResource {
  id: string;
  href: string;
  type: string;
  files: string[];
}

/** Full `imsmanifest.xml` parsed into a normalized structure. */
interface ScormManifest {
  identifier: string;
  title: string;
  description: string;
  schema: string;
  schemaVersion: string;
  defaultOrgId: string;
  organizations: Array<{
    id: string;
    title: string;
    items: ScormItem[];
  }>;
  resources: ScormResource[];
}

/** Lesson shape that matches `CreateModuleDto → LessonDto` used by `PUT /courses/:id/curriculum`. */
export interface ScormPreviewLesson {
  title: string;
  content?: string;
  contentType: 'SCORM';
  durationMinutes?: number;
  order: number;
  resourceUrl?: string;
  subLessons: ScormPreviewLesson[];
}

/** Module shape that matches `CreateModuleDto` used by `PUT /courses/:id/curriculum`. */
export interface ScormPreviewModule {
  title: string;
  description?: string;
  order: number;
  lessons: ScormPreviewLesson[];
}

/** Course fields that match `CreateCourseBody` used by `POST /courses`. */
export interface ScormPreviewCourse {
  title: string;
  description: string;
  objectives: string;
  code: string;
}

/** Everything the frontend needs to pre-fill the manual creation wizard. */
export interface ScormPreview {
  scormFile: ScormFileRef;
  package: {
    title: string;
    description: string;
    identifier: string;
    schema: string;
    schemaVersion: string;
    organizationCount: number;
    resourceCount: number;
  };
  course: ScormPreviewCourse;
  curriculum: {
    modules: ScormPreviewModule[];
  };
  stats: {
    moduleCount: number;
    lessonCount: number;
    subLessonCount: number;
  };
}

/* ------------------------------------------------------------------ */
/*  XML helpers                                                        */
/* ------------------------------------------------------------------ */

/** Extracts text from a fast-xml-parser node (string, number, or `{ '#text': … }` object). */
function text(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if ('#text' in obj) return String(obj['#text']);
    if ('_' in obj) return String(obj['_']);
  }
  return '';
}

/** Ensures a value is always an array (fast-xml-parser returns objects for single children). */
function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Recursively parses `<item>` elements into a flat ScormItem tree. */
function parseItem(raw: any): ScormItem {
  const children = toArray(raw?.item).map(parseItem);
  return {
    identifier: text(raw?.['@_identifier']) || text(raw?.['@_id']) || '',
    identifierref: text(raw?.['@_identifierref']) || undefined,
    title: text(raw?.title) || text(raw?.['@_identifier']) || 'Untitled',
    children,
  };
}

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

@Injectable()
export class ScormService {
  /**
   * Parses a SCORM ZIP buffer: extracts `imsmanifest.xml`, reads organizations,
   * items, and resources, then maps the result to the exact structures the
   * manual creation flow uses (`CreateCourseBody` + `ReplaceModulesDto`).
   *
   * The returned preview lets the frontend pre-fill the same 4-step wizard:
   *   Course Detail → Objectives → Lessons → Assessment
   */
  buildPreview(buffer: Buffer, scormFile: ScormFileRef): ScormPreview {
    const { zip, manifest, manifestDir } = this.extractManifest(buffer);

    // Pick the default organization (or the first one).
    const org =
      manifest.organizations.find((o) => o.id === manifest.defaultOrgId) ??
      manifest.organizations[0];

    if (!org) {
      throw new BadRequestException('SCORM package contains no organizations');
    }

    // Resolver that reads the referenced HTML file for a lesson from the ZIP.
    const contentFor = (href: string | undefined): string | undefined =>
      href ? this.extractLessonContent(zip, manifestDir, href) : undefined;

    const title = manifest.title || org.title || manifest.identifier || 'Untitled Course';
    const description =
      manifest.description || this.deriveCourseDescription(zip, manifestDir, manifest);

    const { modules, lessonCount, subLessonCount } = this.buildCurriculum(
      org.items,
      manifest,
      contentFor,
      description,
    );

    return {
      scormFile,
      package: {
        title,
        description,
        identifier: manifest.identifier,
        schema: manifest.schema,
        schemaVersion: manifest.schemaVersion,
        organizationCount: manifest.organizations.length,
        resourceCount: manifest.resources.length,
      },
      course: {
        title,
        description,
        objectives: description,
        code: this.generateCourseCode(title),
      },
      curriculum: { modules },
      stats: {
        moduleCount: modules.length,
        lessonCount,
        subLessonCount,
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /*  ZIP + XML extraction                                             */
  /* ---------------------------------------------------------------- */

  private extractManifest(buffer: Buffer): {
    zip: AdmZip;
    manifest: ScormManifest;
    manifestDir: string;
  } {
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch (err) {
      throw new BadRequestException(
        `Uploaded file is not a valid ZIP archive: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // imsmanifest.xml can live at root or inside a sub-folder (common in Articulate/Rise).
    const entry =
      zip.getEntry('imsmanifest.xml') ??
      zip.getEntries().find((e) => !e.isDirectory && e.entryName.endsWith('imsmanifest.xml'));

    if (!entry) {
      throw new BadRequestException(
        'Not a valid SCORM package: imsmanifest.xml not found in the ZIP archive',
      );
    }

    const xml = entry.getData().toString('utf-8');
    const dirName = entry.entryName.substring(0, entry.entryName.lastIndexOf('/'));
    return { zip, manifest: this.parseManifestXml(xml), manifestDir: dirName };
  }

  private parseManifestXml(xml: string): ScormManifest {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      isArray: (name) => ['item', 'resource', 'organization', 'file'].includes(name),
    });

    let parsed: any;
    try {
      parsed = parser.parse(xml);
    } catch {
      throw new BadRequestException('Failed to parse SCORM manifest XML');
    }

    const root = parsed.manifest;
    if (!root) {
      throw new BadRequestException('Invalid SCORM manifest: <manifest> root element missing');
    }

    // ── metadata ──────────────────────────────────────────────
    const meta = root.metadata ?? {};
    const title = text(root.title) || text(meta.title) || '';
    const description = text(meta.description) || text(root.description) || '';

    // ── organizations ─────────────────────────────────────────
    const defaultOrgId = text(root.organizations?.['@_default']) || '';
    const orgsRaw = toArray(root.organizations?.organization);
    const organizations = orgsRaw.map((orgRaw: any) => ({
      id: text(orgRaw?.['@_identifier']) || '',
      title: text(orgRaw?.title) || text(orgRaw?.['@_identifier']) || 'Organization',
      items: toArray(orgRaw?.item).map(parseItem),
    }));

    // ── resources ─────────────────────────────────────────────
    const resourcesRaw = toArray(root.resources?.resource);
    const resources: ScormResource[] = resourcesRaw.map((r: any) => ({
      id: text(r?.['@_identifier']) || '',
      href: text(r?.['@_href']) || '',
      type: text(r?.['@_type']) || 'webcontent',
      files: toArray(r?.file)
        .map((f: any) => text(f?.['@_href']))
        .filter(Boolean),
    }));

    return {
      identifier: text(root['@_identifier']) || '',
      title,
      description,
      schema: text(meta.schema) || '',
      schemaVersion: text(meta.schemaversion) || '',
      defaultOrgId,
      organizations,
      resources,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Curriculum mapping (identical shapes to manual creation)         */
  /* ---------------------------------------------------------------- */

  /**
   * Maps SCORM `<item>` hierarchy → modules / lessons / sub-lessons
   * using the exact `CreateModuleDto` / `LessonDto` shapes.
   *
   * Mapping rules:
   *   • Multiple top-level items → each becomes a Module
   *   • Single top-level item    → its children become Lessons in one Module
   *   • Nested items (level 3+)  → sub-lessons (recursive)
   *   • Flat package (no nesting)→ single Module with one Lesson per item
   */
  private buildCurriculum(
    topItems: ScormItem[],
    manifest: ScormManifest,
    contentFor: (href: string | undefined) => string | undefined,
    courseDescription: string,
  ): { modules: ScormPreviewModule[]; lessonCount: number; subLessonCount: number } {
    let lessonCount = 0;
    let subLessonCount = 0;

    // Resolve identifierref → href from resources for resourceUrl.
    const hrefById = new Map<string, string>();
    for (const r of manifest.resources) {
      hrefById.set(r.id, r.href);
    }

    const resolveHref = (item: ScormItem): string | undefined => {
      if (item.identifierref) return hrefById.get(item.identifierref);
      return item.href;
    };

    // ── No items at all → single empty module ────────────────
    if (topItems.length === 0) {
      return {
        modules: [
          {
            title: 'Module 1',
            description: courseDescription || '',
            order: 1,
            lessons: [],
          },
        ],
        lessonCount: 0,
        subLessonCount: 0,
      };
    }

    // ── Single top-level item → treat its children as lessons ──
    const hasGrandchildren = topItems.some((i) => i.children.length > 0);

    if (topItems.length === 1 && topItems[0]!.children.length > 0) {
      const root = topItems[0]!;
      const lessons = root.children.map((child, idx) => {
        lessonCount++;
        const sub = this.buildSubLessons(child.children, resolveHref, contentFor);
        subLessonCount += sub.count;
        return this.toLesson(child, idx + 1, resolveHref, contentFor, sub.lessons);
      });

      return {
        modules: [
          {
            title: root.title,
            description: manifest.description || courseDescription || '',
            order: 1,
            lessons,
          },
        ],
        lessonCount,
        subLessonCount,
      };
    }

    // ── Multiple top-level items OR flat structure ───────────
    //
    // If every top-level item has children → each item is a Module,
    // its direct children are Lessons.
    //
    // If NO top-level item has children (flat) → single Module
    // with each item as a Lesson.
    const anyHasChildren = hasGrandchildren;
    const allHaveChildren = topItems.every((i) => i.children.length > 0);

    if (anyHasChildren && allHaveChildren) {
      // Hierarchical: items → modules, children → lessons
      const modules = topItems.map((mod, modIdx) => {
        const lessons = mod.children.map((child, lIdx) => {
          lessonCount++;
          const sub = this.buildSubLessons(child.children, resolveHref, contentFor);
          subLessonCount += sub.count;
          return this.toLesson(child, lIdx + 1, resolveHref, contentFor, sub.lessons);
        });

        return {
          title: mod.title,
          description: manifest.description || courseDescription || '',
          order: modIdx + 1,
          lessons,
        };
      });

      return { modules, lessonCount, subLessonCount };
    }

    // Flat: single module, each top-level item is a lesson
    const lessons = topItems.map((item, idx) => {
      lessonCount++;
      const sub = this.buildSubLessons(item.children, resolveHref, contentFor);
      subLessonCount += sub.count;
      return this.toLesson(item, idx + 1, resolveHref, contentFor, sub.lessons);
    });

    return {
      modules: [
        {
          title: topItems[0]!.title || manifest.title || 'Course Content',
          description: manifest.description || courseDescription || '',
          order: 1,
          lessons,
        },
      ],
      lessonCount,
      subLessonCount,
    };
  }

  /** Recursively builds sub-lessons from nested items (level 3+). */
  private buildSubLessons(
    items: ScormItem[],
    resolveHref: (item: ScormItem) => string | undefined,
    contentFor: (href: string | undefined) => string | undefined,
  ): { lessons: ScormPreviewLesson[]; count: number } {
    if (items.length === 0) return { lessons: [], count: 0 };

    let count = 0;
    const lessons = items.map((item, idx) => {
      count++;
      const sub = this.buildSubLessons(item.children, resolveHref, contentFor);
      count += sub.count;
      return this.toLesson(item, idx + 1, resolveHref, contentFor, sub.lessons);
    });

    return { lessons, count };
  }

  /** Converts a single ScormItem into a LessonDto-compatible shape. */
  private toLesson(
    item: ScormItem,
    order: number,
    resolveHref: (item: ScormItem) => string | undefined,
    contentFor: (href: string | undefined) => string | undefined,
    subLessons: ScormPreviewLesson[] = [],
  ): ScormPreviewLesson {
    const href = resolveHref(item);
    return {
      title: item.title || `Lesson ${order}`,
      content: contentFor(href),
      contentType: 'SCORM',
      order,
      resourceUrl: href,
      subLessons,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  HTML content extraction                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Resolves a resource href (relative to the manifest's folder) to a ZIP
   * entry, tolerating `./` prefixes, backslashes and leading `/`.
   */
  private resolveZipEntry(
    zip: AdmZip,
    manifestDir: string,
    href: string,
  ): { entryName: string; data: string } | undefined {
    let clean = href.split('#')[0]!.split('?')[0]!;
    if (!clean) return undefined;
    clean = clean.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
    if (!clean) return undefined;

    const candidate = manifestDir ? `${manifestDir}/${clean}` : clean;
    const exact = zip.getEntry(candidate);
    if (exact) {
      return { entryName: exact.entryName, data: exact.getData().toString('utf-8') };
    }
    const found = zip
      .getEntries()
      .find((e) => !e.isDirectory && e.entryName.replace(/^\.\//, '').endsWith(clean));
    if (found) {
      return { entryName: found.entryName, data: found.getData().toString('utf-8') };
    }
    return undefined;
  }

  /**
   * Extracts readable rich-text content from a lesson's launch HTML file
   * inside the SCORM package. Returns an HTML fragment suitable for a
   * rich-text editor (headings, paragraphs, lists are preserved; scripts,
   * styles and navigation are dropped).
   */
  private extractLessonContent(zip: AdmZip, manifestDir: string, href: string): string | undefined {
    const resolved = this.resolveZipEntry(zip, manifestDir, href);
    if (!resolved) return undefined;
    if (!/\.(html|htm)$/i.test(resolved.entryName)) return undefined;

    return this.htmlToRichContent(resolved.data);
  }

  /** Strips a full HTML document down to a clean rich-text fragment. */
  private htmlToRichContent(raw: string): string | undefined {
    let html = raw;

    // Drop scripts, styles, comments and the <head> entirely.
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    html = html.replace(/<(title|meta|link|head)[^>]*>[\s\S]*?<\/\1>/gi, '');
    // Self-closing head-less leftovers.
    html = html.replace(/<(title|meta|link)\b[^>]*\/?>/gi, '');

    // Extract the <body> if present.
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) html = bodyMatch[1];

    // Normalize headings into the editor's supported levels (h2/h3).
    html = html
      .replace(/<h([1-2])[^>]*>/gi, '<h2>')
      .replace(/<h[3-6][^>]*>/gi, '<h3>')
      .replace(/<\/h[1-2]>/gi, '</h2>')
      .replace(/<\/h[3-6]>/gi, '</h3>');

    // Keep a small allow-list of block/inline tags; drop every other tag
    // but preserve its inner text.
    const keep = new Set([
      'h2',
      'h3',
      'p',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'b',
      'i',
      'u',
      'br',
      'blockquote',
      'pre',
      'code',
    ]);
    let clean = html.replace(/<[^>]+>/g, (tag) => {
      const name = (tag.match(/^<\/?([a-zA-Z0-9]+)/) || [])[1]?.toLowerCase();
      if (name && keep.has(name)) return tag.replace(/\s+[^>]*>/g, '>');
      return '';
    });

    // Collapse blank runs and whitespace.
    clean = clean
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/ ?<br ?\/?> ?/g, '<br>')
      .replace(/ ?<\/(p|h2|h3|li|blockquote|pre)>/g, '</$1>');

    const trimmed = clean.trim();
    if (!trimmed) return undefined;
    return trimmed.length > 40000 ? `${trimmed.slice(0, 40000)}…` : trimmed;
  }

  /**
   * Derives a course description from the package's landing page when the
   * manifest does not declare one (common in tool-generated packages).
   */
  private deriveCourseDescription(
    zip: AdmZip,
    manifestDir: string,
    manifest: ScormManifest,
  ): string {
    const launch =
      manifest.resources.find((r) => /index\.(html|htm)$/i.test(r.href)) ?? manifest.resources[0];
    if (!launch) return '';

    const resolved = this.resolveZipEntry(zip, manifestDir, launch.href);
    if (!resolved || !/\.(html|htm)$/i.test(resolved.entryName)) return '';

    const html = resolved.data;
    const metaDescription =
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)/i)?.[1] ??
      html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)?.[1];
    if (metaDescription) return metaDescription.trim().slice(0, 500);

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch?.[1] ?? html;

    // Prefer the first real paragraph (skip badges/nav).
    const firstParagraph = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    const heading = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];

    const toText = (frag: string): string =>
      frag
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/<|>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const paragraphText = toText(firstParagraph ?? '');
    if (paragraphText.length >= 20) return paragraphText.slice(0, 500);

    const headingText = toText(heading ?? '');
    if (headingText) return headingText.slice(0, 500);

    const text = toText(body);
    const sentence = text.match(/[^.!?]+[.!?]+/)?.[0] ?? text.slice(0, 300);
    return sentence ? sentence.trim().slice(0, 500) : '';
  }

  /* ---------------------------------------------------------------- */
  /*  Course code generation                                           */
  /* ---------------------------------------------------------------- */

  private generateCourseCode(title: string): string {
    const slug = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 20);
    return slug.length >= 3 ? slug : `SCORM-${Date.now().toString(36).toUpperCase()}`;
  }
}
