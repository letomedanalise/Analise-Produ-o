import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Gestão Industrial - PCP & Produção',
  description: 'Sistema integrado de gestão da produção industrial para Extrusão, Impressão e Corte & Solda com controle de produtividade, perdas, paradas e cadastros dinâmicos.',
  openGraph: {
    title: 'Gestão Industrial - PCP & Produção',
    description: 'Sistema integrado de gestão da produção industrial para Extrusão, Impressão e Corte & Solda com controle de produtividade, perdas, paradas e cadastros dinâmicos.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestão Industrial - PCP & Produção',
    description: 'Sistema integrado de gestão da produção industrial para Extrusão, Impressão e Corte & Solda com controle de produtividade, perdas, paradas e cadastros dinâmicos.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
