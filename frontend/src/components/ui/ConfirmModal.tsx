"use client";

import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const isModalOpen = Boolean(open ?? isOpen);
  const Icon = variant === "danger" ? AlertCircle : AlertTriangle;
  const iconColor =
    variant === "danger"
      ? "text-rose-600 bg-rose-50 border-rose-100"
      : variant === "warning"
      ? "text-amber-600 bg-amber-50 border-amber-100"
      : "text-indigo-600 bg-indigo-50 border-indigo-100";

  return (
    <Modal
      open={isModalOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title={title}
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={isLoading}
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "warning" ? "primary" : variant}
            size="md"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4 py-1">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-600 leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </Modal>
  );
}
