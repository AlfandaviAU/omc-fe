'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get('token');
    const userRole = Cookies.get('role');
    if (!token) {
      router.push('/login');
    } else {
      setRole(userRole || 'member');

      // Initialize real-time sync
      const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/sync?token=${token}`);
      es.addEventListener('message', (event) => {
        if (event.data.startsWith('update_')) {
          window.dispatchEvent(new Event('sync_update'));
        }
      });

      return () => {
        es.close();
      };
    }
  }, [router]);

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('role');
    router.push('/login');
  };

  if (!role) return <div className="flex h-screen items-center justify-center bg-background"><p className="uppercase tracking-widest animate-pulse text-primary">Loading...</p></div>;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 bg-card border-r border-border flex flex-col shadow-lg z-10 relative">
        <div className="p-6 border-b border-border flex flex-col items-center text-center">
          <img src="/assets/OMC_NEW_LOGO.png" alt="Club Logo" className="h-24 object-contain mb-4 drop-shadow-md" />
          <h1 className="font-black text-2xl uppercase tracking-widest text-primary leading-tight">Outlaws</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Motorcycle Club</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2 pt-2">Clubhouse</div>
          <Link href="/dashboard" className="block px-3 py-2 text-sm uppercase tracking-wider font-semibold rounded-md hover:bg-secondary hover:text-secondary-foreground transition-colors">Armory Shop</Link>
          <Link href={role === 'admin' || role === 'sgt' ? '/dashboard/orders?view=my-orders' : '/dashboard/orders'} className="block px-3 py-2 text-sm uppercase tracking-wider font-semibold rounded-md hover:bg-secondary hover:text-secondary-foreground transition-colors">My Orders</Link>
          
          {(role === 'admin' || role === 'sgt') && (
            <>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2 pt-6">Officers Only</div>
              <Link href="/dashboard/orders" className="block px-3 py-2 text-sm uppercase tracking-wider font-semibold rounded-md hover:bg-secondary hover:text-secondary-foreground transition-colors">Orders & History</Link>
              {/*<Link href="/dashboard/orders?tab=by-account" className="block px-3 py-2 text-sm uppercase tracking-wider font-semibold rounded-md hover:bg-secondary hover:text-secondary-foreground transition-colors">History by Account</Link>*/}
              <Link href="/dashboard/manage" className="block px-3 py-2 text-sm uppercase tracking-wider font-semibold rounded-md hover:bg-secondary hover:text-secondary-foreground transition-colors">Manage Inventory</Link>
              <Link href="/dashboard/analytics" className="block px-3 py-2 text-sm uppercase tracking-wider font-semibold rounded-md hover:bg-secondary hover:text-secondary-foreground transition-colors">Analytics</Link>
            </>
          )}

          {role === 'admin' && (
            <>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2 pt-6">President Only</div>
              <Link href="/dashboard/members" className="block px-3 py-2 text-sm uppercase tracking-wider font-semibold rounded-md hover:bg-secondary hover:text-secondary-foreground transition-colors">Manage Members</Link>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 uppercase tracking-wider font-bold">
            <LogOut className="mr-2 h-4 w-4" />
            Ride Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto bg-background relative">
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-5">
          <img src="/assets/LOGO_TULISAN_OUTLAWS_1.png" alt="Background Texture" className="w-[80%] h-auto object-contain" />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
