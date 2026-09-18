'use client';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  User,
  Users,
  ShoppingBag,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  Eye,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Package,
  ShieldAlert,
  BadgeCheck,
  X,
  History,
  RotateCcw,
} from 'lucide-react';

type OrderItem = {
  ID: number;
  product_id: number;
  product?: {
    name: string;
    image_url?: string;
    price?: number;
  };
  quantity: number;
  price: number;
};

type UserInfo = {
  id?: number;
  ID?: number;
  username: string;
  role?: string;
};

type Order = {
  ID: number;
  user_id: number;
  user?: UserInfo;
  destination_id?: number;
  destination?: UserInfo;
  verifier_id?: number;
  verifier?: UserInfo;
  total_amount: number;
  proof_image: string;
  status: string; // pending, approved, rejected, completed
  items: OrderItem[];
  CreatedAt: string;
};

type Member = {
  ID: number;
  username: string;
  role: string;
};

type AccountItemBreakdown = {
  name: string;
  quantity: number;
  totalAmount: number;
  imageUrl?: string;
};

type AccountSummary = {
  id?: number;
  username: string;
  role: string;
  orders: Order[];
  totalOrders: number;
  completedOrders: number;
  approvedOrders: number;
  pendingOrders: number;
  rejectedOrders: number;
  totalSpent: number; // approved + completed
  totalRequisitioned: number; // all orders
  lastOrderDate: string | null;
  itemBreakdown: AccountItemBreakdown[];
};

const roleLabel: Record<string, string> = {
  admin: 'President',
  sgt: 'SGT At Arms',
  member: 'Member',
};

const getRoleBadge = (roleStr?: string) => {
  const r = roleStr?.toLowerCase() || 'member';
  if (r === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-950 text-red-400 border border-red-800/60">
        <BadgeCheck className="w-3 h-3 text-red-400" />
        President
      </span>
    );
  }
  if (r === 'sgt') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/40">
        <ShieldAlert className="w-3 h-3 text-primary" />
        SGT At Arms
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
      <User className="w-3 h-3 text-zinc-500" />
      Member
    </span>
  );
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase tracking-widest rounded border bg-yellow-500/10 text-yellow-500 border-yellow-500/40">
          <Clock className="w-3 h-3 animate-pulse" />
          Pending
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase tracking-widest rounded border bg-green-500/10 text-green-400 border-green-500/40">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase tracking-widest rounded border bg-blue-500/10 text-blue-400 border-blue-500/40">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase tracking-widest rounded border bg-red-500/10 text-red-500 border-red-500/40">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase tracking-widest rounded border bg-zinc-800 text-zinc-400 border-zinc-700">
          {status}
        </span>
      );
  }
};

function OrdersContent() {
  const searchParams = useSearchParams();
  const initialAccountParam = searchParams.get('account');
  const initialTabParam = searchParams.get('tab');
  const initialViewParam = searchParams.get('view');

  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<'all' | 'by-account' | 'my'>(
    initialViewParam === 'my-orders'
      ? 'my'
      : initialAccountParam || initialTabParam === 'by-account'
      ? 'by-account'
      : 'all'
  );
  const [selectedAccountUsername, setSelectedAccountUsername] = useState<string | null>(initialAccountParam || null);
  const [accountSearch, setAccountSearch] = useState('');
  const [feedSearch, setFeedSearch] = useState('');
  const [feedStatusFilter, setFeedStatusFilter] = useState('all');
  const [feedAccountFilter, setFeedAccountFilter] = useState('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');

  // Pagination for Feed
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Receipt image modal
  const [receiptModalImage, setReceiptModalImage] = useState<string | null>(null);

  const role = Cookies.get('role');
  const isAdminOrSgt = role === 'admin' || role === 'sgt' || role === 'officer';

  const fetchData = async () => {
    try {
      if (isAdminOrSgt) {
        const [ordersRes, usersRes] = await Promise.all([
          api.get('/api/orders'),
          api.get('/api/users').catch(() => ({ data: [] })),
        ]);
        setOrders(ordersRes.data || []);
        setUsers(usersRes.data || []);
      } else {
        const res = await api.get('/api/orders/me');
        setOrders(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load orders data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleSync = () => fetchData();
    window.addEventListener('sync_update', handleSync);
    return () => window.removeEventListener('sync_update', handleSync);
  }, [isAdminOrSgt]);

  // Update selection if URL searchParams change
  useEffect(() => {
    if (initialAccountParam) {
      setSelectedAccountUsername(initialAccountParam);
      setActiveTab('by-account');
    }
    if (initialViewParam === 'my-orders') {
      setActiveTab('my');
    }
  }, [initialAccountParam, initialViewParam]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/api/orders/${id}/status`, { status });
      fetchData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const deleteOrder = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this order record?')) return;
    try {
      await api.delete(`/api/orders/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete order');
    }
  };

  // Group orders by account for Admin & SGT
  const accountSummaries = useMemo<AccountSummary[]>(() => {
    if (!isAdminOrSgt) return [];

    const map = new Map<string, { user?: Member; orders: Order[] }>();

    // Seed map with all known users from /api/users
    users.forEach((u) => {
      map.set(u.username, { user: u, orders: [] });
    });

    // Add orders to corresponding account
    orders.forEach((o) => {
      const username = o.user?.username || `Member #${o.user_id}`;
      if (!map.has(username)) {
        map.set(username, {
          user: o.user ? { ID: o.user_id, username, role: o.user.role || 'member' } : undefined,
          orders: [],
        });
      }
      map.get(username)!.orders.push(o);
    });

    const summaries: AccountSummary[] = [];

    map.forEach(({ user, orders: userOrders }, username) => {
      let totalSpent = 0;
      let totalRequisitioned = 0;
      let completedOrders = 0;
      let approvedOrders = 0;
      let pendingOrders = 0;
      let rejectedOrders = 0;
      let lastOrderDate: string | null = null;

      const itemMap = new Map<string, AccountItemBreakdown>();

      userOrders.forEach((o) => {
        totalRequisitioned += o.total_amount;
        if (o.status === 'completed') completedOrders++;
        else if (o.status === 'approved') approvedOrders++;
        else if (o.status === 'pending') pendingOrders++;
        else if (o.status === 'rejected') rejectedOrders++;

        if (o.status === 'approved' || o.status === 'completed') {
          totalSpent += o.total_amount;
        }

        if (!lastOrderDate || new Date(o.CreatedAt) > new Date(lastOrderDate)) {
          lastOrderDate = o.CreatedAt;
        }

        o.items?.forEach((it) => {
          const name = it.product?.name || `Item #${it.product_id}`;
          const existing = itemMap.get(name);
          const subtotal = it.price * it.quantity;
          if (existing) {
            existing.quantity += it.quantity;
            existing.totalAmount += subtotal;
          } else {
            itemMap.set(name, {
              name,
              quantity: it.quantity,
              totalAmount: subtotal,
              imageUrl: it.product?.image_url,
            });
          }
        });
      });

      const itemBreakdown = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);

      summaries.push({
        id: user?.ID,
        username,
        role: user?.role || 'member',
        orders: userOrders.sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()),
        totalOrders: userOrders.length,
        completedOrders,
        approvedOrders,
        pendingOrders,
        rejectedOrders,
        totalSpent,
        totalRequisitioned,
        lastOrderDate,
        itemBreakdown,
      });
    });

    // Sort accounts: those with orders first, then by total spent desc
    return summaries.sort((a, b) => {
      if (a.totalOrders > 0 && b.totalOrders === 0) return -1;
      if (a.totalOrders === 0 && b.totalOrders > 0) return 1;
      return b.totalSpent - a.totalSpent;
    });
  }, [orders, users, isAdminOrSgt]);

  // Currently selected account summary
  const selectedAccountData = useMemo(() => {
    if (!selectedAccountUsername) return null;
    return accountSummaries.find((a) => a.username.toLowerCase() === selectedAccountUsername.toLowerCase()) || null;
  }, [accountSummaries, selectedAccountUsername]);

  // Filtered accounts for the By Account tab
  const filteredAccounts = useMemo(() => {
    return accountSummaries.filter((acc) => {
      if (accountSearch.trim()) {
        const q = accountSearch.toLowerCase();
        return acc.username.toLowerCase().includes(q) || acc.role.toLowerCase().includes(q);
      }
      return true;
    });
  }, [accountSummaries, accountSearch]);

  // Filtered orders for the All Orders Feed tab
  const filteredFeedOrders = useMemo(() => {
    return orders.filter((o) => {
      // Account filter
      if (feedAccountFilter !== 'all') {
        const orderUsername = o.user?.username || `Member #${o.user_id}`;
        if (orderUsername !== feedAccountFilter) return false;
      }
      // Status filter
      if (feedStatusFilter !== 'all' && o.status !== feedStatusFilter) {
        return false;
      }
      // Search query
      if (feedSearch.trim()) {
        const q = feedSearch.toLowerCase();
        const orderIdMatch = o.ID.toString().includes(q);
        const usernameMatch = o.user?.username?.toLowerCase().includes(q);
        const itemMatch = o.items?.some((it) => it.product?.name?.toLowerCase().includes(q));
        if (!orderIdMatch && !usernameMatch && !itemMatch) return false;
      }
      return true;
    });
  }, [orders, feedAccountFilter, feedStatusFilter, feedSearch]);

  // Overall statistics for officers
  const stats = useMemo(() => {
    const totalOrdersCount = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status === 'approved' || o.status === 'completed')
      .reduce((acc, o) => acc + o.total_amount, 0);
    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    const accountsWithPurchases = accountSummaries.filter((a) => a.totalOrders > 0).length;

    return {
      totalOrdersCount,
      totalRevenue,
      pendingCount,
      accountsWithPurchases,
    };
  }, [orders, accountSummaries]);

  // Orders for the selected account filtered by status
  const selectedAccountFilteredOrders = useMemo(() => {
    if (!selectedAccountData) return [];
    if (accountStatusFilter === 'all') return selectedAccountData.orders;
    return selectedAccountData.orders.filter((o) => o.status === accountStatusFilter);
  }, [selectedAccountData, accountStatusFilter]);

  // Feed pagination
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentFeedOrders = filteredFeedOrders.slice(indexOfFirst, indexOfLast);
  const totalFeedPages = Math.ceil(filteredFeedOrders.length / itemsPerPage);

  // My Orders (for when an admin/sgt wants their personal orders, or regular member)
  const myOrders = useMemo(() => {
    if (!isAdminOrSgt) return orders;
    const myUsername = Cookies.get('username');
    // or filter by user matching currently logged in username
    if (myUsername) {
      return orders.filter((o) => o.user?.username === myUsername);
    }
    return orders;
  }, [orders, isAdminOrSgt]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="uppercase tracking-widest animate-pulse text-primary font-bold">
          Loading Purchase Records...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black uppercase tracking-wider text-primary">
              {isAdminOrSgt ? 'Club Orders & Purchase History' : 'My Orders'}
            </h1>
            {isAdminOrSgt && (
              <Badge className="bg-primary/20 text-primary border border-primary/40 font-black tracking-widest text-xs uppercase px-2.5 py-1">
                Officer Access
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm uppercase tracking-widest mt-1">
            {isAdminOrSgt
              ? 'Comprehensive audit and account purchase history for President & SGT At Arms'
              : 'Track and review your armory requisitions'}
          </p>
        </div>

        {isAdminOrSgt && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="border-border text-zinc-300 hover:text-white hover:bg-secondary uppercase font-bold text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Officer Navigation Tabs */}
      {isAdminOrSgt && (
        <div className="space-y-4">
          {/* High-level stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-zinc-950 border-zinc-800/80 shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Total Accounts</p>
                  <p className="text-2xl font-black text-white mt-0.5">{stats.accountsWithPurchases}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">With Purchase History</p>
                </div>
                <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800/80 shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Total Club Orders</p>
                  <p className="text-2xl font-black text-white mt-0.5">{stats.totalOrdersCount}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">Requisitions Placed</p>
                </div>
                <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800/80 shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Completed Sales</p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">${stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">Settled Armory Value</p>
                </div>
                <div className="w-10 h-10 rounded bg-emerald-950/40 border border-emerald-900/50 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800/80 shadow-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Pending Review</p>
                  <p className="text-2xl font-black text-yellow-500 mt-0.5">{stats.pendingCount}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">Awaiting Officer Action</p>
                </div>
                <div className="w-10 h-10 rounded bg-yellow-950/40 border border-yellow-900/50 flex items-center justify-center text-yellow-400">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-zinc-800 bg-zinc-950/50 p-1.5 rounded-lg gap-2">
            <button
              onClick={() => {
                setActiveTab('by-account');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'by-account'
                  ? 'bg-primary text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Purchase History by Account ({accountSummaries.filter((a) => a.totalOrders > 0).length})
            </button>

            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedAccountUsername(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <History className="w-4 h-4" />
              All Orders Feed ({orders.length})
            </button>

            <button
              onClick={() => {
                setActiveTab('my');
                setSelectedAccountUsername(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'my'
                  ? 'bg-primary text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <User className="w-4 h-4" />
              My Personal Purchases
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: PURCHASE HISTORY BY ACCOUNT (Officer Only)                         */}
      {/* ========================================================================= */}
      {isAdminOrSgt && activeTab === 'by-account' && (
        <div className="space-y-6">
          {selectedAccountData ? (
            /* Selected Account Detailed History */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-6 rounded-xl border border-zinc-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4 z-10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAccountUsername(null)}
                    className="border-zinc-700 hover:border-primary text-zinc-300 hover:text-primary uppercase font-bold text-xs mt-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    All Accounts
                  </Button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                        {selectedAccountData.username}
                      </h2>
                      {getRoleBadge(selectedAccountData.role)}
                    </div>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">
                      Full Requisition Dossier & Purchase Record
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 z-10">
                  <div className="bg-zinc-900/90 border border-zinc-800 px-4 py-2 rounded-lg text-right">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Total Orders</p>
                    <p className="text-xl font-black text-white">{selectedAccountData.totalOrders}</p>
                  </div>
                  <div className="bg-zinc-900/90 border border-zinc-800 px-4 py-2 rounded-lg text-right">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Total Spent</p>
                    <p className="text-xl font-black text-primary">
                      ${selectedAccountData.totalSpent.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Aggregated Products Purchased Breakdown */}
              <Card className="bg-zinc-950 border-zinc-800 shadow-lg">
                <CardHeader className="pb-3 border-b border-zinc-800/80">
                  <CardTitle className="text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Armory Equipment Acquired by {selectedAccountData.username}
                  </CardTitle>
                  <CardDescription className="text-xs uppercase tracking-widest text-zinc-400">
                    Aggregated total quantities and expenditures for all requisitioned assets
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {selectedAccountData.itemBreakdown.length === 0 ? (
                    <p className="text-xs uppercase tracking-wider text-zinc-500 italic py-2">
                      No weapons or armory assets purchased yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedAccountData.itemBreakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 object-cover rounded border border-zinc-700 bg-zinc-950"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                                <Package className="w-4 h-4 text-zinc-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-xs uppercase tracking-wider text-zinc-200">{item.name}</p>
                              <p className="text-[11px] text-primary font-black uppercase">
                                Total Qty: <span className="text-white">{item.quantity}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-zinc-300">
                              ${item.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Filter for this Account's Orders */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Filter Orders:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'pending', 'approved', 'completed', 'rejected'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setAccountStatusFilter(st)}
                        className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-widest transition-all ${
                          accountStatusFilter === st
                            ? 'bg-primary text-black'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold">
                  Showing {selectedAccountFilteredOrders.length} of {selectedAccountData.orders.length} orders
                </div>
              </div>

              {/* List of Orders for Selected Account */}
              <div className="space-y-4">
                {selectedAccountFilteredOrders.length === 0 ? (
                  <div className="py-12 text-center bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-lg">
                    <p className="uppercase tracking-widest font-bold text-zinc-500">
                      No {accountStatusFilter !== 'all' ? accountStatusFilter : ''} orders found for this account.
                    </p>
                  </div>
                ) : (
                  selectedAccountFilteredOrders.map((o) => (
                    <OrderCard
                      key={o.ID}
                      order={o}
                      isAdminOrOfficer={isAdminOrSgt}
                      onUpdateStatus={updateStatus}
                      onDeleteOrder={deleteOrder}
                      onPreviewReceipt={(img) => setReceiptModalImage(img)}
                      onSelectAccount={setSelectedAccountUsername}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Accounts Overview Grid / List */
            <div className="space-y-6">
              {/* Account Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search account username..."
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="pl-9 bg-black/60 border-zinc-700 text-xs uppercase placeholder:normal-case h-9"
                  />
                  {accountSearch && (
                    <button
                      onClick={() => setAccountSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                  {filteredAccounts.length} Registered Accounts Available
                </div>
              </div>

              {/* Accounts Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAccounts.map((acc) => (
                  <Card
                    key={acc.username}
                    className={`bg-zinc-950 border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                      acc.totalOrders > 0
                        ? 'border-zinc-800 hover:border-primary/60 hover:shadow-lg'
                        : 'border-zinc-900/80 opacity-70 hover:opacity-100 hover:border-zinc-700'
                    }`}
                    onClick={() => setSelectedAccountUsername(acc.username)}
                  >
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-primary/20 group-hover:bg-primary transition-colors pointer-events-none" />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center font-black text-primary text-sm uppercase">
                            {acc.username.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="uppercase tracking-wider text-base text-white font-black group-hover:text-primary transition-colors">
                              {acc.username}
                            </CardTitle>
                            <div className="mt-1">{getRoleBadge(acc.role)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-primary">
                            ${acc.totalSpent.toLocaleString()}
                          </span>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Spent</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3 text-xs space-y-2">
                      <div className="flex items-center justify-between p-2 rounded bg-black/50 border border-zinc-900">
                        <span className="text-zinc-400 uppercase font-bold text-[10px] tracking-wider">
                          Requisitions
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-300 font-black">
                            {acc.totalOrders} total
                          </Badge>
                          {acc.pendingOrders > 0 && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-[10px] font-black">
                              {acc.pendingOrders} pending
                            </Badge>
                          )}
                          {acc.completedOrders > 0 && (
                            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-black">
                              {acc.completedOrders} completed
                            </Badge>
                          )}
                        </div>
                      </div>

                      {acc.lastOrderDate ? (
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                          Last Order: {new Date(acc.lastOrderDate).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider italic">No purchase history yet</p>
                      )}
                    </CardContent>
                    <CardFooter className="pt-2 border-t border-zinc-900 bg-black/40 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-primary group-hover:underline uppercase tracking-wider flex items-center">
                        View Purchase Dossier
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </span>
                      {acc.itemBreakdown.length > 0 && (
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">
                          {acc.itemBreakdown.length} unique items
                        </span>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ALL ORDERS FEED (with Account Filter & Actions)                   */}
      {/* ========================================================================= */}
      {isAdminOrSgt && activeTab === 'all' && (
        <div className="space-y-6">
          {/* Feed Filter Controls */}
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search by ID, member, item..."
                  value={feedSearch}
                  onChange={(e) => {
                    setFeedSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 bg-black/60 border-zinc-700 text-xs uppercase placeholder:normal-case h-9"
                />
              </div>

              {/* Filter by Account */}
              <div>
                <select
                  value={feedAccountFilter}
                  onChange={(e) => {
                    setFeedAccountFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 rounded-md bg-black/60 border border-zinc-700 text-xs uppercase px-3 text-zinc-200 focus:outline-none focus:border-primary font-bold"
                >
                  <option value="all">All Accounts (Club-Wide)</option>
                  {accountSummaries.map((acc) => (
                    <option key={acc.username} value={acc.username}>
                      {acc.username} ({acc.totalOrders} orders - ${acc.totalSpent.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Status */}
              <div>
                <select
                  value={feedStatusFilter}
                  onChange={(e) => {
                    setFeedStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 rounded-md bg-black/60 border border-zinc-700 text-xs uppercase px-3 text-zinc-200 focus:outline-none focus:border-primary font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 uppercase tracking-widest pt-1 border-t border-zinc-900">
              <span>Found {filteredFeedOrders.length} matching order records</span>
              {(feedSearch || feedAccountFilter !== 'all' || feedStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setFeedSearch('');
                    setFeedAccountFilter('all');
                    setFeedStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className="text-primary hover:underline font-bold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Feed List */}
          <div className="space-y-6">
            {filteredFeedOrders.length === 0 ? (
              <div className="py-12 text-center bg-zinc-950 border-2 border-dashed border-primary/40 rounded-lg">
                <p className="uppercase tracking-widest font-bold text-primary">No orders match the current filter.</p>
              </div>
            ) : (
              <>
                {currentFeedOrders.map((o) => (
                  <OrderCard
                    key={o.ID}
                    order={o}
                    isAdminOrOfficer={isAdminOrSgt}
                    onUpdateStatus={updateStatus}
                    onDeleteOrder={deleteOrder}
                    onPreviewReceipt={(img) => setReceiptModalImage(img)}
                    onSelectAccount={(username) => {
                      setSelectedAccountUsername(username);
                      setActiveTab('by-account');
                    }}
                  />
                ))}

                {/* Pagination Controls */}
                {totalFeedPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-8 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="uppercase font-black text-xs border-primary/20 text-primary hover:bg-primary/10"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      Page {currentPage} of {totalFeedPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.min(totalFeedPages, p + 1))}
                      disabled={currentPage === totalFeedPages}
                      className="uppercase font-black text-xs border-primary/20 text-primary hover:bg-primary/10"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MY ORDERS (Members & Personal View for Officers)                   */}
      {/* ========================================================================= */}
      {(!isAdminOrSgt || activeTab === 'my') && (
        <div className="space-y-6">
          {myOrders.length === 0 ? (
            <div className="py-12 text-center bg-zinc-950 border-2 border-dashed border-primary/50 rounded-lg">
              <p className="uppercase tracking-widest font-bold text-primary">You have no orders on the books.</p>
            </div>
          ) : (
            myOrders.map((o) => (
              <OrderCard
                key={o.ID}
                order={o}
                isAdminOrOfficer={false}
                onUpdateStatus={updateStatus}
                onDeleteOrder={deleteOrder}
                onPreviewReceipt={(img) => setReceiptModalImage(img)}
              />
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECEIPT PREVIEW MODAL                                                    */}
      {/* ========================================================================= */}
      {receiptModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setReceiptModalImage(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-3xl w-full p-4 relative flex flex-col items-center max-h-[90vh] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <p className="font-black text-sm uppercase tracking-wider text-primary">Transfer Receipt Slip</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={receiptModalImage}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 text-xs flex items-center gap-1 uppercase font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Original
                </a>
                <button
                  onClick={() => setReceiptModalImage(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-auto w-full flex items-center justify-center p-4">
              <img
                src={receiptModalImage}
                alt="Proof of Transfer"
                className="max-h-[70vh] object-contain rounded border border-zinc-800 bg-black"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Order Card Component
function OrderCard({
  order,
  isAdminOrOfficer,
  onUpdateStatus,
  onDeleteOrder,
  onPreviewReceipt,
  onSelectAccount,
}: {
  order: Order;
  isAdminOrOfficer: boolean;
  onUpdateStatus: (id: number, status: string) => void;
  onDeleteOrder: (id: number) => void;
  onPreviewReceipt: (img: string) => void;
  onSelectAccount?: (username: string) => void;
}) {
  const username = order.user?.username || `Member ${order.user_id}`;
  const userRole = order.user?.role;
  const destinationName = order.destination?.username;

  return (
    <Card className="border-zinc-800 bg-zinc-950 shadow-lg relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-1 h-full bg-primary/10 group-hover:bg-primary/30 transition-colors pointer-events-none" />
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CardTitle className="uppercase tracking-wider text-white text-lg">Order #{order.ID}</CardTitle>
            {getStatusBadge(order.status)}
          </div>
          <CardDescription className="text-xs space-y-1.5 mt-2 text-zinc-400">
            <div>
              Placed:{' '}
              <span className="text-zinc-300 font-semibold">{new Date(order.CreatedAt).toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2">
              <span>Requested by:</span>
              <span className="font-black text-primary uppercase">{username}</span>
              {getRoleBadge(userRole)}
              {isAdminOrOfficer && onSelectAccount && order.user?.username && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectAccount(order.user!.username)}
                  className="h-6 px-2 text-[10px] text-zinc-400 hover:text-primary uppercase tracking-wider font-bold hover:bg-zinc-900 ml-1"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View Account History
                </Button>
              )}
            </div>

            {destinationName && (
              <div>
                Requisition SGT:{' '}
                <span className="font-bold text-zinc-300 uppercase">{destinationName}</span>
              </div>
            )}

            {order.status !== 'pending' && (
              <div>
                Handled by:{' '}
                <span className="font-bold text-zinc-400 uppercase">
                  {order.verifier?.username || `Officer ${order.verifier_id || 'Unknown'}`}
                </span>
              </div>
            )}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <div className="bg-black/60 p-4 rounded-md mb-2 border border-zinc-800">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 border-b border-zinc-800 pb-1">
            Items Requisitioned
          </div>
          <ul className="space-y-2">
            {order.items?.map((item) => (
              <li
                key={item.ID}
                className="flex justify-between items-center text-sm bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50"
              >
                <div className="flex items-center gap-3">
                  {item.product?.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-10 h-10 object-cover rounded border border-zinc-700 bg-zinc-950"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-zinc-950 rounded border border-zinc-800 flex items-center justify-center">
                      <Package className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                  <span className="text-zinc-300 font-bold uppercase tracking-wider">
                    {item.product?.name || `Item #${item.product_id}`}{' '}
                    <span className="text-primary text-xs mx-1">x</span> {item.quantity}
                  </span>
                </div>
                <span className="font-black text-white">${(item.price * item.quantity).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between items-center mt-4 pt-2 border-t border-zinc-800">
            <span className="text-sm font-bold uppercase tracking-wider text-zinc-500">Total Order Amount</span>
            <span className="text-xl font-black text-primary">${order.total_amount.toLocaleString()}</span>
          </div>

          {order.proof_image && (
            <div className="mt-4 pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Proof of Bank / Transfer Receipt
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreviewReceipt(order.proof_image)}
                  className="h-6 px-2 text-[10px] text-primary uppercase font-bold tracking-wider hover:bg-primary/10"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Inspect Slip
                </Button>
              </div>
              <div
                className="cursor-pointer group/img inline-block relative rounded-md overflow-hidden border border-zinc-700 max-w-sm"
                onClick={() => onPreviewReceipt(order.proof_image)}
              >
                <img
                  src={order.proof_image}
                  alt="Proof of Transfer"
                  className="max-w-full h-auto max-h-48 object-contain bg-zinc-950/50 group-hover/img:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-xs uppercase font-black tracking-widest text-primary bg-black/80 px-2 py-1 rounded">
                    Click to Zoom
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {isAdminOrOfficer && (
        <CardFooter className="flex flex-wrap gap-2 pt-0 border-t border-zinc-900 mt-2 p-4 bg-black/40">
          <span className="w-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
            Officer Action Controls
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateStatus(order.ID, 'approved')}
            className="text-green-400 border-green-500/20 hover:text-green-300 hover:bg-green-500/10 uppercase tracking-wider text-xs font-black"
          >
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateStatus(order.ID, 'rejected')}
            className="text-red-400 border-red-500/20 hover:text-red-300 hover:bg-red-500/10 uppercase tracking-wider text-xs font-black"
          >
            Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateStatus(order.ID, 'completed')}
            className="text-blue-400 border-blue-500/20 hover:text-blue-300 hover:bg-blue-500/10 uppercase tracking-wider text-xs font-black"
          >
            Complete
          </Button>
          <div className="flex-grow" />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDeleteOrder(order.ID)}
            className="uppercase tracking-wider text-xs font-black bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default function Orders() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <p className="uppercase tracking-widest animate-pulse text-primary font-bold">Loading Orders...</p>
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
