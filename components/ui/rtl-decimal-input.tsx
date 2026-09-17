'use client';

import React, { useRef } from 'react';

export interface RtlDecimalInputProps {
  id?: string;
  name?: string;
  value: number;
  onChange: (val: number) => void;
  suffix?: string;
  prefix?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  title?: string;
  ariaLabel?: string;
}

/**
 * Converte valor numérico em centavos inteiros para exibição formatada pt-BR (ex: 1234 -> "12,34")
 */
export function formatCentsToDisplay(cents: number): string {
  const safeCents = Math.max(0, Math.floor(cents || 0));
  const floatVal = safeCents / 100;
  return floatVal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Input numérico com máscara decimal da direita para a esquerda (RTL Currency/Weight Mask).
 * Começa sempre no formato 0,00. Conforme os dígitos numéricos são pressionados,
 * a numeração entra pela direita e caminha para a esquerda:
 * Ex: 1 -> 0,01 | 12 -> 0,12 | 123 -> 1,23 | 1234 -> 12,34 | 12345 -> 123,45
 * Backspace apaga o dígito da extrema direita (divide por 10).
 * Delete redefine para 0,00.
 */
export function RtlDecimalInput({
  id,
  name,
  value,
  onChange,
  suffix = 'kg',
  prefix,
  disabled = false,
  required = false,
  className = '',
  inputClassName = '',
  title,
  ariaLabel,
}: RtlDecimalInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Valor atual convertido para centavos inteiros
  const cents = Math.round((Math.max(0, value || 0)) * 100);
  const displayString = formatCentsToDisplay(cents);

  // Garante que o cursor do input fique sempre na ponta direita
  const keepCursorAtEnd = () => {
    if (inputRef.current) {
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Permitir atalhos do sistema (Ctrl/Cmd + C, V, A, X, Z)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // Permitir teclas de navegação e controle
    if (
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Escape' ||
      e.key === 'F5'
    ) {
      return;
    }

    // Tecla Backspace: remove o último dígito da direita (divide por 10)
    if (e.key === 'Backspace') {
      e.preventDefault();
      const nextCents = Math.floor(cents / 10);
      onChange(nextCents / 100);
      requestAnimationFrame(keepCursorAtEnd);
      return;
    }

    // Tecla Delete: zera completamente para 0,00
    if (e.key === 'Delete') {
      e.preventDefault();
      onChange(0);
      requestAnimationFrame(keepCursorAtEnd);
      return;
    }

    // Tecla numérica (0 a 9)
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const digit = parseInt(e.key, 10);
      // Limite de segurança de 10 dígitos (até 9.999.999,99 kg)
      if (cents >= 999999999) return;
      const nextCents = (cents * 10) + digit;
      onChange(nextCents / 100);
      requestAnimationFrame(keepCursorAtEnd);
      return;
    }

    // Ignora qualquer outra tecla não numérica (letras, vírgula, ponto, símbolos)
    // para preservar rigorosamente a máscara contínua da direita para a esquerda
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const text = e.clipboardData.getData('text') || '';
    // Extrai apenas os números colados
    const digits = text.replace(/\D/g, '');
    if (digits.length > 0) {
      const parsedCents = parseInt(digits.slice(0, 10), 10) || 0;
      onChange(parsedCents / 100);
      requestAnimationFrame(keepCursorAtEnd);
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {prefix && (
        <span className="absolute left-3 text-xs font-semibold text-slate-400 select-none pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        value={displayString}
        onChange={() => {}} // Totalmente controlado via onKeyDown
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={keepCursorAtEnd}
        onFocus={keepCursorAtEnd}
        disabled={disabled}
        required={required}
        title={title || 'Digite os números (caminham da direita para a esquerda. Backspace apaga, Delete zera)'}
        aria-label={ariaLabel}
        className={`w-full text-right font-mono font-bold tracking-tight text-sm sm:text-base px-3 py-2 rounded-lg border transition-all ${
          prefix ? 'pl-8' : ''
        } ${suffix ? 'pr-10' : ''} ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs'
        } ${inputClassName}`}
      />
      {suffix && (
        <span className="absolute right-3 text-xs font-bold text-slate-400 select-none pointer-events-none uppercase">
          {suffix}
        </span>
      )}
    </div>
  );
}
