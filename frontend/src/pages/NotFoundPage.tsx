import { Home, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePhilSA } from '../PhilSAContext';

export default function NotFoundPage() {
  const { user } = usePhilSA();

  return (
    <main className="min-h-screen bg-philsa-bg flex items-center justify-center p-6">
      <section className="card-philsa w-full max-w-lg text-center space-y-6" aria-labelledby="not-found-title">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-philsa-navy flex items-center justify-center mx-auto">
          <SearchX className="w-8 h-8" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em]">Error 404</p>
          <h1 id="not-found-title" className="text-3xl font-extrabold text-philsa-navy">Page not found</h1>
          <p className="text-sm text-philsa-gray">The address may be incorrect, or the page may have moved.</p>
        </div>
        <Link to={user ? '/dashboard' : '/'} className="btn-primary inline-flex items-center justify-center gap-2">
          <Home className="w-4 h-4" aria-hidden="true" /> {user ? 'Return to dashboard' : 'Return home'}
        </Link>
      </section>
    </main>
  );
}
