import { useEffect } from "react";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  isDangerous = true,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onCancel?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel?.();
        }
      }}
    >
      <div
        className={`modal-content confirm-modal ${isDangerous ? "" : "confirm-modal-safe"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={() => !loading && onCancel?.()}
          aria-label="Close confirmation"
        >
          ✕
        </button>

        <div className="modal-header">
          <h2>{title}</h2>
        </div>

        <p className="confirm-modal-message">{message}</p>

        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${isDangerous ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? isDangerous
                ? "Deleting..."
                : "Loading..."
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
