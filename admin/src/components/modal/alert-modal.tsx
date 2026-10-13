'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loader2 } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  confirmationPhrase?: string;
  confirmationValue?: string;
  onConfirmationValueChange?: (value: string) => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Continue",
  confirmationPhrase,
  confirmationValue = "",
  onConfirmationValueChange,
}) => {
  const confirmationMatches = !confirmationPhrase || confirmationValue === confirmationPhrase;
  return (
    <Modal
      title={title}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
    >
      {confirmationPhrase ? (
        <div className="space-y-2 pt-4">
          <p className="text-sm text-muted-foreground">
            Type <strong className="text-foreground">{confirmationPhrase}</strong> to confirm.
          </p>
          <Input
            value={confirmationValue}
            onChange={(event) => onConfirmationValueChange?.(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      ) : null}
      <div className="flex w-full items-center justify-end space-x-2 pt-6">
        <Button disabled={loading} variant="outline" onClick={onClose}>
          {/* {loading && <Loader2 />} */}
          Cancel
        </Button>
        <Button disabled={loading || !confirmationMatches} variant="destructive" onClick={onConfirm}>
          {loading && <Loader2 />}
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};
