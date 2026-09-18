'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/products/${editingId}`, {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock)
        });
      } else {
        await api.post('/api/products', {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock)
        });
      }
      setFormData({ name: '', description: '', price: 0, stock: 0, image_url: '' });
      setEditingId(null);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.ID);
    setFormData({ name: p.name, description: p.description, price: p.price, stock: p.stock, image_url: p.image_url || '' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to scrap this item?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-primary">Manage Inventory</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest mt-1">Keep the armory stocked with weapons and drugs</p>
      </div>
      
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider">{editingId ? 'Modify Supply' : 'Add New Supply'}</CardTitle>
          <CardDescription>Enter details including image reference URL</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input 
                  type="text" 
                  placeholder="e.g. AK-47"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required 
                />
              </div>
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input 
                  type="number" step="0.01"
                  value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} required 
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Input 
                  type="text" 
                  placeholder="Attachment compatibility, details..."
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Stock (Restock quantity)</Label>
                <Input 
                  type="number" 
                  value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} required 
                />
              </div>
              <div className="space-y-2">
                <Label>Image URL (Reference)</Label>
                <Input 
                  type="text" 
                  placeholder="https://..."
                  value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} 
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="default" className="uppercase font-bold tracking-wider">
                {editingId ? 'Update Supply' : 'Add Supply'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setFormData({ name: '', description: '', price: 0, stock: 0, image_url: '' }) }} className="uppercase font-bold tracking-wider">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">IMG</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No gear in inventory.</TableCell>
                </TableRow>
              ) : products.map(p => (
                <TableRow key={p.ID}>
                  <TableCell>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded border border-border" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded border border-border flex items-center justify-center text-xs text-muted-foreground">N/A</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>${p.price.toFixed(2)}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(p)} className="uppercase text-xs tracking-wider">Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(p.ID)} className="uppercase text-xs tracking-wider">Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
