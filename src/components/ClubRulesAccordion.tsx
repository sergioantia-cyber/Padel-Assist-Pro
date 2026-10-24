import React, { useState } from 'react';

export const ClubRulesAccordion: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const rules = [
    {
      title: 'Uso obligatorio de suela espiga',
      icon: 'sports_score',
      content:
        'Para preservar la fibra sintética y garantizar la tracción segura en césped monofilamento con arena, no se admiten zapatillas running o con suela de tacos agresivos. El club dispone de alquiler en pro-shop.',
    },
    {
      title: 'Cancelaciones gratuitas hasta 4h antes',
      icon: 'event_available',
      content:
        'Puedes reprogramar o anular tu reserva con reintegro íntegro a tu billetera de la app con un margen de al menos 4 horas previas al partido. Fuera de ese lapso se cargará el depósito de pista.',
    },
    {
      title: 'Alquiler de palas & Pro-Shop Oficial',
      icon: 'inventory_2',
      content:
        'En recepción encontrarás palas de test Bullpadel y Head ($3.500 / turno), tubos de pelotas presurizadas nuevas, overgrips y servicio de encordado rápido.',
    },
  ];

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[18px] font-bold text-[#dfe2ef]">
          Normas y Servicios
        </h3>
        <span className="text-[11px] font-bold text-[#bbcabf] uppercase tracking-wider">
          Reglamento 2025
        </span>
      </div>

      {rules.map((rule, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className="overflow-hidden rounded-xl bg-[#1c1f29]/70 backdrop-blur-sm border border-[#31353f]/60 transition-all duration-300"
          >
            <button
              onClick={() => toggleAccordion(idx)}
              className="w-full p-3.5 flex items-center justify-between text-left gap-3 cursor-pointer"
              type="button"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="material-symbols-outlined text-[#4edea3] text-[22px] shrink-0">
                  {rule.icon}
                </span>
                <span className="text-[14px] text-[#dfe2ef] font-medium truncate">
                  {rule.title}
                </span>
              </div>
              <span
                className={`material-symbols-outlined text-[#bbcabf] transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                }`}
              >
                expand_more
              </span>
            </button>
            {isOpen && (
              <div className="px-3.5 pb-3.5 text-[#bbcabf] text-[13px] leading-relaxed border-t border-[#31353f]/40 pt-2.5 animate-in fade-in duration-200">
                {rule.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
