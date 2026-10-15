'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Monitor,
  MoveDown,
  MoveUp,
  PenSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';

import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import {
  DEFAULT_LANDING_PAGE_CONFIG,
  fetchAdminLandingConfig,
  resetLandingConfig,
  updateLandingConfig,
  uploadLandingLogo,
  type FaqItemConfig,
  type LandingPageConfig,
  type NavItemConfig,
  type StatItemConfig,
  type WorkflowStepConfig,
} from '@/lib/api/landing-page';

type CmsTab = 'branding' | 'hero' | 'stats' | 'workflow' | 'desktop' | 'faqs' | 'footer';

export default function LandingPageCmsPage() {
  const { t } = useTranslation('admin');
  const [activeTab, setActiveTab] = useState<CmsTab>('branding');
  const [config, setConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Link Edit / Add modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<'header' | 'footer'>('header');
  const [editingLink, setEditingLink] = useState<NavItemConfig | null>(null);

  // Stat Edit / Add modal
  const [statModalOpen, setStatModalOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<StatItemConfig | null>(null);

  // Workflow step Edit / Add modal
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStepConfig | null>(null);

  // FAQ Edit / Add modal
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItemConfig | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load config on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAdminLandingConfig()
      .then((data) => {
        if (!cancelled && data) {
          setConfig(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load landing page configuration');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const updated = await updateLandingConfig(config);
      setConfig(updated);
      showToast(t('landingPageCms.savedSuccess'));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const reset = await resetLandingConfig();
      setConfig(reset);
      setResetModalOpen(false);
      showToast(t('landingPageCms.savedSuccess'));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  // Upload custom logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setErrorMessage(null);
    try {
      const { logoUrl } = await uploadLandingLogo(file);
      setConfig((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          logoUrl,
        },
      }));
      showToast(t('landingPageCms.logoSuccess'));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helpers for reordering
  const moveItem = <T,>(list: T[], index: number, direction: 'up' | 'down'): T[] => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return list;
    const copy = [...list];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    return copy;
  };

  const inputClass =
    'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

  const toggleClass = (active: boolean) =>
    cn(
      'relative inline-flex h-6 w-11 items-center rounded-full shadow-inner transition-colors duration-200 cursor-pointer',
      active ? 'bg-primary' : 'bg-muted',
    );

  const tabs: { key: CmsTab; label: string; icon: any }[] = [
    { key: 'branding', label: t('landingPageCms.tabBranding'), icon: LayoutTemplate },
    { key: 'hero', label: t('landingPageCms.tabHero'), icon: Globe },
    { key: 'stats', label: t('landingPageCms.tabStats'), icon: Layers },
    { key: 'workflow', label: t('landingPageCms.tabWorkflow'), icon: PenSquare },
    { key: 'desktop', label: t('landingPageCms.tabDesktop'), icon: Monitor },
    { key: 'faqs', label: t('landingPageCms.tabFaq'), icon: HelpCircle },
    { key: 'footer', label: t('landingPageCms.tabFooter'), icon: LayoutTemplate },
  ];

  if (loading) {
    return (
      <PageShell
        role="system_admin"
        title={t('landingPageCms.pageTitle')}
        description={t('landingPageCms.pageDescription')}
      >
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span>Loading configuration…</span>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      role="system_admin"
      title={t('landingPageCms.pageTitle')}
      description={t('landingPageCms.pageDescription')}
    >
      <div className="space-y-6 pb-12">
        {/* TOP CONTROLS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Badge variant="blue" className="bg-info-soft text-info font-mono text-xs">
              Config v{config.version || 1}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {config.header?.navLinks?.length || 0} nav links • {config.stats?.length || 0} metric cards •{' '}
              {config.faqs?.length || 0} FAQs
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/90 bg-card px-3.5 py-2 text-xs font-semibold text-secondary-foreground shadow-sm transition hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{t('landingPageCms.previewPage')}</span>
            </Link>

            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/90 bg-card px-3.5 py-2 text-xs font-semibold text-secondary-foreground shadow-sm transition hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5 text-warning" />
              <span>{t('landingPageCms.resetDefaults')}</span>
            </button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{t('landingPageCms.saving')}</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{t('landingPageCms.saveChanges')}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* FEEDBACK NOTIFICATIONS */}
        {toastMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-success/30 bg-success-soft p-4 text-xs font-semibold text-success animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-xs font-semibold text-danger animate-in fade-in">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB NAVIGATION PILLS */}
        <div className="flex overflow-x-auto gap-2 border-b border-border/80 pb-3 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border/80 text-secondary-foreground hover:bg-muted',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: BRANDING & HEADER */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            {/* Logo and Identity */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
              <h3 className="font-display text-base font-bold text-foreground">
                {t('landingPageCms.logo')} & Identity
              </h3>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-muted/30 p-2 shadow-inner">
                  <Image
                    src={config.branding?.logoUrl || '/logo.jpg'}
                    alt="Logo Preview"
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 object-contain rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Upload a high-resolution PNG, SVG, or JPEG logo. Recommended dimensions: 256x256 or SVG.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="inline-flex items-center gap-2 text-xs"
                  >
                    {uploadingLogo ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{t('landingPageCms.uploading')}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>{t('landingPageCms.uploadLogo')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.systemNameEn')}
                  </label>
                  <input
                    type="text"
                    value={config.branding?.systemNameEn || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, systemNameEn: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.systemNameAm')}
                  </label>
                  <input
                    type="text"
                    value={config.branding?.systemNameAm || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, systemNameAm: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.subtitleEn')}
                  </label>
                  <input
                    type="text"
                    value={config.branding?.subtitleEn || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, subtitleEn: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.subtitleAm')}
                  </label>
                  <input
                    type="text"
                    value={config.branding?.subtitleAm || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, subtitleAm: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t('landingPageCms.showGovBadge')}</p>
                    <p className="text-[11px] text-muted-foreground">Display gold GOV verification pill badge</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, showGovBadge: !prev.branding?.showGovBadge },
                      }))
                    }
                    className={toggleClass(config.branding?.showGovBadge !== false)}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-card transition-transform duration-200',
                        config.branding?.showGovBadge !== false ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t('landingPageCms.showTopBanner')}</p>
                    <p className="text-[11px] text-muted-foreground">Institutional Federal Ministry banner across top of header</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, showTopBanner: !prev.branding?.showTopBanner },
                      }))
                    }
                    className={toggleClass(config.branding?.showTopBanner !== false)}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-card transition-transform duration-200',
                        config.branding?.showTopBanner !== false ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>

                {config.branding?.showTopBanner !== false && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                        {t('landingPageCms.topBannerTextEn')}
                      </label>
                      <input
                        type="text"
                        value={config.branding?.topBannerTextEn || ''}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            branding: { ...prev.branding, topBannerTextEn: e.target.value },
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                        {t('landingPageCms.topBannerTextAm')}
                      </label>
                      <input
                        type="text"
                        value={config.branding?.topBannerTextAm || ''}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            branding: { ...prev.branding, topBannerTextAm: e.target.value },
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Header Navigation Links Table */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {t('landingPageCms.headerNavLinks')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Add, edit, reorder, or toggle visibility of navigation items.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLinkTarget('header');
                    setEditingLink({
                      id: `nav-${Date.now()}`,
                      labelEn: '',
                      labelAm: '',
                      href: '/',
                      isVisible: true,
                      desktopOnly: false,
                      order: (config.header?.navLinks?.length || 0) + 1,
                    });
                    setLinkModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('landingPageCms.addNavLink')}</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 bg-muted/30 text-secondary-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Order</th>
                      <th className="py-2.5 px-3">{t('landingPageCms.linkTitleEn')}</th>
                      <th className="py-2.5 px-3">{t('landingPageCms.linkTitleAm')}</th>
                      <th className="py-2.5 px-3">{t('landingPageCms.linkHref')}</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">{t('landingPageCms.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(config.header?.navLinks || []).map((link, idx) => (
                      <tr key={link.id} className="hover:bg-muted/20">
                        <td className="py-3 px-3 font-mono font-bold text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>#{idx + 1}</span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const reordered = moveItem(config.header.navLinks, idx, 'up');
                                  setConfig((prev) => ({
                                    ...prev,
                                    header: { ...prev.header, navLinks: reordered },
                                  }));
                                }}
                                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === config.header.navLinks.length - 1}
                                onClick={() => {
                                  const reordered = moveItem(config.header.navLinks, idx, 'down');
                                  setConfig((prev) => ({
                                    ...prev,
                                    header: { ...prev.header, navLinks: reordered },
                                  }));
                                }}
                                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">{link.labelEn}</td>
                        <td className="py-3 px-3 text-secondary-foreground">{link.labelAm || '—'}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{link.href}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = config.header.navLinks.map((l, i) =>
                                  i === idx ? { ...l, isVisible: !l.isVisible } : l,
                                );
                                setConfig((prev) => ({
                                  ...prev,
                                  header: { ...prev.header, navLinks: updated },
                                }));
                              }}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition',
                                link.isVisible
                                  ? 'bg-success-soft text-success hover:opacity-80'
                                  : 'bg-muted text-muted-foreground hover:opacity-80',
                              )}
                            >
                              {link.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              <span>{link.isVisible ? t('landingPageCms.visible') : t('landingPageCms.hidden')}</span>
                            </button>
                            {link.desktopOnly && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                                title={t('landingPageCms.desktopOnlyHelp')}
                              >
                                <Globe className="h-2.5 w-2.5" />
                                <span>{t('landingPageCms.webOnlyBadge')}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setLinkTarget('header');
                                setEditingLink({ ...link });
                                setLinkModalOpen(true);
                              }}
                              className="p-1 rounded text-secondary-foreground hover:bg-muted"
                            >
                              <PenSquare className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = config.header.navLinks.filter((_, i) => i !== idx);
                                setConfig((prev) => ({
                                  ...prev,
                                  header: { ...prev.header, navLinks: filtered },
                                }));
                              }}
                              className="p-1 rounded text-danger hover:bg-danger-soft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HERO SECTION */}
        {activeTab === 'hero' && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
            <h3 className="font-display text-base font-bold text-foreground">
              {t('landingPageCms.tabHero')}
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.badgeTextEn')}
                </label>
                <input
                  type="text"
                  value={config.hero?.badgeTextEn || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, badgeTextEn: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.badgeTextAm')}
                </label>
                <input
                  type="text"
                  value={config.hero?.badgeTextAm || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, badgeTextAm: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.headlineEn')}
                </label>
                <input
                  type="text"
                  value={config.hero?.headlineEn || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, headlineEn: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.headlineAm')}
                </label>
                <input
                  type="text"
                  value={config.hero?.headlineAm || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, headlineAm: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.heroSubtitleEn')}
                </label>
                <textarea
                  rows={3}
                  value={config.hero?.subtitleEn || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, subtitleEn: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.heroSubtitleAm')}
                </label>
                <textarea
                  rows={3}
                  value={config.hero?.subtitleAm || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, subtitleAm: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            {/* Buttons Customization */}
            <div className="space-y-6 pt-4 border-t border-border/80">
              {/* Primary Button */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {t('landingPageCms.primaryButton')}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, showPrimaryButton: !prev.hero?.showPrimaryButton },
                      }))
                    }
                    className={toggleClass(config.hero?.showPrimaryButton !== false)}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-card transition-transform duration-200',
                        config.hero?.showPrimaryButton !== false ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                      {t('landingPageCms.buttonTextEn')}
                    </label>
                    <input
                      type="text"
                      value={config.hero?.primaryButtonTextEn || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, primaryButtonTextEn: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                      {t('landingPageCms.buttonTextAm')}
                    </label>
                    <input
                      type="text"
                      value={config.hero?.primaryButtonTextAm || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, primaryButtonTextAm: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                      {t('landingPageCms.buttonUrl')}
                    </label>
                    <input
                      type="text"
                      value={config.hero?.primaryButtonHref || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, primaryButtonHref: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Button */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {t('landingPageCms.secondaryButton')}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, showSecondaryButton: !prev.hero?.showSecondaryButton },
                      }))
                    }
                    className={toggleClass(config.hero?.showSecondaryButton !== false)}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-card transition-transform duration-200',
                        config.hero?.showSecondaryButton !== false ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                      {t('landingPageCms.buttonTextEn')}
                    </label>
                    <input
                      type="text"
                      value={config.hero?.secondaryButtonTextEn || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, secondaryButtonTextEn: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                      {t('landingPageCms.buttonTextAm')}
                    </label>
                    <input
                      type="text"
                      value={config.hero?.secondaryButtonTextAm || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, secondaryButtonTextAm: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                      {t('landingPageCms.buttonUrl')}
                    </label>
                    <input
                      type="text"
                      value={config.hero?.secondaryButtonHref || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, secondaryButtonHref: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: METRICS & STATS */}
        {activeTab === 'stats' && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  {t('landingPageCms.tabStats')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Manage the impact counters displayed directly below the hero section.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingStat({
                    id: `stat-${Date.now()}`,
                    value: '10+',
                    labelEn: '',
                    labelAm: '',
                    subtextEn: '',
                    subtextAm: '',
                    isVisible: true,
                    order: (config.stats?.length || 0) + 1,
                  });
                  setStatModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('landingPageCms.addStat')}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(config.stats || []).map((stat, idx) => (
                <div
                  key={stat.id}
                  className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const reordered = moveItem(config.stats, idx, 'up');
                            setConfig((prev) => ({ ...prev, stats: reordered }));
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <MoveUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === config.stats.length - 1}
                          onClick={() => {
                            const reordered = moveItem(config.stats, idx, 'down');
                            setConfig((prev) => ({ ...prev, stats: reordered }));
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <MoveDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-center">
                      <div className="font-display text-2xl font-black text-primary">{stat.value}</div>
                      <div className="text-xs font-bold text-foreground mt-1">{stat.labelEn}</div>
                      {stat.labelAm && <div className="text-[11px] text-muted-foreground">{stat.labelAm}</div>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.stats.map((s, i) =>
                          i === idx ? { ...s, isVisible: !s.isVisible } : s,
                        );
                        setConfig((prev) => ({ ...prev, stats: updated }));
                      }}
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        stat.isVisible ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {stat.isVisible ? t('landingPageCms.visible') : t('landingPageCms.hidden')}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStat({ ...stat });
                          setStatModalOpen(true);
                        }}
                        className="p-1 text-secondary-foreground hover:bg-muted rounded"
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = config.stats.filter((_, i) => i !== idx);
                          setConfig((prev) => ({ ...prev, stats: filtered }));
                        }}
                        className="p-1 text-danger hover:bg-danger-soft rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LEARNER JOURNEY (WORKFLOW) */}
        {activeTab === 'workflow' && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
            <h3 className="font-display text-base font-bold text-foreground">
              {t('landingPageCms.tabWorkflow')}
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.sectionTitleEn')}
                </label>
                <input
                  type="text"
                  value={config.workflow?.sectionTitleEn || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      workflow: { ...prev.workflow, sectionTitleEn: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.sectionTitleAm')}
                </label>
                <input
                  type="text"
                  value={config.workflow?.sectionTitleAm || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      workflow: { ...prev.workflow, sectionTitleAm: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.sectionSubtitleEn')}
                </label>
                <input
                  type="text"
                  value={config.workflow?.sectionSubtitleEn || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      workflow: { ...prev.workflow, sectionSubtitleEn: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.sectionSubtitleAm')}
                </label>
                <input
                  type="text"
                  value={config.workflow?.sectionSubtitleAm || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      workflow: { ...prev.workflow, sectionSubtitleAm: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            {/* Workflow Steps Table */}
            <div className="pt-4 border-t border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Workflow Journey Steps
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Ordered milestones illustrating the 5-step curriculum pathway.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingStep({
                      id: `step-${Date.now()}`,
                      stepNumber: (config.workflow?.steps?.length || 0) + 1,
                      titleEn: '',
                      titleAm: '',
                      descriptionEn: '',
                      descriptionAm: '',
                      isVisible: true,
                      order: (config.workflow?.steps?.length || 0) + 1,
                    });
                    setStepModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('landingPageCms.addWorkflowStep')}</span>
                </Button>
              </div>

              <div className="space-y-3">
                {(config.workflow?.steps || []).map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 p-4"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground font-mono">
                        {String(step.stepNumber || idx + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h5 className="text-xs font-bold text-foreground">
                          {step.titleEn} {step.titleAm ? `(${step.titleAm})` : ''}
                        </h5>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {step.descriptionEn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = config.workflow.steps.map((s, i) =>
                            i === idx ? { ...s, isVisible: !s.isVisible } : s,
                          );
                          setConfig((prev) => ({
                            ...prev,
                            workflow: { ...prev.workflow, steps: updated },
                          }));
                        }}
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full',
                          step.isVisible ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {step.isVisible ? t('landingPageCms.visible') : t('landingPageCms.hidden')}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const reordered = moveItem(config.workflow.steps, idx, 'up');
                            setConfig((prev) => ({
                              ...prev,
                              workflow: { ...prev.workflow, steps: reordered },
                            }));
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <MoveUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === config.workflow.steps.length - 1}
                          onClick={() => {
                            const reordered = moveItem(config.workflow.steps, idx, 'down');
                            setConfig((prev) => ({
                              ...prev,
                              workflow: { ...prev.workflow, steps: reordered },
                            }));
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <MoveDown className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingStep({ ...step });
                          setStepModalOpen(true);
                        }}
                        className="p-1 text-secondary-foreground hover:bg-muted rounded"
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const filtered = config.workflow.steps.filter((_, i) => i !== idx);
                          setConfig((prev) => ({
                            ...prev,
                            workflow: { ...prev.workflow, steps: filtered },
                          }));
                        }}
                        className="p-1 text-danger hover:bg-danger-soft rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DESKTOP APP */}
        {activeTab === 'desktop' && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  {t('landingPageCms.tabDesktop')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure promotion card for the official Windows client workstation installer.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    desktopApp: { ...prev.desktopApp, isVisible: !prev.desktopApp?.isVisible },
                  }))
                }
                className={toggleClass(config.desktopApp?.isVisible !== false)}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-card transition-transform duration-200',
                    config.desktopApp?.isVisible !== false ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.desktopTitleEn')}
                </label>
                <input
                  type="text"
                  value={config.desktopApp?.titleEn || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      desktopApp: { ...prev.desktopApp, titleEn: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.desktopTitleAm')}
                </label>
                <input
                  type="text"
                  value={config.desktopApp?.titleAm || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      desktopApp: { ...prev.desktopApp, titleAm: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.desktopDescEn')}
                </label>
                <textarea
                  rows={2}
                  value={config.desktopApp?.descriptionEn || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      desktopApp: { ...prev.desktopApp, descriptionEn: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.desktopDescAm')}
                </label>
                <textarea
                  rows={2}
                  value={config.desktopApp?.descriptionAm || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      desktopApp: { ...prev.desktopApp, descriptionAm: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.desktopVersion')}
                </label>
                <input
                  type="text"
                  value={config.desktopApp?.version || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      desktopApp: { ...prev.desktopApp, version: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  {t('landingPageCms.desktopDownloadUrl')}
                </label>
                <input
                  type="text"
                  value={config.desktopApp?.downloadUrl || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      desktopApp: { ...prev.desktopApp, downloadUrl: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: FAQS */}
        {activeTab === 'faqs' && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  {t('landingPageCms.tabFaq')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Add, update, reorder, or delete frequently asked questions.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingFaq({
                    id: `faq-${Date.now()}`,
                    questionEn: '',
                    questionAm: '',
                    answerEn: '',
                    answerAm: '',
                    isVisible: true,
                    order: (config.faqs?.length || 0) + 1,
                  });
                  setFaqModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('landingPageCms.addFaq')}</span>
              </Button>
            </div>

            <div className="space-y-3">
              {(config.faqs || []).map((faq, idx) => (
                <div
                  key={faq.id}
                  className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="font-mono text-xs font-bold text-primary">Q{idx + 1}:</span>
                      <h5 className="text-xs font-bold text-foreground">{faq.questionEn}</h5>
                      {faq.questionAm && (
                        <p className="text-[11px] text-muted-foreground">{faq.questionAm}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = config.faqs.map((f, i) =>
                            i === idx ? { ...f, isVisible: !f.isVisible } : f,
                          );
                          setConfig((prev) => ({ ...prev, faqs: updated }));
                        }}
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full',
                          faq.isVisible ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {faq.isVisible ? t('landingPageCms.visible') : t('landingPageCms.hidden')}
                      </button>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const reordered = moveItem(config.faqs, idx, 'up');
                          setConfig((prev) => ({ ...prev, faqs: reordered }));
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <MoveUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === config.faqs.length - 1}
                        onClick={() => {
                          const reordered = moveItem(config.faqs, idx, 'down');
                          setConfig((prev) => ({ ...prev, faqs: reordered }));
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <MoveDown className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingFaq({ ...faq });
                          setFaqModalOpen(true);
                        }}
                        className="p-1 text-secondary-foreground hover:bg-muted rounded"
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = config.faqs.filter((_, i) => i !== idx);
                          setConfig((prev) => ({ ...prev, faqs: filtered }));
                        }}
                        className="p-1 text-danger hover:bg-danger-soft rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-secondary-foreground border-t border-border/40 pt-2 line-clamp-2">
                    {faq.answerEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: FOOTER & CONTACTS */}
        {activeTab === 'footer' && (
          <div className="space-y-6">
            {/* Description & Contacts */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
              <h3 className="font-display text-base font-bold text-foreground">
                {t('landingPageCms.tabFooter')}
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.footerDescEn')}
                  </label>
                  <textarea
                    rows={2}
                    value={config.footer?.descriptionEn || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, descriptionEn: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.footerDescAm')}
                  </label>
                  <textarea
                    rows={2}
                    value={config.footer?.descriptionAm || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, descriptionAm: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.headquartersEn')}
                  </label>
                  <input
                    type="text"
                    value={config.footer?.contact?.headquartersEn || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          contact: { ...prev.footer.contact, headquartersEn: e.target.value },
                        },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.headquartersAm')}
                  </label>
                  <input
                    type="text"
                    value={config.footer?.contact?.headquartersAm || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          contact: { ...prev.footer.contact, headquartersAm: e.target.value },
                        },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.phone')}
                  </label>
                  <input
                    type="text"
                    value={config.footer?.contact?.phone || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          contact: { ...prev.footer.contact, phone: e.target.value },
                        },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.email')}
                  </label>
                  <input
                    type="text"
                    value={config.footer?.contact?.email || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          contact: { ...prev.footer.contact, email: e.target.value },
                        },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.workingHoursEn')}
                  </label>
                  <input
                    type="text"
                    value={config.footer?.contact?.workingHoursEn || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          contact: { ...prev.footer.contact, workingHoursEn: e.target.value },
                        },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.workingHoursAm')}
                  </label>
                  <input
                    type="text"
                    value={config.footer?.contact?.workingHoursAm || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          contact: { ...prev.footer.contact, workingHoursAm: e.target.value },
                        },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.copyrightEn')}
                  </label>
                  <input
                    type="text"
                    value={config.footer?.copyrightEn || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, copyrightEn: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                    {t('landingPageCms.copyrightAm')}
                  </label>
                  <input
                    type="text"
                    value={config.footer?.copyrightAm || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, copyrightAm: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Footer Resource Links Table */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {t('landingPageCms.footerLinks')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Resource navigation links shown in the 3rd column of the public footer.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLinkTarget('footer');
                    setEditingLink({
                      id: `footer-link-${Date.now()}`,
                      labelEn: '',
                      labelAm: '',
                      href: '/',
                      isVisible: true,
                      desktopOnly: false,
                      order: (config.footer?.links?.length || 0) + 1,
                    });
                    setLinkModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('landingPageCms.addNavLink')}</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 bg-muted/30 text-secondary-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Order</th>
                      <th className="py-2.5 px-3">{t('landingPageCms.linkTitleEn')}</th>
                      <th className="py-2.5 px-3">{t('landingPageCms.linkTitleAm')}</th>
                      <th className="py-2.5 px-3">{t('landingPageCms.linkHref')}</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">{t('landingPageCms.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(config.footer?.links || []).map((link, idx) => (
                      <tr key={link.id} className="hover:bg-muted/20">
                        <td className="py-3 px-3 font-mono font-bold text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>#{idx + 1}</span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const reordered = moveItem(config.footer.links, idx, 'up');
                                  setConfig((prev) => ({
                                    ...prev,
                                    footer: { ...prev.footer, links: reordered },
                                  }));
                                }}
                                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === config.footer.links.length - 1}
                                onClick={() => {
                                  const reordered = moveItem(config.footer.links, idx, 'down');
                                  setConfig((prev) => ({
                                    ...prev,
                                    footer: { ...prev.footer, links: reordered },
                                  }));
                                }}
                                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">{link.labelEn}</td>
                        <td className="py-3 px-3 text-secondary-foreground">{link.labelAm || '—'}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{link.href}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = config.footer.links.map((l, i) =>
                                  i === idx ? { ...l, isVisible: !l.isVisible } : l,
                                );
                                setConfig((prev) => ({
                                  ...prev,
                                  footer: { ...prev.footer, links: updated },
                                }));
                              }}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition',
                                link.isVisible
                                  ? 'bg-success-soft text-success hover:opacity-80'
                                  : 'bg-muted text-muted-foreground hover:opacity-80',
                              )}
                            >
                              {link.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              <span>{link.isVisible ? t('landingPageCms.visible') : t('landingPageCms.hidden')}</span>
                            </button>
                            {link.desktopOnly && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                                title={t('landingPageCms.desktopOnlyHelp')}
                              >
                                <Globe className="h-2.5 w-2.5" />
                                <span>{t('landingPageCms.webOnlyBadge')}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setLinkTarget('footer');
                                setEditingLink({ ...link });
                                setLinkModalOpen(true);
                              }}
                              className="p-1 rounded text-secondary-foreground hover:bg-muted"
                            >
                              <PenSquare className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = config.footer.links.filter((_, i) => i !== idx);
                                setConfig((prev) => ({
                                  ...prev,
                                  footer: { ...prev.footer, links: filtered },
                                }));
                              }}
                              className="p-1 text-danger hover:bg-danger-soft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: ADD / EDIT NAV LINK */}
        {linkModalOpen && editingLink && (
          <Modal
            open={linkModalOpen}
            onClose={() => setLinkModalOpen(false)}
            title={editingLink.labelEn ? t('landingPageCms.editNavLink') : t('landingPageCms.addNavLink')}
            footer={
              <div className="flex items-center justify-end gap-2.5">
                <Button variant="outline" onClick={() => setLinkModalOpen(false)}>
                  {t('landingPageCms.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    if (linkTarget === 'header') {
                      const exists = config.header.navLinks.some((l) => l.id === editingLink.id);
                      const updated = exists
                        ? config.header.navLinks.map((l) => (l.id === editingLink.id ? editingLink : l))
                        : [...config.header.navLinks, editingLink];
                      setConfig((prev) => ({
                        ...prev,
                        header: { ...prev.header, navLinks: updated },
                      }));
                    } else {
                      const exists = config.footer.links.some((l) => l.id === editingLink.id);
                      const updated = exists
                        ? config.footer.links.map((l) => (l.id === editingLink.id ? editingLink : l))
                        : [...config.footer.links, editingLink];
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, links: updated },
                      }));
                    }
                    setLinkModalOpen(false);
                  }}
                >
                  {t('landingPageCms.save')}
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.linkTitleEn')}
                </label>
                <input
                  type="text"
                  value={editingLink.labelEn}
                  onChange={(e) => setEditingLink({ ...editingLink, labelEn: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.linkTitleAm')}
                </label>
                <input
                  type="text"
                  value={editingLink.labelAm}
                  onChange={(e) => setEditingLink({ ...editingLink, labelAm: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.linkHref')}
                </label>
                <input
                  type="text"
                  value={editingLink.href}
                  placeholder="/#section or /news"
                  onChange={(e) => setEditingLink({ ...editingLink, href: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingLink.isVisible}
                    onChange={(e) => setEditingLink({ ...editingLink, isVisible: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="font-medium text-foreground">{t('landingPageCms.visible')}</span>
                </label>

                <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingLink.desktopOnly)}
                      onChange={(e) => setEditingLink({ ...editingLink, desktopOnly: e.target.checked })}
                      className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{t('landingPageCms.desktopOnly')}</span>
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          <Globe className="h-3 w-3" />
                          <span>{t('landingPageCms.webOnlyBadge')}</span>
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {t('landingPageCms.desktopOnlyHelp')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL 2: ADD / EDIT STAT */}
        {statModalOpen && editingStat && (
          <Modal
            open={statModalOpen}
            onClose={() => setStatModalOpen(false)}
            title={t('landingPageCms.addStat')}
            footer={
              <div className="flex items-center justify-end gap-2.5">
                <Button variant="outline" onClick={() => setStatModalOpen(false)}>
                  {t('landingPageCms.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    const exists = config.stats.some((s) => s.id === editingStat.id);
                    const updated = exists
                      ? config.stats.map((s) => (s.id === editingStat.id ? editingStat : s))
                      : [...config.stats, editingStat];
                    setConfig((prev) => ({ ...prev, stats: updated }));
                    setStatModalOpen(false);
                  }}
                >
                  {t('landingPageCms.save')}
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.statValue')}
                </label>
                <input
                  type="text"
                  value={editingStat.value}
                  onChange={(e) => setEditingStat({ ...editingStat, value: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.statLabelEn')}
                </label>
                <input
                  type="text"
                  value={editingStat.labelEn}
                  onChange={(e) => setEditingStat({ ...editingStat, labelEn: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.statLabelAm')}
                </label>
                <input
                  type="text"
                  value={editingStat.labelAm}
                  onChange={(e) => setEditingStat({ ...editingStat, labelAm: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.statSubtextEn')}
                </label>
                <input
                  type="text"
                  value={editingStat.subtextEn || ''}
                  onChange={(e) => setEditingStat({ ...editingStat, subtextEn: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.statSubtextAm')}
                </label>
                <input
                  type="text"
                  value={editingStat.subtextAm || ''}
                  onChange={(e) => setEditingStat({ ...editingStat, subtextAm: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStat.isVisible}
                    onChange={(e) => setEditingStat({ ...editingStat, isVisible: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>{t('landingPageCms.visible')}</span>
                </label>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL 3: ADD / EDIT WORKFLOW STEP */}
        {stepModalOpen && editingStep && (
          <Modal
            open={stepModalOpen}
            onClose={() => setStepModalOpen(false)}
            title={t('landingPageCms.addWorkflowStep')}
            footer={
              <div className="flex items-center justify-end gap-2.5">
                <Button variant="outline" onClick={() => setStepModalOpen(false)}>
                  {t('landingPageCms.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    const exists = config.workflow.steps.some((s) => s.id === editingStep.id);
                    const updated = exists
                      ? config.workflow.steps.map((s) => (s.id === editingStep.id ? editingStep : s))
                      : [...config.workflow.steps, editingStep];
                    setConfig((prev) => ({
                      ...prev,
                      workflow: { ...prev.workflow, steps: updated },
                    }));
                    setStepModalOpen(false);
                  }}
                >
                  {t('landingPageCms.save')}
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.stepNumber')}
                </label>
                <input
                  type="number"
                  value={editingStep.stepNumber}
                  onChange={(e) =>
                    setEditingStep({ ...editingStep, stepNumber: parseInt(e.target.value, 10) || 1 })
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.stepTitleEn')}
                </label>
                <input
                  type="text"
                  value={editingStep.titleEn}
                  onChange={(e) => setEditingStep({ ...editingStep, titleEn: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.stepTitleAm')}
                </label>
                <input
                  type="text"
                  value={editingStep.titleAm}
                  onChange={(e) => setEditingStep({ ...editingStep, titleAm: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.stepDescEn')}
                </label>
                <textarea
                  rows={2}
                  value={editingStep.descriptionEn}
                  onChange={(e) => setEditingStep({ ...editingStep, descriptionEn: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.stepDescAm')}
                </label>
                <textarea
                  rows={2}
                  value={editingStep.descriptionAm}
                  onChange={(e) => setEditingStep({ ...editingStep, descriptionAm: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStep.isVisible}
                    onChange={(e) => setEditingStep({ ...editingStep, isVisible: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>{t('landingPageCms.visible')}</span>
                </label>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL 4: ADD / EDIT FAQ */}
        {faqModalOpen && editingFaq && (
          <Modal
            open={faqModalOpen}
            onClose={() => setFaqModalOpen(false)}
            title={t('landingPageCms.addFaq')}
            footer={
              <div className="flex items-center justify-end gap-2.5">
                <Button variant="outline" onClick={() => setFaqModalOpen(false)}>
                  {t('landingPageCms.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    const exists = config.faqs.some((f) => f.id === editingFaq.id);
                    const updated = exists
                      ? config.faqs.map((f) => (f.id === editingFaq.id ? editingFaq : f))
                      : [...config.faqs, editingFaq];
                    setConfig((prev) => ({ ...prev, faqs: updated }));
                    setFaqModalOpen(false);
                  }}
                >
                  {t('landingPageCms.save')}
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.questionEn')}
                </label>
                <input
                  type="text"
                  value={editingFaq.questionEn}
                  onChange={(e) => setEditingFaq({ ...editingFaq, questionEn: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.questionAm')}
                </label>
                <input
                  type="text"
                  value={editingFaq.questionAm}
                  onChange={(e) => setEditingFaq({ ...editingFaq, questionAm: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.answerEn')}
                </label>
                <textarea
                  rows={3}
                  value={editingFaq.answerEn}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answerEn: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-secondary-foreground">
                  {t('landingPageCms.answerAm')}
                </label>
                <textarea
                  rows={3}
                  value={editingFaq.answerAm}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answerAm: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingFaq.isVisible}
                    onChange={(e) => setEditingFaq({ ...editingFaq, isVisible: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>{t('landingPageCms.visible')}</span>
                </label>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL 5: FACTORY RESET CONFIRMATION */}
        {resetModalOpen && (
          <Modal
            open={resetModalOpen}
            onClose={() => setResetModalOpen(false)}
            title={t('landingPageCms.resetDefaults')}
            footer={
              <div className="flex items-center justify-end gap-2.5">
                <Button variant="outline" onClick={() => setResetModalOpen(false)}>
                  {t('landingPageCms.cancel')}
                </Button>
                <Button variant="danger" onClick={handleReset} disabled={saving}>
                  {saving ? t('landingPageCms.saving') : t('landingPageCms.resetDefaults')}
                </Button>
              </div>
            }
          >
            <p className="text-xs leading-relaxed text-secondary-foreground">
              {t('landingPageCms.resetConfirm')}
            </p>
          </Modal>
        )}
      </div>
    </PageShell>
  );
}
