"use client";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmColors =
    variant === "danger"
      ? "bg-red-600 text-white active:bg-red-700 hover:bg-red-700"
      : "bg-gray-900 text-white active:bg-gray-800 hover:bg-gray-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-lg p-5 mx-4 max-w-sm w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-lg border border-gray-200 text-sm text-gray-700 font-medium touch-manipulation hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-10 rounded-lg text-sm font-medium touch-manipulation transition-colors ${confirmColors}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
