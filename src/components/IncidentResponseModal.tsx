"use client";

import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  message: string;
  isError?: boolean;
  onClose: () => void;
  redirectOnClose?: string;
};

export default function IncidentResponseModal({
  open,
  message,
  isError = false,
  onClose,
  redirectOnClose,
}: Props) {

  const router = useRouter();

  if (!open) return null;

  function handleClose(){
    onClose();
    if (redirectOnClose){
      router.push(redirectOnClose)
    }
  }

  return (
    <div className="modal-overlay">
      <div
        className={`modal-container ${
          isError ? "modal-error" : "modal-success"
        }`}
      >
        <div className="modal-stripe" />

        <div className="modal-body">
          <h2 className="modal-title">
            {isError ? "Hubo un problema" : "Incidente reportado"}
          </h2>

          <p className="modal-message">{message}</p>

          <button className="btn-primary w-full" onClick={handleClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}