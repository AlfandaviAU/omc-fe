'use client';
import { toast } from "sonner";
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
  Crosshair,
  BadgeCheck,
  X,
  History,
  RotateCcw,
  FileDown,
  Calendar,
  Printer,
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
  photo_url?: string;
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
  photo_url?: string;
};

type AccountItemBreakdown = {
  name: string;
  quantity: number;
  totalAmount: number;
  imageUrl?: string;
  lastPurchaseDate?: string;
  lastPurchaseQuantity?: number;
};

type AccountSummary = {
  id?: number;
  username: string;
  role: string;
  photoUrl: string | null;
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
  const [selectedAccountOrderSearch, setSelectedAccountOrderSearch] = useState('');
  const [feedSearch, setFeedSearch] = useState('');
  const [feedStatusFilter, setFeedStatusFilter] = useState('all');
  const [feedAccountFilter, setFeedAccountFilter] = useState('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');

  // Pagination for Feed
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Pagination for Accounts List
  const [accountCurrentPage, setAccountCurrentPage] = useState(1);
  const accountsPerPage = 12;

  // Pagination for Selected Account Orders
  const [selectedAccountCurrentPage, setSelectedAccountCurrentPage] = useState(1);
  const accountOrdersPerPage = 5;

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
      toast.error('Failed to update status');
    }
  };

  const deleteOrder = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this order record?')) return;
    try {
      await api.delete(`/api/orders/${id}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete order');
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
            if (new Date(o.CreatedAt) > new Date(existing.lastPurchaseDate!)) {
              existing.lastPurchaseDate = o.CreatedAt;
              existing.lastPurchaseQuantity = it.quantity;
            }
          } else {
            itemMap.set(name, {
              name,
              quantity: it.quantity,
              totalAmount: subtotal,
              imageUrl: it.product?.image_url,
              lastPurchaseDate: o.CreatedAt,
              lastPurchaseQuantity: it.quantity,
            });
          }
        });
      });

      const itemBreakdown = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);

      summaries.push({
        id: user?.ID,
        username,
        role: user?.role || 'member',
        photoUrl: (user as any)?.photo_url || null,
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

  // Orders for the selected account filtered by status and search
  const selectedAccountFilteredOrders = useMemo(() => {
    if (!selectedAccountData) return [];
    let list = selectedAccountData.orders;
    
    if (accountStatusFilter !== 'all') {
      list = list.filter((o) => o.status === accountStatusFilter);
    }
    
    if (selectedAccountOrderSearch.trim()) {
      const q = selectedAccountOrderSearch.toLowerCase();
      list = list.filter((o) => {
        const orderIdMatch = o.ID.toString().includes(q);
        const itemMatch = o.items?.some((it) => it.product?.name?.toLowerCase().includes(q));
        return orderIdMatch || itemMatch;
      });
    }
    
    return list;
  }, [selectedAccountData, accountStatusFilter, selectedAccountOrderSearch]);

  // Selected Account Orders pagination
  const indexOfLastSelectedAccountOrder = selectedAccountCurrentPage * accountOrdersPerPage;
  const indexOfFirstSelectedAccountOrder = indexOfLastSelectedAccountOrder - accountOrdersPerPage;
  const currentSelectedAccountOrders = selectedAccountFilteredOrders.slice(indexOfFirstSelectedAccountOrder, indexOfLastSelectedAccountOrder);
  const totalSelectedAccountPages = Math.ceil(selectedAccountFilteredOrders.length / accountOrdersPerPage);

  // Accounts pagination
  const indexOfLastAccount = accountCurrentPage * accountsPerPage;
  const indexOfFirstAccount = indexOfLastAccount - accountsPerPage;
  const currentAccounts = filteredAccounts.slice(indexOfFirstAccount, indexOfLastAccount);
  const totalAccountPages = Math.ceil(filteredAccounts.length / accountsPerPage);

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

  // Export report states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFilter, setExportDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [exportSgtFilter, setExportSgtFilter] = useState('all');

  // Available SGTs for Admin filtering
  const availableSgts = useMemo(() => {
    const sgts = new Set<string>();
    orders.forEach(o => {
      if (o.status !== 'pending' && o.verifier?.username) {
        sgts.add(o.verifier.username);
      }
    });
    return Array.from(sgts);
  }, [orders]);

  // Orders available for export based on role and filter
  const exportableOrders = useMemo(() => {
    if (!isAdminOrSgt) return [];
    const myUsername = Cookies.get('username');
    const myRole = Cookies.get('role');
    
    return orders.filter((o) => {
      const isHandled = o.status !== 'pending'; // Only show handled orders
      if (!isHandled) return false;
      
      if (myRole === 'admin') {
        if (exportSgtFilter === 'all') return true;
        return o.verifier?.username === exportSgtFilter;
      } else {
        return o.verifier?.username === myUsername;
      }
    });
  }, [orders, isAdminOrSgt, exportSgtFilter]);

  // Filter verified orders by date
  const filteredExportOrders = useMemo(() => {
    if (!exportDateFilter) return exportableOrders;
    return exportableOrders.filter((o) => {
      const orderDate = new Date(o.CreatedAt).toISOString().split('T')[0];
      const verifiedDate = new Date(o.CreatedAt).toISOString().split('T')[0];
      return orderDate === exportDateFilter || verifiedDate === exportDateFilter;
    });
  }, [exportableOrders, exportDateFilter]);

  // Generate and open printable report
  const exportDailyReport = () => {
    const myRole = Cookies.get('role');
    let reportOfficerName = Cookies.get('username') || 'Officer';
    
    if (myRole === 'admin') {
      reportOfficerName = exportSgtFilter === 'all' ? 'All Officers / SGTs' : exportSgtFilter;
    }

    const reportDate = exportDateFilter || new Date().toISOString().split('T')[0];
    const ordersToExport = filteredExportOrders;

    // Build member recapitulation
    const memberRecap = new Map<string, {
      username: string;
      role: string;
      orders: Order[];
      totalAmount: number;
      items: Map<string, { name: string; quantity: number; price: number; imageUrl?: string }>;
    }>();

    ordersToExport.forEach((o) => {
      const username = o.user?.username || `Member #${o.user_id}`;
      if (!memberRecap.has(username)) {
        memberRecap.set(username, {
          username,
          role: o.user?.role || 'member',
          orders: [],
          totalAmount: 0,
          items: new Map(),
        });
      }
      const recap = memberRecap.get(username)!;
      recap.orders.push(o);
      recap.totalAmount += o.total_amount;

      o.items?.forEach((it) => {
        const itemName = it.product?.name || `Item #${it.product_id}`;
        const existing = recap.items.get(itemName);
        if (existing) {
          existing.quantity += it.quantity;
          existing.price += it.price * it.quantity;
        } else {
          recap.items.set(itemName, {
            name: itemName,
            quantity: it.quantity,
            price: it.price * it.quantity,
            imageUrl: it.product?.image_url,
          });
        }
      });
    });

    const totalVerified = ordersToExport.length;
    const totalApproved = ordersToExport.filter((o) => o.status === 'approved').length;
    const totalCompleted = ordersToExport.filter((o) => o.status === 'completed').length;
    const totalRejected = ordersToExport.filter((o) => o.status === 'rejected').length;
    const totalValue = ordersToExport.reduce((acc, o) => acc + o.total_amount, 0);

    // Build HTML report
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Officer Daily Report - ${reportOfficerName} - ${reportDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #e4e4e7; padding: 24px; line-height: 1.5; }
    .report { max-width: 900px; margin: 0 auto; }
    .header { text-align: center; padding: 32px 24px; border: 2px solid #eab308; border-radius: 12px; margin-bottom: 32px; background: linear-gradient(180deg, rgba(234,179,8,0.1) 0%, transparent 100%); }
    .header h1 { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #eab308; margin-bottom: 4px; }
    .header .subtitle { font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #71717a; margin-bottom: 16px; }
    .header .meta { display: flex; justify-content: center; gap: 32px; margin-top: 16px; }
    .header .meta-item { text-align: center; }
    .header .meta-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #71717a; font-weight: 700; }
    .header .meta-item .value { font-size: 18px; font-weight: 900; color: #fff; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #eab308; padding-bottom: 8px; border-bottom: 2px solid #27272a; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .section-title::before { content: ''; display: inline-block; width: 4px; height: 20px; background: #eab308; border-radius: 2px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
    .stat-card { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-card .stat-value { font-size: 24px; font-weight: 900; }
    .stat-card .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #71717a; font-weight: 700; margin-top: 4px; }
    .stat-green { color: #4ade80; }
    .stat-blue { color: #60a5fa; }
    .stat-red { color: #f87171; }
    .stat-yellow { color: #eab308; }
    .member-card { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .member-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #27272a; }
    .member-name { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; }
    .member-role { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; padding: 2px 8px; border-radius: 4px; background: #27272a; color: #a1a1aa; }
    .member-total { font-size: 20px; font-weight: 900; color: #eab308; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .items-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; padding: 8px 12px; border-bottom: 1px solid #27272a; font-weight: 700; }
    .items-table td { padding: 8px 12px; border-bottom: 1px solid #18181b; font-size: 13px; }
    .items-table .item-name { font-weight: 700; color: #e4e4e7; }
    .items-table .item-qty { color: #eab308; font-weight: 700; }
    .items-table .item-price { font-weight: 800; color: #fff; text-align: right; }
    .order-card { background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .order-id { font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; }
    .status-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 3px 10px; border-radius: 4px; }
    .status-approved { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
    .status-completed { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
    .status-rejected { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
    .proof-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid #27272a; }
    .proof-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #71717a; font-weight: 700; margin-bottom: 8px; }
    .proof-img { max-width: 300px; max-height: 200px; object-fit: contain; border-radius: 6px; border: 1px solid #27272a; background: #09090b; }
    .footer { text-align: center; padding: 24px; border-top: 2px solid #27272a; margin-top: 32px; color: #52525b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; }
    .print-hint { text-align: center; margin-bottom: 24px; padding: 12px; background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.3); border-radius: 8px; }
    .print-hint span { font-size: 12px; color: #eab308; font-weight: 700; }
    .print-btn { background: #eab308; color: #000; border: none; padding: 8px 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 6px; cursor: pointer; font-size: 13px; margin-left: 12px; }
    .print-btn:hover { background: #facc15; }
    @media print {
      body { background: #fff; color: #000; padding: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-hint { display: none; }
      .header { border-color: #000; background: none; }
      .header h1 { color: #000; }
      .member-card, .order-card, .stat-card { border-color: #ccc; background: #f9f9f9; }
      .stat-card .stat-value { color: #000; }
      .member-name { color: #000; }
      .items-table td { color: #000; }
      .proof-img { max-height: 150px; }
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="print-hint">
      <span>Use Ctrl+P (or Cmd+P) to print or save as PDF</span>
      <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
    </div>

    <div class="header">
      <h1>Officer Daily Action Report</h1>
      <div class="subtitle">Outlaws Motorcycle Club — Verification Recapitulation</div>
      <div class="meta">
        <div class="meta-item">
          <div class="label">Officer</div>
          <div class="value">${reportOfficerName}</div>
        </div>
        <div class="meta-item">
          <div class="label">Report Date</div>
          <div class="value">${new Date(reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div class="meta-item">
          <div class="label">Generated</div>
          <div class="value">${new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value stat-yellow">${totalVerified}</div>
        <div class="stat-label">Total Verified</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-green">${totalApproved}</div>
        <div class="stat-label">Approved</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-blue">${totalCompleted}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-red">${totalRejected}</div>
        <div class="stat-label">Rejected</div>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="stat-card">
        <div class="stat-value stat-yellow">$${totalValue.toLocaleString()}</div>
        <div class="stat-label">Total Value Processed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${memberRecap.size}</div>
        <div class="stat-label">Members Verified</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Member Recapitulation</div>
      ${Array.from(memberRecap.values()).map(member => `
        <div class="member-card">
          <div class="member-header">
            <div>
              <div class="member-name">${member.username}</div>
              <span class="member-role">${roleLabel[member.role] || member.role}</span>
            </div>
            <div style="text-align: right;">
              <div class="member-total">$${member.totalAmount.toLocaleString()}</div>
              <div style="font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 700;">${member.orders.length} order(s)</div>
            </div>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from(member.items.values()).map(item => `
                <tr>
                  <td class="item-name">${item.name}</td>
                  <td class="item-qty">x${item.quantity}</td>
                  <td class="item-price">$${item.price.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <div class="section-title">Detailed Order Records</div>
      ${ordersToExport.map(o => `
        <div class="order-card">
          <div class="order-header">
            <div>
              <span class="order-id">Order #${o.ID}</span>
              <span style="margin-left: 8px; font-size: 12px; color: #71717a;">by <strong style="color: #eab308;">${o.user?.username || 'Unknown'}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="status-badge status-${o.status}">${o.status}</span>
              <strong style="font-size: 16px; color: #fff;">$${o.total_amount.toLocaleString()}</strong>
            </div>
          </div>
          <div style="font-size: 11px; color: #71717a; margin-bottom: 8px;">
            Placed: ${new Date(o.CreatedAt).toLocaleString()}
            ${o.destination?.username ? ` · SGT Requested: ${o.destination.username}` : ''}
            <br/><span style="color: #60a5fa; font-weight: bold;">Verified by: ${o.verifier?.username || 'Unknown'}</span>
          </div>
          <table class="items-table">
            <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right;">Price</th></tr></thead>
            <tbody>
              ${(o.items || []).map(item => `
                <tr>
                  <td class="item-name">${item.product?.name || 'Item #' + item.product_id}</td>
                  <td class="item-qty">x${item.quantity}</td>
                  <td class="item-price">$${(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${o.proof_image ? `
            <div class="proof-section">
              <div class="proof-label">Proof of Transfer</div>
              <img src="${o.proof_image}" class="proof-img" alt="Proof" onerror="this.style.display='none'" />
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    <div class="footer">
      Report generated by Outlaws MC System · ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  useEffect(() => {
    setAccountCurrentPage(1);
  }, [accountSearch]);

  useEffect(() => {
    setSelectedAccountCurrentPage(1);
  }, [accountStatusFilter, selectedAccountUsername, selectedAccountOrderSearch]);

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
              onClick={() => setShowExportModal(true)}
              className="border-primary/30 text-primary hover:text-black hover:bg-primary uppercase font-bold text-xs cursor-pointer transition-all"
            >
              <FileDown className="w-3.5 h-3.5 mr-1.5" />
              Export Report
            </Button>
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

              {/* Blue Vest Tracker */}
              <Card className="bg-zinc-950 border-zinc-800 shadow-lg">
                <CardHeader className="pb-3 border-b border-zinc-800/80">
                  <CardTitle className="text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-500" />
                    Blue Vest Tracker
                  </CardTitle>
                  <CardDescription className="text-xs uppercase tracking-widest text-zinc-400">
                    Recent purchase history (last 30 days) of Blue Vests for {selectedAccountData.username}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {(() => {
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

                    const blueVestOrders = selectedAccountData.orders
                      .filter(o => o.status === 'approved' || o.status === 'completed')
                      .filter(o => new Date(o.CreatedAt) >= oneMonthAgo)
                      .flatMap(o => {
                        const vestItems = o.items?.filter(it => (it.product?.name || '').toLowerCase().includes('vest biru')) || [];
                        return vestItems.map(it => ({
                          date: o.CreatedAt,
                          quantity: it.quantity,
                          orderId: o.ID
                        }));
                      })
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (blueVestOrders.length === 0) {
                      return (
                        <p className="text-xs uppercase tracking-wider text-zinc-500 italic py-2">
                          No Blue Vests purchased by this member yet.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {blueVestOrders.map((bvo, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 hover:border-blue-500/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                                <ShieldAlert className="w-4 h-4 text-blue-500" />
                              </div>
                              <div>
                                <span className="text-xs font-black uppercase text-zinc-300 block">Vest Biru</span>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase">Order #{bvo.orderId}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-primary font-black uppercase">Qty: {bvo.quantity}</p>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase">{new Date(bvo.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Search and Status Filter for this Account's Orders */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      placeholder="Search order ID or item..."
                      value={selectedAccountOrderSearch}
                      onChange={(e) => setSelectedAccountOrderSearch(e.target.value)}
                      className="pl-9 bg-black/60 border-zinc-700 text-xs uppercase placeholder:normal-case h-9"
                    />
                    {selectedAccountOrderSearch && (
                      <button
                        onClick={() => setSelectedAccountOrderSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-400 hidden sm:inline">Filter:</span>
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
                </div>

                <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold">
                  Showing {selectedAccountFilteredOrders.length} of {selectedAccountData.orders.length} orders
                </div>
              </div>

              {/* List of Orders for Selected Account */}
              <div className="space-y-4">
                {currentSelectedAccountOrders.length === 0 ? (
                  <div className="py-12 text-center bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-lg">
                    <p className="uppercase tracking-widest font-bold text-zinc-500">
                      No orders found matching criteria.
                    </p>
                  </div>
                ) : (
                  currentSelectedAccountOrders.map((o) => (
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

                {/* Selected Account Orders Pagination */}
                {totalSelectedAccountPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-8 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAccountCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={selectedAccountCurrentPage === 1}
                      className="uppercase font-black text-xs border-primary/20 text-primary hover:bg-primary/10"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      Page {selectedAccountCurrentPage} of {totalSelectedAccountPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAccountCurrentPage((p) => Math.min(totalSelectedAccountPages, p + 1))}
                      disabled={selectedAccountCurrentPage === totalSelectedAccountPages}
                      className="uppercase font-black text-xs border-primary/20 text-primary hover:bg-primary/10"
                    >
                      Next
                    </Button>
                  </div>
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
                {currentAccounts.map((acc) => (
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
                          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center font-black text-primary text-sm uppercase overflow-hidden">
                            {(acc as any).photoUrl ? (
                              <img src={(acc as any).photoUrl} alt={acc.username} className="w-full h-full object-cover" />
                            ) : (
                              acc.username.charAt(0)
                            )}
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

              {/* Accounts Pagination */}
              {totalAccountPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setAccountCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={accountCurrentPage === 1}
                    className="uppercase font-black text-xs border-primary/20 text-primary hover:bg-primary/10"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Page {accountCurrentPage} of {totalAccountPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setAccountCurrentPage((p) => Math.min(totalAccountPages, p + 1))}
                    disabled={accountCurrentPage === totalAccountPages}
                    className="uppercase font-black text-xs border-primary/20 text-primary hover:bg-primary/10"
                  >
                    Next
                  </Button>
                </div>
              )}
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

      {/* ========================================================================= */}
      {/* EXPORT REPORT MODAL                                                       */}
      {/* ========================================================================= */}
      {showExportModal && isAdminOrSgt && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowExportModal(false)}
        >
          <Card
            className="w-full max-w-lg bg-zinc-950 border-primary/50 border shadow-2xl overflow-hidden relative rounded-xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
            <CardHeader className="flex flex-row justify-between items-start border-b border-zinc-800/50 pb-4 bg-zinc-900/20">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <FileDown className="w-5 h-5" />
                  Export Daily Report
                </CardTitle>
                <CardDescription className="uppercase tracking-widest text-[10px] font-bold mt-1 text-zinc-500">
                  Generate a printable recapitulation of your verified actions
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowExportModal(false)}
                className="text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {/* Date & SGT Filter */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4" />
                    Report Date
                  </label>
                  <Input
                    type="date"
                    value={exportDateFilter}
                    onChange={(e) => setExportDateFilter(e.target.value)}
                    className="bg-black/80 border-primary/30 text-white text-sm font-bold h-11 cursor-pointer w-full"
                  />
                </div>
                {Cookies.get('role') === 'admin' && (
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4" />
                      Filter by SGT
                    </label>
                    <select
                      value={exportSgtFilter}
                      onChange={(e) => setExportSgtFilter(e.target.value)}
                      className="w-full h-11 rounded-md bg-black/80 border border-primary/30 text-sm uppercase px-3 text-white focus:outline-none focus:border-primary font-bold cursor-pointer"
                    >
                      <option value="all">All SGTs / Officers</option>
                      {availableSgts.map((sgt) => (
                        <option key={sgt} value={sgt}>{sgt}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Preview Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black text-primary">{filteredExportOrders.length}</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Orders Handled</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black text-green-400">{filteredExportOrders.filter(o => o.status === 'approved' || o.status === 'completed').length}</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Approved</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black text-white">
                    {(() => {
                      const members = new Set(filteredExportOrders.map(o => o.user?.username || `Member #${o.user_id}`));
                      return members.size;
                    })()}
                  </p>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Members</p>
                </div>
              </div>

              {/* Members List Preview */}
              {filteredExportOrders.length > 0 && (
                <div className="bg-black/50 border border-zinc-800 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Members in this report:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set(filteredExportOrders.map(o => o.user?.username || `Member #${o.user_id}`))).map(name => (
                      <span key={name} className="text-[11px] font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {filteredExportOrders.length === 0 && (
                <div className="text-center py-6 bg-zinc-900/50 border border-dashed border-zinc-700 rounded-lg">
                  <FileDown className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs uppercase tracking-widest font-bold text-zinc-500">
                    No verified orders found for this date.
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Try selecting a different date or verify some orders first.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-zinc-900/30 pt-4 border-t border-zinc-800/50 flex gap-3">
              <Button
                onClick={() => {
                  exportDailyReport();
                  setShowExportModal(false);
                }}
                disabled={filteredExportOrders.length === 0}
                className={`flex-1 h-12 font-black uppercase tracking-widest text-sm cursor-pointer transition-all rounded-lg flex items-center justify-center gap-2 ${
                  filteredExportOrders.length > 0
                    ? 'bg-primary text-black hover:bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:shadow-[0_0_25px_rgba(250,204,21,0.4)]'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Printer className="w-4 h-4" />
                Generate & Print Report
              </Button>
            </CardFooter>
          </Card>
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
              {order.user?.photo_url ? (
                <img src={order.user.photo_url} alt={username} className="w-5 h-5 rounded-full object-cover bg-zinc-900 border border-zinc-700" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                  <User className="w-3 h-3 text-zinc-500" />
                </div>
              )}
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
              <div className="flex items-center gap-2 mt-1">
                <span className="text-zinc-500">Requisition SGT:</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30">
                  <Crosshair className="w-3 h-3 text-primary" />
                  <span className="font-black text-primary uppercase text-[10px] tracking-wider">{destinationName}</span>
                </span>
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

      {isAdminOrOfficer && order.status === 'completed' && (
        <CardFooter className="flex flex-col gap-3 pt-0 border-t border-zinc-900 mt-2 p-4 bg-zinc-950">
          <div className="w-full flex items-center justify-center gap-2 text-zinc-500">
            <BadgeCheck className="w-4 h-4 text-zinc-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Record Locked & Completed
            </span>
          </div>
        </CardFooter>
      )}

      {isAdminOrOfficer && order.status !== 'completed' && (
        <CardFooter className="flex flex-col gap-3 pt-0 border-t-2 border-primary/30 mt-2 p-5 bg-gradient-to-r from-zinc-950 via-zinc-900/50 to-zinc-950">
          <div className="w-full flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">
              Officer Action Controls
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
          <div className="w-full grid grid-cols-3 gap-3">
            <Button
              onClick={() => onUpdateStatus(order.ID, 'approved')}
              className={`h-12 text-sm font-black uppercase tracking-widest transition-all duration-300 cursor-pointer rounded-lg flex items-center justify-center gap-2 ${
                order.status === 'pending'
                  ? 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] ring-2 ring-green-400/50 scale-[1.02]'
                  : 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500 hover:text-black hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              Approve
            </Button>
            <Button
              onClick={() => onUpdateStatus(order.ID, 'rejected')}
              className="h-12 text-sm font-black uppercase tracking-widest cursor-pointer rounded-lg flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300"
            >
              <XCircle className="w-5 h-5" />
              Reject
            </Button>
            <Button
              onClick={() => onUpdateStatus(order.ID, 'completed')}
              className={`h-12 text-sm font-black uppercase tracking-widest cursor-pointer rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${
                order.status === 'approved'
                  ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] ring-2 ring-blue-400/50 scale-[1.02]'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500 hover:text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]'
              }`}
            >
              <BadgeCheck className="w-5 h-5" />
              Complete
            </Button>
          </div>
          <div className="w-full flex justify-end pt-1">
            <Button
              onClick={() => onDeleteOrder(order.ID)}
              className="h-9 px-4 text-xs font-black uppercase tracking-widest cursor-pointer rounded-md bg-zinc-900 text-red-400 border border-red-900/50 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all duration-300 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Record
            </Button>
          </div>
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
