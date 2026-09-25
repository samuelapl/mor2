'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import { Table, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RichTextArea } from '@/components/ui/RichTextArea';

export default function PendingRegistrationsPage() {
  const { currentUser, users, approveRegistrationRequest, rejectRegistrationRequest } = useLms();
  const { tBilingual } = useTranslation();
  const [flash, setFlash] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!currentUser || currentUser.role !== 'system_admin') {
    return null;
  }

  const pending = users.filter((user) => user.status === 'pending');
  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    pending,
    10,
  );

  const approve = async (userId: string) => {
    setBusy(true);
    const result = await approveRegistrationRequest(userId);
    setFlashOk(result.ok);
    setFlash(result.ok ? 'Registration approved. The learner can now sign in.' : result.message);
    setBusy(false);
  };

  const reject = async (userId: string) => {
    setBusy(true);
    const result = await rejectRegistrationRequest(userId, rejectReason.trim() || undefined);
    setRejectTarget(null);
    setRejectReason('');
    setFlashOk(result.ok);
    setFlash(result.ok ? 'Registration rejected.' : result.message);
    setBusy(false);
  };

  return (
    <PageShell
      role="system_admin"
      title={tBilingual('Registration Requests', 'የምዝገባ ጥያቄዎች')}
      description={tBilingual(
        'Public sign-ups require your approval before learners can sign in.',
        'ተማሪዎች ከመግባታቸው በፊት የህዝብ ምዝገባዎች የእርስዎን ማረጋገጫ ይፈልጋሉ።',
      )}
    >
      {flash ? (
        <div
          className={`mb-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ring-1 ring-inset ${
            flashOk
              ? 'border-emerald-200/70 bg-emerald-50/80 text-emerald-700 ring-emerald-600/10'
              : 'border-red-200/70 bg-red-50/80 text-red-700 ring-red-600/10'
          }`}
        >
          {flash}
        </div>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState
          title={tBilingual('No pending registrations', 'ምንም በመጠባበቅ ላይ ያሉ ምዝገባዎች የሉም')}
          description={tBilingual(
            'All registration requests have been reviewed.',
            'ሁሉም የምዝገባ ጥያቄዎች ተገምግመዋል።',
          )}
        />
      ) : (
        <>
          <Table
            columns={[
              tBilingual('Applicant', 'አመልካች'),
              tBilingual('Email', 'ኢሜይል'),
              tBilingual('Phone', 'ስልክ'),
              tBilingual('Submitted', 'የቀረበበት ቀን'),
              tBilingual('Actions', 'እርምጃዎች'),
            ]}
          >
            {pageItems.map((user) => (
              <tr key={user.id}>
                <Td>
                  <span className="font-medium text-slate-900">{user.name}</span>
                  <span className="block text-[11px] text-slate-400">
                    {tBilingual('Pending approval', 'ማረጋገጫ በመጠባበቅ ላይ')}
                  </span>
                </Td>
                <Td>
                  <span className="text-slate-500">{user.email}</span>
                </Td>
                <Td>
                  <span className="text-slate-500">{user.phone || '—'}</span>
                </Td>
                <Td>
                  <Badge variant="blue" dot>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={busy}
                      onClick={() => void approve(user.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {tBilingual('Approve', 'አጽድቅ')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => {
                        setRejectTarget(rejectTarget === user.id ? null : user.id);
                        setRejectReason('');
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {tBilingual('Reject', 'ውድቅ አድርግ')}
                    </Button>
                  </div>
                  {rejectTarget === user.id ? (
                    <div className="mt-2 flex flex-col gap-2 rounded-xl border border-red-200/70 bg-red-50/60 p-3">
                      <RichTextArea
                        rows={2}
                        value={rejectReason}
                        onChange={(val) => setRejectReason(val)}
                        placeholder={tBilingual(
                          'Reason (optional) — emailed to the applicant (supports formatting, bold, bullet points)…',
                          'ምክንያት (አማራጭ) — ለአመልካቹ በኢሜይል ይላካል…',
                        )}
                        compact
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRejectTarget(null);
                            setRejectReason('');
                          }}
                        >
                          {tBilingual('Cancel', 'ይቅር')}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy}
                          onClick={() => void reject(user.id)}
                        >
                          {tBilingual('Confirm', 'አረጋግጥ')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </>
      )}
    </PageShell>
  );
}
