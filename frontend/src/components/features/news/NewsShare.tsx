'use client';

import { useEffect, useState } from 'react';
import { Check, Facebook, Link2, Send, Share2 } from 'lucide-react';
import { recordNewsShare } from '@/lib/api/news';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { newsUrl } from '@/lib/news';
import { toast } from '@/lib/toast';

/** X (Twitter) has no lucide icon in this version; a plain glyph keeps it recognisable. */
function XGlyph() {
  return <span className="text-sm font-bold leading-none">𝕏</span>;
}

export function NewsShare({ newsId, slug, headline }: { newsId: string; slug: string; headline: string }) {
  const { t } = useTranslation('news');
  const [url, setUrl] = useState('');
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // window is only available after mount; the server render has no share URL yet.
  useEffect(() => {
    setUrl(newsUrl(slug));
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, [slug]);

  const count = () => void recordNewsShare(newsId).catch(() => undefined);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(headline);

  const targets = [
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      icon: <Send className="h-4 w-4" />,
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <Facebook className="h-4 w-4" />,
    },
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      icon: <XGlyph />,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      count();
    } catch {
      toast.error(t('newsShare.couldNotCopyTheLink'));
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: headline, url });
      count();
    } catch {
      // user cancelled the share sheet
    }
  };

  const iconButton =
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-secondary-foreground transition hover:border-info/30 hover:text-info';

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-xs font-medium text-muted-foreground">
        {t('newsShare.share')}
      </span>
      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          className={iconButton}
          aria-label={t('newsShare.share')}
        >
          <Share2 className="h-4 w-4" />
        </button>
      )}
      {targets.map((target) => (
        <a
          key={target.label}
          href={url ? target.href : undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={count}
          className={iconButton}
          aria-label={`${t('newsShare.shareOn')} ${target.label}`}
          title={target.label}
        >
          {target.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        className={iconButton}
        aria-label={t('newsShare.copyLink')}
        title={t('newsShare.copyLink')}
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
