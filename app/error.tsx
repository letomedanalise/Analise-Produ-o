'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Ocorreu um erro no sistema</h2>
      <p className="text-sm text-slate-600 mb-4">{error.message || 'Erro inesperado'}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
      >
        Tentar novamente
      </button>
    </div>
  );
}
