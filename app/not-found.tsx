import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Página não encontrada</h2>
      <p className="text-slate-600 mb-4">O recurso solicitado não existe.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
