import React, { useState } from 'react';
import { Booking } from '../types';
import { uploadPaymentProofToStorage, getStoredClubSettings } from '../apiService';

interface PaymentDrawerProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onConfirmPayment: (proofUrl?: string) => void;
  onCopyAlias: (alias: string) => void;
}

export const PaymentDrawer: React.FC<PaymentDrawerProps> = ({
  isOpen,
  booking,
  onClose,
  onConfirmPayment,
  onCopyAlias,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const clubSettings = getStoredClubSettings();
  const clubAlias = clubSettings.cbu_alias || 'PADEL.PRO.OFICIAL';
  const bankName = clubSettings.bank_name || 'Bancolombia / Nequi';
  const accountHolder = clubSettings.account_holder || clubSettings.club_name;
  const accountNumber = clubSettings.cbu_number || '0000003100045892348210';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedFileName(file.name);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setUploadError('Por favor selecciona la imagen o PDF de tu comprobante antes de enviar.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploadedUrl = await uploadPaymentProofToStorage(selectedFile);
      onConfirmPayment(uploadedUrl);
      setSelectedFile(null);
      setSelectedFileName(null);
    } catch (err: any) {
      setUploadError(
        err?.message || 'No se pudo subir el comprobante. Intenta nuevamente.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <aside
      aria-labelledby="drawer-title"
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex flex-col justify-end"
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-[#0f131c]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      {/* Drawer content panel */}
      <div className="relative w-full max-w-lg mx-auto rounded-t-3xl bg-[#262a34] p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto border-t border-[#3c4a42] animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-[#86948a]/40 self-center mb-0.5"></div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-[#4edea3] uppercase tracking-wider">
              Pago de Cancha • {booking.court_name}
            </span>
            <h2
              className="text-[20px] font-bold text-[#dfe2ef]"
              id="drawer-title"
            >
              Transferencia Bancaria
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#1c1f29] text-[#bbcabf] hover:text-[#dfe2ef] min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
            type="button"
            aria-label="Cerrar modal de pago"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Club Bank Details */}
        <div className="p-3.5 rounded-xl bg-[#0a0e17] flex flex-col gap-2 border border-white/5">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[#bbcabf]">Entidad / Banco:</span>
            <span className="text-[#dfe2ef] font-bold">{bankName}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[#bbcabf]">Titular:</span>
            <span className="text-[#dfe2ef] font-medium truncate ml-2">
              {accountHolder}
            </span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[#bbcabf]">Cuenta / CBU:</span>
            <span className="text-[#dfe2ef] font-mono text-[12px]">
              {accountNumber}
            </span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[#bbcabf]">Alias / Llave:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[#4edea3] font-mono text-[14px] font-bold">
                {clubAlias}
              </span>
              <button
                onClick={() => onCopyAlias(clubAlias)}
                title="Copiar alias"
                className="text-[#bbcabf] hover:text-[#4edea3] transition-colors p-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  content_copy
                </span>
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-[#1c1f29]">
            <span className="text-[14px] text-[#dfe2ef] font-semibold">
              Total a transferir:
            </span>
            <span className="font-mono text-[22px] text-[#4edea3] font-bold">
              ${booking.total_price.toFixed(2)}
            </span>
          </div>
        </div>

        {uploadError && (
          <div className="p-3 rounded-xl bg-[#ffb4ab]/15 border border-[#ffb4ab]/30 text-[#ffb4ab] text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{uploadError}</span>
          </div>
        )}

        {/* Upload Zone */}
        <label
          htmlFor="receipt-upload"
          className="p-5 rounded-xl bg-[#1c1f29] text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-[#353943]/50 transition-colors border-2 border-dashed border-[#3c4a42] relative"
        >
          <input
            id="receipt-upload"
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-full bg-[#4edea3]/10 flex items-center justify-center text-[#4edea3] mb-1">
            <span className="material-symbols-outlined text-[28px]">
              {selectedFileName ? 'task' : 'cloud_upload'}
            </span>
          </div>
          <span className="text-[15px] font-bold text-[#dfe2ef]">
            {selectedFileName ? selectedFileName : 'Adjuntar captura o PDF'}
          </span>
          <span className="text-[12px] text-[#bbcabf]">
            {selectedFileName
              ? 'Archivo listo para enviar al club'
              : 'Formatos JPG, PNG o PDF de comprobante bancario (Máx 8MB)'}
          </span>
        </label>

        {/* Confirmation Button */}
        <button
          onClick={handleSubmit}
          disabled={isUploading}
          className="w-full py-3.5 px-4 rounded-xl bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-[16px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#4edea3]/20 cursor-pointer disabled:opacity-50"
          type="button"
        >
          {isUploading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">
                sync
              </span>
              <span>Subiendo Comprobante...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">check</span>
              <span>Enviar Comprobante Oficial</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
