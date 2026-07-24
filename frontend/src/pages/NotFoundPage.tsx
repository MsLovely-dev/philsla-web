import { Home, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePhilSA } from '../PhilSAContext';
import { PageState } from '../components/ui';

export default function NotFoundPage() {
  const { user } = usePhilSA();

  return (
    <PageState
      title="Page not found"
      message="The address may be incorrect, or the page may have moved."
      icon={SearchX}
      action={(
        <Link to={user ? '/dashboard' : '/'} className="btn-primary inline-flex items-center justify-center gap-2">
          <Home className="w-4 h-4" aria-hidden="true" /> {user ? 'Return to dashboard' : 'Return home'}
        </Link>
      )}
    />
  );
}
