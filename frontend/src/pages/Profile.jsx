import { FiLogOut } from 'react-icons/fi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/format';

export default function Profile() {
  const { user, logout } = useAuth();
  return (
    <>
      <PageHeader title="Profile" />
      <Card className="max-w-xl">
        <dl className="space-y-4 text-sm">
          <div><dt className="text-muted">Name</dt><dd className="font-medium">{user.name}</dd></div>
          <div><dt className="text-muted">Email</dt><dd className="font-medium">{user.email}</dd></div>
          {user.createdAt && <div><dt className="text-muted">Member since</dt><dd className="font-medium">{formatDate(user.createdAt)}</dd></div>}
        </dl>
        <Button variant="secondary" className="mt-6" onClick={logout}><FiLogOut aria-hidden="true" /> Log out</Button>
      </Card>
    </>
  );
}
