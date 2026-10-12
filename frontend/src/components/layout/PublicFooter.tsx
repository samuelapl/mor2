'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Clock,
  HelpCircle,
  Lock,
  Mail,
  MapPin,
  Monitor,
  Newspaper,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLandingConfig } from '@/hooks/useLandingConfig';

/** Compact enterprise footer branded with Ministry of Revenues colors and dynamic content. */
export default function PublicFooter() {
  const { t } = useTranslation('common');
  const { config, resolveText } = useLandingConfig();

  const footerLinks = (config.footer?.links || [])
    .filter((link) => link.isVisible)
    .sort((a, b) => a.order - b.order);

  // Helper to pick an appropriate icon based on href or label
  const getLinkIcon = (href: string) => {
    if (href.includes('/news')) return Newspaper;
    if (href.includes('desktop')) return Monitor;
    if (href.includes('faq')) return HelpCircle;
    if (href.includes('login')) return Lock;
    return ExternalLink;
  };

  return (
    <footer className="border-t border-sky-900/60 bg-gradient-to-b from-[#081e3a] via-[#06182e] to-[#040f1d] text-slate-200 pt-8 pb-5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Compact 3-Column Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 pb-6 border-b border-sky-900/40">
          {/* Col 1: Identity & Description */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Image
                src={config.branding?.logoUrl || '/logo.jpg'}
                alt={resolveText(config.branding?.systemNameEn, config.branding?.systemNameAm) || 'Ministry of Revenues'}
                width={38}
                height={38}
                unoptimized
                className="h-9 w-9 object-contain rounded-lg shadow-sm bg-white p-0.5"
              />
              <div>
                <p className="font-display text-base font-bold text-white">
                  {resolveText(config.branding?.systemNameEn, config.branding?.systemNameAm) || 'MoR ELTMS'}
                </p>
                <p className="text-[11px] font-semibold text-amber-400">
                  {resolveText(config.branding?.subtitleEn, config.branding?.subtitleAm) ||
                    t('publicFooter.ministryOfRevenuesEthiopia')}
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {resolveText(config.footer?.descriptionEn, config.footer?.descriptionAm) ||
                t('publicFooter.systemDescription')}
            </p>
          </div>

          {/* Col 2: Contact & Support */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {t('publicFooter.contactAndSupport')}
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-400 mt-0.5" />
                <span>
                  {resolveText(config.footer?.contact?.headquartersEn, config.footer?.contact?.headquartersAm) ||
                    t('publicFooter.headquarters')}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <a
                  href={`tel:${config.footer?.contact?.phone || '+251 11 662 9800'}`}
                  className="hover:text-white transition-colors"
                >
                  {config.footer?.contact?.phone || t('publicFooter.phoneLabel')}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <a
                  href={`mailto:${config.footer?.contact?.email || 'support@mor.gov.et'}`}
                  className="hover:text-white transition-colors"
                >
                  {config.footer?.contact?.email || t('publicFooter.emailLabel')}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span>
                  {resolveText(config.footer?.contact?.workingHoursEn, config.footer?.contact?.workingHoursAm) ||
                    t('publicFooter.workingHours')}
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: Platform Resources */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {t('publicFooter.platformResources')}
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-medium text-slate-300">
              {footerLinks.map((link) => {
                const IconComponent = getLinkIcon(link.href);
                const label = resolveText(link.labelEn, link.labelAm) || link.labelEn;
                return (
                  <Link
                    key={link.id || link.href}
                    href={link.href}
                    {...(link.desktopOnly ? { 'data-desktop-app-only': 'true' } : {})}
                    {...(link.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="inline-flex items-center gap-1.5 hover:text-sky-300 transition-colors"
                  >
                    <IconComponent className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright Only */}
        <div className="pt-4 flex flex-col items-center justify-center text-center text-xs text-slate-400">
          <p className="text-[11px]">
            © {new Date().getFullYear()}{' '}
            {resolveText(config.footer?.copyrightEn, config.footer?.copyrightAm) ||
              t('publicFooter.ministryOfRevenuesAllRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}
