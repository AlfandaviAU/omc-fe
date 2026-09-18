'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, ShoppingCart, Clock, Users } from 'lucide-react';

type TopProduct = {
  product_name: string;
  total_qty: number;
  total_revenue: number;
};

type RecentOrder = {
  id: number;
  username: string;
  total_amount: number;
  status: string;
  created_at: string;
};

type RevenueByVerifier = {
  verifier_name: string;
  order_count: number;
  total_revenue: number;
};

type Analytics = {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  approved_orders: number;
  completed_orders: number;
  rejected_orders: number;
  total_members: number;
  top_products: TopProduct[];
  recent_orders: RecentOrder[];
  revenue_by_verifier: RevenueByVerifier[];
};

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/api/analytics');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();

    const handleSync = () => fetchAnalytics();
    window.addEventListener('sync_update', handleSync);
    return () => window.removeEventListener('sync_update', handleSync);
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-32">
        <p className="uppercase tracking-widest animate-pulse text-primary text-lg font-bold">
          Loading Analytics...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center py-32">
        <p className="uppercase tracking-widest text-destructive text-lg font-bold">
          Failed to load analytics data.
        </p>
      </div>
    );
  }

  const maxQty = Math.max(...(data.top_products?.map((p) => p.total_qty) || [1]), 1);

  const kpis = [
    { label: 'Total Revenue', value: formatCurrency(data.total_revenue), icon: DollarSign, accent: 'text-primary' },
    { label: 'Total Orders', value: data.total_orders.toLocaleString(), icon: ShoppingCart, accent: 'text-primary' },
    { label: 'Pending Orders', value: data.pending_orders.toLocaleString(), icon: Clock, accent: 'text-amber-400' },
    { label: 'Total Members', value: data.total_members.toLocaleString(), icon: Users, accent: 'text-primary' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-primary">Analytics</h1>
        <p className="text-sm uppercase tracking-wider text-muted-foreground mt-1">Club Operations Overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-black tracking-wide ${kpi.accent}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Status Breakdown */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: data.pending_orders, color: 'bg-amber-500' },
          { label: 'Approved', value: data.approved_orders, color: 'bg-blue-500' },
          { label: 'Completed', value: data.completed_orders, color: 'bg-emerald-500' },
          { label: 'Rejected', value: data.rejected_orders, color: 'bg-red-500' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card ring-1 ring-foreground/10">
            <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
            <span className="ml-auto text-sm font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Two-column: Top Products + Revenue by Verifier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_products && data.top_products.length > 0 ? (
              data.top_products.map((product) => (
                <div key={product.product_name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="uppercase tracking-wider font-semibold truncate mr-2">
                      {product.product_name}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {product.total_qty} sold · {formatCurrency(product.total_revenue)}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${(product.total_qty / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No product data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Verifier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">
              Revenue by SGT
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenue_by_verifier && data.revenue_by_verifier.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-widest">Verifier</TableHead>
                    <TableHead className="text-xs uppercase tracking-widest text-center">Orders</TableHead>
                    <TableHead className="text-xs uppercase tracking-widest text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.revenue_by_verifier.map((v) => (
                    <TableRow key={v.verifier_name}>
                      <TableCell className="font-semibold uppercase tracking-wider">{v.verifier_name}</TableCell>
                      <TableCell className="text-center">{v.order_count}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(v.total_revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No verifier data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_orders && data.recent_orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-widest">Order ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest">Member</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest text-right">Amount</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest text-center">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-bold">#{order.id}</TableCell>
                    <TableCell className="uppercase tracking-wider font-semibold">{order.username}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`text-[10px] uppercase tracking-widest border ${statusColors[order.status] || 'bg-muted text-muted-foreground'}`}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {formatDate(order.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent orders.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
