'use client';
import { toast } from "sonner";
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Search, Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, AlertTriangle, DollarSign, Box } from 'lucide-react';

type Product = {
  ID: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
};

export default function ManageProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', price: 0, stock: 0, image_url: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
    const handleSync = () => fetchProducts();
    window.addEventListener('sync_update', handleSync);
    return () => window.removeEventListener('sync_update', handleSync);
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const totalValue = useMemo(() => products.reduce((acc, p) => acc + (p.price * p.stock), 0), [products]);
  const outOfStock = useMemo(() => products.filter(p => p.stock === 0).length, [products]);
  const lowStock = useMemo(() => products.filter(p => p.stock > 0 && p.stock <= 10).length, [products]);

  const openNewDialog = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', price: 0, stock: 0, image_url: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (p: Product) => {
    setEditingId(p.ID);
    setFormData({ name: p.name, description: p.description, price: p.price, stock: p.stock, image_url: p.image_url || '' });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/products/${editingId}`, {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock)
        });
        toast.success("Item updated successfully");
      } else {
        await api.post('/api/products', {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock)
        });
        toast.success("Item added successfully");
      }
      setIsDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to scrap ${name}?`)) return;
    try {
      await api.delete(`/api/products/${id}`);
      toast.success("Item scrapped successfully");
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleQuickStock = async (p: Product, delta: number) => {
    const newStock = Math.max(0, p.stock + delta);
    if (newStock === p.stock) return;
    try {
      await api.put(`/api/products/${p.ID}`, {
        name: p.name,
        description: p.description,
        price: p.price,
        stock: newStock,
        image_url: p.image_url
      });
      fetchProducts();
      toast.success(`${p.name} stock adjusted by ${delta > 0 ? '+'+delta : delta}`);
    } catch (err) {
      toast.error('Failed to quick-adjust stock');
    }
  };

  const getCategoryBadge = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('vest') || n.includes('lockpick') || n.includes('ceramic')) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-900/40 text-blue-400 border border-blue-900/50">Gear</span>;
    if (n.includes('ammo') || n.includes('mm') || n.includes('magnum') || n.includes('acp') || n.includes('peluru')) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-yellow-900/40 text-yellow-500 border border-yellow-900/50">Ammunition</span>;
    if (n.includes('suppressor') || n.includes('mag') || n.includes('scope') || n.includes('flashlight') || n.includes('grip')) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-purple-900/40 text-purple-400 border border-purple-900/50">Attachment</span>;
    if (n.includes('weed') || n.includes('meth') || n.includes('opium') || n.includes('cocain') || n.includes('baggy')) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-green-900/40 text-green-400 border border-green-900/50">Narcotics</span>;
    
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-red-900/40 text-red-500 border border-red-900/50">Weapon</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-primary">Manage Inventory</h1>
          <p className="text-zinc-400 text-sm uppercase tracking-widest mt-1">Keep the armory stocked with weapons and assets</p>
        </div>
        <Button onClick={openNewDialog} className="uppercase font-black tracking-widest bg-primary text-black hover:bg-yellow-500 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Total Asset Value</p>
              <p className="text-2xl font-black text-white">${totalValue.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Unique Assets</p>
              <p className="text-2xl font-black text-white">{products.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Box className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Needs Restock</p>
              <p className="text-2xl font-black text-red-500">{outOfStock + lowStock}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/60 border-zinc-700 text-xs uppercase placeholder:normal-case h-10"
          />
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {filteredProducts.length} Items Found
        </div>
      </div>
      
      <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1.5 h-full bg-primary/20 pointer-events-none" />
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black/40 border-b border-zinc-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 font-bold uppercase tracking-widest text-zinc-500 text-xs">IMG</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-zinc-500 text-xs">Asset Name</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-zinc-500 text-xs text-right">Price</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-zinc-500 text-xs text-center">Stock Control</TableHead>
                <TableHead className="text-right font-bold uppercase tracking-widest text-zinc-500 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-500 uppercase tracking-widest text-xs font-bold bg-zinc-900/20">
                    No items found matching criteria.
                  </TableCell>
                </TableRow>
              ) : filteredProducts.map(p => (
                <TableRow key={p.ID} className="border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors group">
                  <TableCell>
                    {p.image_url ? (
                      <div className="relative w-14 h-14 bg-zinc-950/80 rounded-lg border border-zinc-800/80 group-hover:border-primary/40 group-hover:bg-zinc-900/80 transition-all flex items-center justify-center overflow-hidden p-1.5 shadow-sm">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-zinc-950/80 rounded-lg border border-zinc-800/80 flex items-center justify-center transition-all group-hover:border-zinc-700">
                        <Package className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-black text-sm uppercase tracking-wider text-zinc-200">{p.name}</div>
                    <div className="mt-1">{getCategoryBadge(p.name)}</div>
                  </TableCell>
                  <TableCell className="font-black text-primary text-sm text-right">${p.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleQuickStock(p, -1)} className="h-6 w-6 p-0 text-zinc-500 hover:text-red-500 hover:bg-red-950/50 border border-transparent hover:border-red-900/50">
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                      </Button>
                      <span className={`inline-flex justify-center min-w-[36px] px-2 py-0.5 rounded text-xs font-black uppercase tracking-widest ${p.stock > 10 ? 'bg-zinc-900 text-zinc-300 border border-zinc-700' : p.stock > 0 ? 'bg-yellow-950/40 text-yellow-500 border border-yellow-900' : 'bg-red-950/40 text-red-500 border border-red-900 animate-pulse'}`}>
                        {p.stock}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => handleQuickStock(p, 1)} className="h-6 w-6 p-0 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-950/50 border border-transparent hover:border-emerald-900/50">
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleQuickStock(p, 10)} className="h-6 px-1.5 text-[10px] text-zinc-500 hover:text-emerald-500 hover:bg-emerald-950/50 border border-transparent hover:border-emerald-900/50 font-black">+10</Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(p)} className="h-8 w-8 p-0 text-zinc-400 hover:text-primary border border-transparent hover:border-primary/20 bg-black/40 hover:bg-primary/10">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.ID, p.name)} className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500 border border-transparent hover:border-red-900/50 bg-black/40 hover:bg-red-950/40">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="uppercase font-black tracking-widest text-primary flex items-center gap-2">
              {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? 'Modify Inventory Item' : 'Register New Item'}
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest text-zinc-400">
              Fill out the requisition details for the armory database.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-zinc-400">Item Name</Label>
                <Input 
                  type="text" 
                  placeholder="e.g. AK-47"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required 
                  className="bg-black/80 border-zinc-700 focus-visible:ring-primary h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-zinc-400">Price ($)</Label>
                <Input 
                  type="number" step="1" min="0"
                  value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} required 
                  className="bg-black/80 border-zinc-700 focus-visible:ring-primary h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-zinc-400">Stock Qty</Label>
                <Input 
                  type="number" min="0"
                  value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} required 
                  className="bg-black/80 border-zinc-700 focus-visible:ring-primary h-10"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-zinc-400">Description</Label>
                <Input 
                  type="text" 
                  placeholder="Details, calibers, specs..."
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="bg-black/80 border-zinc-700 focus-visible:ring-primary h-10"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-zinc-400">Image URL</Label>
                <Input 
                  type="text" 
                  placeholder="https://..."
                  value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} 
                  className="bg-black/80 border-zinc-700 focus-visible:ring-primary h-10"
                />
                {formData.image_url && (
                  <div className="pt-2 flex justify-center">
                    <div className="relative w-24 h-24 bg-zinc-950/80 rounded-lg border border-zinc-700 flex items-center justify-center p-2">
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain drop-shadow-lg" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="uppercase font-bold tracking-widest text-xs">
                Cancel
              </Button>
              <Button type="submit" className="uppercase font-black tracking-widest text-xs bg-primary text-black hover:bg-yellow-500">
                {editingId ? 'Save Changes' : 'Confirm Registration'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
