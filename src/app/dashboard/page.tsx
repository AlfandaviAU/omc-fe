'use client';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, X, Search, Crosshair, Package, Wrench, Pill, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Product = {
  ID: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url?: string;
};

type CartItem = {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
};

type Bundle = {
  id: string;
  name: string;
  description: string;
  items: string[];
};

type User = { id?: number; ID?: number; username: string; role: string; };

const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
};

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sgts, setSgts] = useState<User[]>([]);
  const [selectedSgt, setSelectedSgt] = useState<number | null>(null);
  const [weaponAttachments, setWeaponAttachments] = useState<Record<string, string[]>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [proofImage, setProofImage] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  
  // Filtering and interaction states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addingToCartId, setAddingToCartId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const bundlesRef = useRef<HTMLDivElement>(null);
  
  const [sortType, setSortType] = useState('default');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<number[]>([]); // NEW STATE

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = dir === 'left' ? -350 : 350;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const categories = [
    { name: 'All', icon: LayoutGrid },
    { name: 'Bundles', icon: Package },
    { name: 'Guns', icon: Crosshair },
    { name: 'Ammo', icon: Package },
    { name: 'Attachments', icon: Wrench },
    { name: 'Utilities', icon: Pill },
  ];

  useEffect(() => {
    fetchData();
    const handleSync = () => fetchData();
    window.addEventListener('sync_update', handleSync);
    return () => window.removeEventListener('sync_update', handleSync);
  }, []);

  const fetchData = async () => {
    try {
      const [resProducts, resAttachments, resSgts] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/weapon-attachments'),
        api.get('/api/sgts'),
      ]);
      setProducts(resProducts.data);
      setSgts(resSgts.data);
      setWeaponAttachments(resAttachments.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryName = (p: Product) => {
    const d = p.description.toLowerCase();
    const n = p.name.toLowerCase();
    
    if (d.includes('weapon attachment') || n.includes('supre') || n.includes('clip') || n.includes('scope') || n.includes('grip') || n.includes('flash') || n.includes('drum') || n.includes('mag')) return 'Attachments';
    if (d.includes('ammunition') || n.includes('ammo') || n.includes('mm') || n.includes('peluru') || n.includes('magnum') || n.includes('acp')) return 'Ammo';
    if (d.includes('narcotics') || d.includes('supplies') || d.includes('armor') || d.includes('tools') || n.includes('vest') || n.includes('weed') || n.includes('meth') || n.includes('cocain') || n.includes('opium') || n.includes('lockpick') || n.includes('baggy')) return 'Utilities';
    
    return 'Guns';
  };

  const getCategoryIcon = (catName: string) => {
    const cat = categories.find(c => c.name === catName);
    const Icon = cat ? cat.icon : LayoutGrid;
    return <Icon className="w-3.5 h-3.5 text-primary" />;
  };

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || getCategoryName(p) === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortType === 'price-asc') return a.price - b.price;
      if (sortType === 'price-desc') return b.price - a.price;
      if (sortType === 'name-asc') return a.name.localeCompare(b.name);
      if (sortType === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });

  const addToCart = (product: Product) => {
    const q = quantities[product.ID] || 1;
    if (product.stock < q) {
      alert("Not enough stock available.");
      return;
    }
    
    setAddingToCartId(product.ID);
    setTimeout(() => setAddingToCartId(null), 400);

    setProducts(prev => prev.map(p => p.ID === product.ID ? { ...p, stock: p.stock - q } : p));

    setCart((prev) => {
      const existing = prev.find(item => item.product_id === product.ID);
      if (existing) {
        return prev.map(item => item.product_id === product.ID ? { ...item, quantity: item.quantity + q } : item);
      }
      return [...prev, { product_id: product.ID, name: product.name, price: product.price, quantity: q }];
    });
    setQuantities(prev => ({ ...prev, [product.ID]: 1 }));
  };

  const removeFromCart = (id: number) => {
    const item = cart.find(c => c.product_id === id);
    if (item) {
      setProducts(prev => prev.map(p => p.ID === id ? { ...p, stock: p.stock + item.quantity } : p));
    }
    setCart(cart.filter(c => c.product_id !== id));
  };

  const dynamicBundles = Object.keys(weaponAttachments)
    .filter(weaponName => weaponAttachments[weaponName] && weaponAttachments[weaponName].length > 0)
    .map((weaponName, idx) => ({
      id: `dbundle-${idx}`,
      name: `${weaponName} Full Kit`,
      description: `Complete loadout for ${weaponName}. Includes: ${weaponAttachments[weaponName].join(", ")}.`,
      items: [weaponName, ...weaponAttachments[weaponName]],
    }));

  const addBundleToCart = (bundle: Bundle) => {
    const bundleProducts = bundle.items.map(itemName => products.find(p => p.name.toLowerCase() === itemName.toLowerCase())).filter(Boolean) as Product[];
    
    for (const p of bundleProducts) {
       if (p.stock < 1) {
          alert(`Cannot add bundle: ${p.name} is out of stock!`);
          return;
       }
    }

    bundleProducts.forEach(p => {
       setProducts(prev => prev.map(pr => pr.ID === p.ID ? { ...pr, stock: pr.stock - 1 } : pr));
       setCart((prev) => {
         const existing = prev.find(item => item.product_id === p.ID);
         if (existing) {
           return prev.map(item => item.product_id === p.ID ? { ...item, quantity: item.quantity + 1 } : item);
         }
         return [...prev, { product_id: p.ID, name: p.name, price: p.price, quantity: 1 }];
       });
    });
    
    const fakeId = -parseInt(bundle.id.replace('dbundle-',''));
    setAddingToCartId(fakeId);
    setTimeout(() => setAddingToCartId(null), 400);
  };

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  const isValidDiscordLink = (url: string) => {
    return url.startsWith('https://cdn.discordapp.com/attachments/') || 
           url.startsWith('https://media.discordapp.net/attachments/');
  };

  const handleCheckout = async () => {
    if (!selectedSgt) {
      alert("Please select a destination (SGT) for the transfer.");
      return;
    }

    if (!proofImage) {
      alert("Please provide a receipt screenshot link (Proof of Transfer) to complete the checkout.");
      return;
    }
    
    if (!isValidDiscordLink(proofImage)) {
      alert("Invalid link! Please provide a valid Discord image link (must start with cdn.discordapp.com or media.discordapp.net).");
      return;
    }
    
    try {
      await api.post('/api/orders', {
        items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity })),
        proof_image: proofImage,
        destination_id: selectedSgt
      });
      setCart([]);
      setShowCart(false);
      setSelectedSgt(null);
      setProofImage('');
      setCheckoutSuccess(true);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to place order');
    }
  };

  const renderProductCard = (p: Product, customWidthClass = '') => {
    const pCatName = getCategoryName(p);
    return (
      <Card 
        key={p.ID} 
        onClick={() => { setSelectedProduct(p); setSelectedAttachments([]); }}
        className={`group relative overflow-hidden bg-zinc-950 border-zinc-800 hover:border-primary/40 transition-all duration-500 rounded-xl shadow-lg flex flex-col h-full cursor-pointer ${customWidthClass}`}
      >
        {/* Subtle Gradient Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        
        {/* Image Section */}
        <div className="relative w-full h-56 bg-zinc-900 overflow-hidden shrink-0">
          {p.image_url ? (
            <img 
              src={p.image_url} 
              alt={p.name} 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-zinc-950">
              <span className="text-primary font-black uppercase tracking-[0.3em] opacity-10 text-xl rotate-[-20deg]">Classified</span>
            </div>
          )}
          
          {/* Category Badge Icon */}
          <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-700/50 p-1.5 rounded-lg shadow-lg">
            {getCategoryIcon(pCatName)}
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-3 right-3 bg-primary text-black px-3 py-1 rounded-md font-black tracking-widest text-sm shadow-[0_4px_15px_rgba(250,204,21,0.4)]">
            ${p.price.toLocaleString()}
          </div>
          
          {/* Stock Warning Badge */}
          {p.stock === 0 && (
            <div className="absolute inset-0 bg-red-950/60 backdrop-blur-sm flex items-center justify-center z-10">
              <span className="bg-red-600 text-white px-4 py-1.5 rounded-sm font-black uppercase tracking-widest text-sm rotate-[-10deg] border-2 border-red-400 shadow-xl">Depleted</span>
            </div>
          )}
        </div>
        
        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow z-10 bg-gradient-to-b from-zinc-900/50 to-transparent">
          <h3 className="uppercase tracking-widest text-white font-black text-lg leading-tight truncate drop-shadow-md" title={p.name}>{p.name}</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1.5 line-clamp-2 min-h-[30px]" title={p.description}>{p.description || 'No intel available.'}</p>
          
          <div className="mt-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm ${p.stock > 0 ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
              {p.stock > 0 ? `${p.stock} IN STOCK` : 'OUT OF STOCK'}
            </span>
          </div>

          {/* Bottom Action Area */}
          <div className="mt-auto flex items-center gap-2 pt-3 border-t border-zinc-800/50" onClick={(e) => e.stopPropagation()}>
            {p.stock > 0 ? (
              <>
                <div className="flex items-center bg-black/60 border border-zinc-800 rounded-md px-1.5 h-9 shrink-0">
                  <span className="text-[9px] text-zinc-500 uppercase font-black mr-1">Qty</span>
                  <input 
                    type="number" 
                    min="1" 
                    max={p.stock}
                    value={quantities[p.ID] || 1}
                    onChange={(e) => setQuantities({ ...quantities, [p.ID]: parseInt(e.target.value) })}
                    className="w-8 bg-transparent text-center text-white text-sm font-black outline-none appearance-none" 
                  />
                </div>
                <Button 
                  onClick={() => addToCart(p)}
                  className={`flex-1 h-9 text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all duration-300 ${addingToCartId === p.ID ? 'bg-green-500 text-black scale-95 shadow-inner' : 'bg-primary text-black hover:bg-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]'}`}
                >
                  <ShoppingCart className={`w-3.5 h-3.5 mr-1.5 ${addingToCartId === p.ID ? 'hidden' : 'inline-block'}`} />
                  {addingToCartId === p.ID ? 'Secured!' : 'Add'}
                </Button>
              </>
            ) : (
              <div className="w-full text-center text-[11px] text-zinc-500 font-black uppercase tracking-widest bg-zinc-900 py-2.5 rounded-md border border-zinc-800">
                Currently Unavailable
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const handleAddFullLoadout = () => {
    if (!selectedProduct) return;
    
    const q = quantities[selectedProduct.ID] || 1;
    if (selectedProduct.stock < q) {
      alert("Not enough stock available for the weapon.");
      return;
    }

    // Gather selected attachments
    const validAttachments = products.filter(p => selectedAttachments.includes(p.ID) && p.stock >= q);
    
    const itemsToAdd = [selectedProduct, ...validAttachments];

    itemsToAdd.forEach(p => {
       setProducts(prev => prev.map(pr => pr.ID === p.ID ? { ...pr, stock: pr.stock - q } : pr));
       setCart((prev) => {
         const existing = prev.find(item => item.product_id === p.ID);
         if (existing) {
           return prev.map(item => item.product_id === p.ID ? { ...item, quantity: item.quantity + q } : item);
         }
         return [...prev, { product_id: p.ID, name: p.name, price: p.price, quantity: q }];
       });
    });

    setQuantities(prev => ({ ...prev, [selectedProduct.ID]: 1 }));
    setSelectedProduct(null);
    setSelectedAttachments([]);
  };

  const renderBundleCard = (b: Bundle, customClass = '', showImage = true) => {
    const fakeId = -parseInt(b.id.replace('dbundle-',''));
    const bundleProducts = b.items.map(itemName => products.find(p => p.name.toLowerCase() === itemName.toLowerCase())).filter(Boolean) as Product[];
    const bundlePrice = bundleProducts.reduce((acc, p) => acc + p.price, 0);
    const inStock = bundleProducts.every(p => p.stock > 0) && bundleProducts.length === b.items.length;
    
    // Use the main weapon for the image
    const mainWeapon = bundleProducts.length > 0 ? bundleProducts[0] : null;

    return (
      <Card 
        key={b.id} 
        onClick={() => {
          setSelectedBundle(b);
          const bProducts = b.items.map(itemName => products.find(p => p.name.toLowerCase() === itemName.toLowerCase())).filter(Boolean) as Product[];
          const initialSelections: number[] = [];
          let hasMag = false;
          bProducts.forEach((p, index) => {
             if (index === 0) {
                 initialSelections.push(p.ID); // Weapon always selected
             } else {
                 if (p.name.toLowerCase().includes('mag')) {
                    if (!hasMag) {
                       initialSelections.push(p.ID);
                       hasMag = true;
                    }
                 } else {
                    initialSelections.push(p.ID);
                 }
             }
          });
          setSelectedAttachments(initialSelections);
        }}
        className={`bg-zinc-950 border-primary/30 flex flex-col hover:border-primary/60 transition-colors relative overflow-hidden group cursor-pointer shadow-lg ${customClass}`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        
        {/* Conditionally Render Image Section */}
        {showImage ? (
          <div className="relative w-full h-40 md:h-48 bg-zinc-900 overflow-hidden shrink-0 border-b border-zinc-800/50">
            {mainWeapon && mainWeapon.image_url ? (
              <img 
                src={mainWeapon.image_url} 
                alt={b.name} 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 mix-blend-luminosity hover:mix-blend-normal" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-zinc-950">
                <span className="text-primary font-black uppercase tracking-[0.3em] opacity-10 text-xl rotate-[-20deg]">Classified</span>
              </div>
            )}
            
            <div className="absolute top-3 left-3 bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded-md font-black tracking-widest text-[9px] uppercase backdrop-blur-md">
              Full Kit
            </div>

            <div className="absolute bottom-3 right-3 bg-primary text-black px-3 py-1 rounded-md font-black tracking-widest text-sm shadow-[0_4px_15px_rgba(250,204,21,0.4)]">
              ${bundlePrice.toLocaleString()}
            </div>
            
            {!inStock && (
              <div className="absolute inset-0 bg-red-950/60 backdrop-blur-sm flex items-center justify-center z-10">
                <span className="bg-red-600 text-white px-4 py-1.5 rounded-sm font-black uppercase tracking-widest text-sm rotate-[-10deg] border-2 border-red-400 shadow-xl">Depleted</span>
              </div>
            )}
          </div>
        ) : (
          <CardHeader className="pb-2 pt-4 px-4 relative z-10">
            <CardTitle className="uppercase tracking-widest text-base font-black text-white flex justify-between items-start">
              {b.name}
              <span className="text-primary text-sm">${bundlePrice.toLocaleString()}</span>
            </CardTitle>
            <CardDescription className="text-[10px] tracking-wider text-zinc-400 mt-1">{b.description}</CardDescription>
          </CardHeader>
        )}

        <div className={`p-4 flex flex-col flex-grow relative z-10 ${showImage ? 'bg-gradient-to-b from-zinc-900/50 to-transparent' : ''}`}>
          {showImage && (
            <>
              <h3 className="uppercase tracking-widest text-white font-black text-base leading-tight drop-shadow-md truncate">{b.name}</h3>
              <p className="text-[10px] tracking-wider text-zinc-400 mt-1 line-clamp-2 min-h-[30px]">{b.description}</p>
            </>
          )}
          
          <div className="flex flex-wrap gap-1 mt-3 mb-1">
            {b.items.map((item, idx) => (
              <span key={idx} className="text-[8px] uppercase tracking-wider font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-sm">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-3 border-t border-zinc-800/50" onClick={(e) => e.stopPropagation()}>
            <Button 
              onClick={() => addBundleToCart(b)}
              disabled={!inStock}
              className={`w-full h-9 text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${addingToCartId === fakeId ? 'bg-green-500 text-black scale-95 shadow-inner' : 'bg-primary text-black hover:bg-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]'} ${!inStock && 'opacity-50 bg-zinc-800 text-zinc-500 hover:bg-zinc-800 cursor-not-allowed'}`}
            >
              <ShoppingCart className={`w-3.5 h-3.5 mr-1.5 ${addingToCartId === fakeId ? 'hidden' : 'inline-block'}`} />
              {!inStock ? 'Components Depleted' : (addingToCartId === fakeId ? 'Secured!' : 'Add Bundle')}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 relative max-w-[1600px] mx-auto">
      {/* Header and Top Controls */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-6 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-primary drop-shadow-[0_0_15px_rgba(250,204,21,0.2)]">Black Market</h1>
          <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] mt-2 font-bold">Encrypted Armory Network</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full xl:w-auto">
          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="SEARCH ARMORY..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-950/50 border-zinc-800 focus-visible:border-primary/50 focus-visible:ring-primary/20 text-xs uppercase font-bold w-full h-11 transition-all"
            />
          </div>

          <Select value={sortType} onValueChange={(val) => setSortType(val || 'name')}>
            <SelectTrigger className="w-full md:w-[200px] h-11 bg-zinc-950/50 border-zinc-800 text-zinc-400 focus:ring-primary/20 focus:border-primary/50 text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-primary/50 transition-colors">
              <SelectValue placeholder="Sort Items" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
              <SelectItem value="default" className="text-xs uppercase font-bold tracking-wider hover:bg-zinc-900 focus:bg-zinc-900 focus:text-primary cursor-pointer">Default Sort</SelectItem>
              <SelectItem value="price-asc" className="text-xs uppercase font-bold tracking-wider hover:bg-zinc-900 focus:bg-zinc-900 focus:text-primary cursor-pointer">Price: Low to High</SelectItem>
              <SelectItem value="price-desc" className="text-xs uppercase font-bold tracking-wider hover:bg-zinc-900 focus:bg-zinc-900 focus:text-primary cursor-pointer">Price: High to Low</SelectItem>
              <SelectItem value="name-asc" className="text-xs uppercase font-bold tracking-wider hover:bg-zinc-900 focus:bg-zinc-900 focus:text-primary cursor-pointer">Name: A to Z</SelectItem>
              <SelectItem value="name-desc" className="text-xs uppercase font-bold tracking-wider hover:bg-zinc-900 focus:bg-zinc-900 focus:text-primary cursor-pointer">Name: Z to A</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-4 w-full md:w-auto justify-between md:justify-end">
            <Button 
              onClick={() => setShowCart(true)} 
              disabled={cart.length === 0}
              className={`relative uppercase font-black tracking-widest h-11 px-6 transition-all duration-300 ${cart.length > 0 ? 'bg-primary text-black hover:bg-yellow-400 scale-105 shadow-[0_0_20px_rgba(250,204,21,0.4)] cursor-pointer' : 'bg-zinc-900 text-primary border border-primary/20 opacity-50 cursor-not-allowed'}`}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Your Basket
              {cart.length > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-red-600 text-white rounded-full text-[11px] w-6 h-6 flex items-center justify-center font-black shadow-[0_0_10px_rgba(220,38,38,0.6)] border-2 border-zinc-950 animate-bounce">
                  {cart.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Filter Pills */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(c => {
          const Icon = c.icon;
          const isActive = selectedCategory === c.name;
          return (
            <button 
              key={c.name}
              onClick={() => setSelectedCategory(c.name)} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap outline-none cursor-pointer ${isActive ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-primary hover:border-primary/50 hover:bg-zinc-900'}`}
            >
              <Icon className="w-4 h-4" />
              {c.name}
            </button>
          )
        })}
      </div>
      
      {/* Featured Bundles Carousel */}
      {selectedCategory === 'All' && searchQuery === '' && (
        <div className="pt-2 pb-6 border-b border-zinc-800/50 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Package className="w-4 h-4"/> Pre-Kitted Loadouts
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => scrollCarousel(bundlesRef, 'left')} className="h-7 w-7 rounded-full border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-primary hover:border-primary/50 cursor-pointer"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => scrollCarousel(bundlesRef, 'right')} className="h-7 w-7 rounded-full border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-primary hover:border-primary/50 cursor-pointer"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div 
            ref={bundlesRef} 
            className="flex gap-4 overflow-x-auto pb-4 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {dynamicBundles.map(b => renderBundleCard(b, "min-w-[280px] md:min-w-[320px] shrink-0 snap-start", false))}
          </div>
        </div>
      )}

      {/* Modern Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
        {selectedCategory !== 'Bundles' && filteredProducts.map(p => renderProductCard(p))}
        
        {selectedCategory === 'Bundles' && dynamicBundles.map(b => renderBundleCard(b, "w-full h-full", true))}
        
        {selectedCategory !== 'Bundles' && filteredProducts.length === 0 && (
          <div className="col-span-full py-24 text-center bg-zinc-950/50 border border-zinc-800 rounded-xl">
            <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4 opacity-50" />
            <p className="uppercase tracking-widest font-black text-xl text-zinc-500">No inventory matches your search.</p>
          </div>
        )}

        {selectedCategory === 'Bundles' && dynamicBundles.length === 0 && (
          <div className="col-span-full py-24 text-center bg-zinc-950/50 border border-zinc-800 rounded-xl">
            <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4 opacity-50" />
            <p className="uppercase tracking-widest font-black text-xl text-zinc-500">No bundles currently available.</p>
          </div>
        )}
      </div>

      {/* Cart Modal */}
      {showCart && (
        <Portal>
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowCart(false)}>
          <Card className="w-full max-w-xl bg-zinc-950 border-primary border shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 rounded-xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
            <CardHeader className="flex flex-row justify-between items-start border-b border-zinc-800/50 pb-4 bg-zinc-900/20">
              <div>
                <CardTitle className="text-2xl font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6" />
                  Your Basket
                </CardTitle>
                <CardDescription className="uppercase tracking-widest text-xs font-bold mt-1 text-zinc-500">Review your bulk requisition</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCart(false)} className="text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {cart.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <Package className="w-16 h-16 text-zinc-800 mb-4" />
                  <div className="text-zinc-500 uppercase tracking-widest font-black text-lg">Crate is empty.</div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700">
                    {cart.map(c => (
                      <div key={c.product_id} className="flex justify-between items-center bg-black p-3.5 border border-zinc-800 rounded-lg group hover:border-primary/40 transition-all">
                        <div>
                          <div className="font-black uppercase tracking-wider text-white text-base">{c.name}</div>
                          <div className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">Quantity: {c.quantity}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-lg text-zinc-300">${(c.price * c.quantity).toLocaleString()}</span>
                          <Button variant="destructive" size="sm" onClick={() => removeFromCart(c.product_id)} className="h-8 uppercase text-[10px] font-black px-3 rounded-md bg-red-950/50 text-red-500 hover:bg-red-600 hover:text-white border border-red-900/50">Drop</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-zinc-800 pt-5 flex justify-between items-end">
                    <span className="uppercase font-black tracking-widest text-zinc-500 text-sm">Total Due</span>
                    <span className="text-4xl font-black text-primary drop-shadow-md">${cartTotal.toLocaleString()}</span>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mt-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-widest font-black text-primary flex items-center gap-2 mb-2">
                        <Crosshair className="w-4 h-4" /> Destination (SGT)
                      </p>
                      <Select
                        value={selectedSgt ? selectedSgt.toString() : ''}
                        onValueChange={(v) => setSelectedSgt(v ? Number(v) : null)}
                      >
                        <SelectTrigger className="bg-black/80 border-primary/30 text-white text-xs h-11">
                          <SelectValue placeholder="Select Sergeant at Arms">
                            {(val) => {
                              const s = sgts.find(x => String(x.ID ?? x.id) === String(val || selectedSgt));
                              return s ? s.username : null;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {sgts.map(s => {
                            const sgtId = s.ID ?? s.id;
                            if (sgtId === undefined || sgtId === null) return null;
                            return (
                              <SelectItem key={sgtId} value={sgtId.toString()}>{s.username}</SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="text-xs uppercase tracking-widest font-black text-primary flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Proof of Transfer
                    </p>
                    <Input 
                      placeholder="https://cdn.discordapp.com/attachments/..." 
                      value={proofImage}
                      onChange={(e) => setProofImage(e.target.value)}
                      className="bg-black/80 border-primary/30 text-white text-xs placeholder:text-zinc-600 focus-visible:ring-primary h-11 mb-2"
                    />
                    <div className="text-[10px] text-zinc-400 bg-black/40 border border-zinc-800 rounded p-2.5">
                      <p className="font-bold text-primary mb-1 uppercase tracking-wider">How to get a Discord Image Link:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-1 text-zinc-500">
                        <li>Upload your transfer screenshot to any Discord channel.</li>
                        <li>Right-click the image (or long-press on mobile).</li>
                        <li>Select <strong className="text-zinc-300">"Copy Image Link"</strong> or "Copy Link".</li>
                        <li>Paste the link above.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            {cart.length > 0 && (
              <CardFooter className="bg-zinc-900/30 pt-4 border-t border-zinc-800/50">
                <Button 
                  onClick={handleCheckout} 
                  className="w-full h-14 font-black uppercase tracking-widest text-base bg-primary text-black hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:shadow-[0_0_25px_rgba(250,204,21,0.4)] rounded-lg cursor-pointer"
                >
                  Confirm & Finalize Purchase
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
        </Portal>
      )}

      {/* Success Modal */}
      {checkoutSuccess && (
        <Portal>
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setCheckoutSuccess(false)}>
          <Card className="w-full max-w-sm bg-zinc-950 border-green-500/50 border shadow-2xl overflow-hidden relative text-center rounded-xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
            
            <CardHeader className="pt-8">
              <div className="mx-auto bg-green-950 border border-green-500/30 text-green-500 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <CardTitle className="text-2xl font-black uppercase tracking-widest text-green-500">Drop Secured</CardTitle>
              <CardDescription className="uppercase tracking-widest text-[10px] font-bold mt-2 text-zinc-400">Requisition Logged in Database</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">Command will verify your receipt shortly. Await clearance in your Requisitions tab.</p>
            </CardContent>
            <CardFooter className="pb-8">
              <Button onClick={() => setCheckoutSuccess(false)} className="w-full font-black uppercase tracking-widest bg-green-500 text-black hover:bg-green-400 h-12 shadow-[0_0_20px_rgba(34,197,94,0.3)] rounded-lg cursor-pointer">
                Acknowledge
              </Button>
            </CardFooter>
          </Card>
        </div>
        </Portal>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (() => {
        const selectedAttProducts = selectedAttachments.map(id => products.find(p => p.ID === id)).filter(Boolean) as Product[];
        const q = quantities[selectedProduct.ID] || 1;
        const currentTotalValue = (selectedProduct.price + selectedAttProducts.reduce((acc, p) => acc + p.price, 0)) * q;

        return (
        <Portal>
        <div className="fixed inset-0 bg-black z-[60] overflow-y-auto backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedProduct(null)}>
          <div className="min-h-full flex items-center justify-center p-4 py-12">
            <div className="relative max-w-4xl w-full flex flex-col md:flex-row bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)} className="absolute top-2 right-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full z-10 cursor-pointer">
                <X className="h-5 w-5" />
              </Button>
              
              {/* Image side */}
              <div className="w-full md:w-2/5 lg:w-1/2 h-64 md:h-auto bg-zinc-900 relative">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-zinc-950">
                    <span className="text-primary font-black uppercase tracking-[0.3em] opacity-10 text-xl rotate-[-20deg]">Classified</span>
                  </div>
                )}
              </div>
              
              {/* Details side */}
              <div className="w-full md:w-3/5 lg:w-1/2 flex flex-col">
                <div className="p-6 flex-grow">
                <div className="mb-4">
                  <div className="text-xs text-primary font-bold uppercase tracking-widest mb-1">{getCategoryName(selectedProduct)}</div>
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white">{selectedProduct.name}</h2>
                  <div className="text-2xl font-black text-primary mt-2">${selectedProduct.price.toLocaleString()}</div>
                </div>
                
                <div className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  {selectedProduct.description || 'No detailed intelligence available for this asset.'}
                </div>

                {/* UPSELL SECTION */}
                {getCategoryName(selectedProduct) === 'Guns' && weaponAttachments[selectedProduct.name] && (
                  <div className="mb-2 border-t border-zinc-800 pt-4">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">Enhance your loadout with compatible attachments:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">
                      {weaponAttachments[selectedProduct.name]
                        .map(attName => products.find(p => p.name.toLowerCase() === attName.toLowerCase()))
                        .filter(Boolean)
                        .map(att => {
                          const isSelected = selectedAttachments.includes(att!.ID);
                          return (
                            <div 
                              key={att!.ID} 
                              className={`flex items-center justify-between border rounded-md p-2.5 transition-colors cursor-pointer group ${isSelected ? 'bg-primary/10 border-primary/50' : 'bg-zinc-900 border-zinc-800 hover:border-primary/50 hover:bg-zinc-900/80'}`}
                              onClick={(e) => { 
                                e.stopPropagation();
                                if (att!.stock > 0) {
                                  if (isSelected) {
                                    setSelectedAttachments(prev => prev.filter(id => id !== att!.ID));
                                  } else {
                                    if (att!.name.toLowerCase().includes('mag')) {
                                      setSelectedAttachments(prev => {
                                        const withoutMags = prev.filter(id => {
                                          const prod = products.find(x => x.ID === id);
                                          return !(prod && prod.name.toLowerCase().includes('mag'));
                                        });
                                        return [...withoutMags, att!.ID];
                                      });
                                    } else {
                                      setSelectedAttachments(prev => [...prev, att!.ID]);
                                    }
                                  }
                                }
                              }}
                            >
                              <div className="flex items-center gap-3">
                                {att!.image_url ? (
                                  <img src={att!.image_url} alt={att!.name} className="w-10 h-10 object-contain rounded-sm bg-black/50" />
                                ) : (
                                  <div className="w-10 h-10 bg-black/50 rounded-sm flex items-center justify-center">
                                    <Package className="w-4 h-4 text-zinc-600" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-zinc-200 group-hover:text-white'}`}>{att!.name}</span>
                                  <span className="text-[10px] text-zinc-500 font-bold tracking-widest">${att!.price.toLocaleString()}</span>
                                </div>
                              </div>
                              
                              <div className="shrink-0 text-right pr-2">
                                {att!.stock === 0 ? (
                                  <span className="text-red-500 text-[9px] font-black uppercase tracking-widest bg-red-950 px-2 py-1 rounded-sm">Depleted</span>
                                ) : (
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-zinc-700 bg-zinc-950 group-hover:border-primary/50'}`}>
                                    {isSelected && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {weaponAttachments[selectedProduct.name].length === 0 && (
                        <div className="text-xs text-zinc-600 italic">No compatible attachments available.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 pt-4 mt-auto border-t border-zinc-800 bg-zinc-950 shrink-0">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col">
                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Selected Value</span>
                    <span className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]">${currentTotalValue.toLocaleString()}</span>
                  </div>
                  
                  {selectedProduct.stock > 0 ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex items-center bg-black/60 border border-zinc-800 rounded-md px-3 h-12 shrink-0">
                        <span className="text-[10px] text-zinc-500 uppercase font-black mr-2">Qty</span>
                        <input 
                          type="number" 
                          min="1" 
                          max={selectedProduct.stock}
                          value={quantities[selectedProduct.ID] || 1}
                          onChange={(e) => setQuantities({ ...quantities, [selectedProduct.ID]: parseInt(e.target.value) })}
                          className="w-8 bg-transparent text-center text-white font-black outline-none appearance-none text-sm" 
                        />
                      </div>
                      <Button 
                        onClick={handleAddFullLoadout}
                        className="flex-1 h-12 px-8 text-xs font-black uppercase tracking-widest cursor-pointer transition-all duration-300 bg-primary text-black hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Secure Configuration
                      </Button>
                    </div>
                  ) : (
                    <Button disabled className="w-full h-12 px-8 text-xs font-black uppercase tracking-widest bg-zinc-900 text-zinc-500 opacity-50 cursor-not-allowed">
                      Components Depleted
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        </Portal>
        );
      })()}

      {/* Bundle Details Modal */}
      {selectedBundle && (() => {
        const bundleProducts = selectedBundle.items.map(itemName => products.find(p => p.name.toLowerCase() === itemName.toLowerCase())).filter(Boolean) as Product[];
        const selectedProducts = selectedAttachments.map(id => products.find(p => p.ID === id)).filter(Boolean) as Product[];
        const currentPrice = selectedProducts.reduce((acc, p) => acc + p.price, 0);
        const allSelectedInStock = selectedProducts.length > 0 && selectedProducts.every(p => p.stock > 0);
        const fakeId = -parseInt(selectedBundle.id.replace('dbundle-',''));

        return (
          <Portal>
          <div className="fixed inset-0 bg-black z-[60] overflow-y-auto backdrop-blur-sm animate-in fade-in duration-300" onClick={() => { setSelectedBundle(null); setSelectedAttachments([]); }}>
            <div className="min-h-full flex items-center justify-center p-4 py-12">
              <div className="relative max-w-4xl w-full flex flex-col md:flex-row bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedBundle(null); setSelectedAttachments([]); }} className="absolute top-2 right-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full z-10 cursor-pointer">
                <X className="h-5 w-5" />
              </Button>
              
              {/* Left Side: Image */}
              <div className="w-full md:w-2/5 lg:w-1/2 h-64 md:h-auto bg-zinc-900 relative">
                {(() => {
                  const mainItemName = selectedBundle.items[0];
                  const mainWeapon = products.find(p => p.name.toLowerCase() === mainItemName?.toLowerCase());
                  
                  return mainWeapon?.image_url ? (
                    <img 
                      src={mainWeapon.image_url} 
                      alt={selectedBundle.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-zinc-950">
                      <span className="text-primary font-black uppercase tracking-[0.3em] opacity-10 text-xl rotate-[-20deg]">Classified</span>
                    </div>
                  );
                })()}
                
                <div className="absolute top-4 left-4 bg-primary text-black font-black uppercase tracking-widest text-xs px-3 py-1.5 rounded-sm shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                  Full Kit
                </div>
              </div>

              {/* Right Side: Details and Items */}
              <div className="w-full md:w-3/5 lg:w-1/2 flex flex-col">
                <div className="p-6 flex-grow">
                  <div className="mb-4">
                    <div className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Configurable Loadout</div>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white">{selectedBundle.name}</h2>
                    <div className="text-2xl font-black text-primary mt-2">${currentPrice.toLocaleString()}</div>
                  </div>
                  
                  <div className="text-sm text-zinc-400 mb-6 leading-relaxed">
                    {selectedBundle.description}
                  </div>
                  
                  <div className="mb-2 border-t border-zinc-800 pt-4">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">Select Loadout Contents:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">
                      {selectedBundle.items.map((itemName, idx) => {
                        const p = products.find(prod => prod.name.toLowerCase() === itemName.toLowerCase());
                        if (!p) return null;
                        
                        const isMainWeapon = idx === 0;
                        const isSelected = selectedAttachments.includes(p.ID);
                        
                        return (
                          <div 
                            key={idx} 
                            className={`flex items-center justify-between border rounded-md p-2.5 transition-colors group ${isMainWeapon ? 'bg-primary/10 border-primary/50 cursor-default' : (isSelected ? 'bg-primary/10 border-primary/50 cursor-pointer' : 'bg-zinc-900 border-zinc-800 hover:border-primary/50 hover:bg-zinc-900/80 cursor-pointer')}`}
                            onClick={() => {
                              if (isMainWeapon || p.stock === 0) return;
                              if (isSelected) {
                                setSelectedAttachments(prev => prev.filter(id => id !== p.ID));
                              } else {
                                if (p.name.toLowerCase().includes('mag')) {
                                  setSelectedAttachments(prev => {
                                    const withoutMags = prev.filter(id => {
                                      const prod = products.find(x => x.ID === id);
                                      return !(prod && prod.name.toLowerCase().includes('mag'));
                                    });
                                    return [...withoutMags, p.ID];
                                  });
                                } else {
                                  setSelectedAttachments(prev => [...prev, p.ID]);
                                }
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {p.image_url ? (
                                <div className="w-10 h-10 shrink-0 bg-zinc-950 rounded-sm border border-zinc-800 overflow-hidden flex items-center justify-center">
                                  <img src={p.image_url} alt={p.name} className="w-full h-full object-contain mix-blend-luminosity group-hover:mix-blend-normal transition-all" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 shrink-0 bg-zinc-900 rounded-sm flex items-center justify-center border border-zinc-800">
                                  <Package className="w-4 h-4 text-zinc-600" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <div className="text-xs font-black text-white uppercase">{p.name}</div>
                                <div className="text-[10px] text-primary mt-0.5">${p.price.toLocaleString()}</div>
                              </div>
                            </div>
                            
                            <div className="shrink-0 text-right pr-2">
                              {isMainWeapon ? (
                                <span className="text-primary text-[9px] font-black uppercase tracking-widest bg-primary/20 px-2 py-1 rounded-sm">Core Base</span>
                              ) : p.stock === 0 ? (
                                <span className="text-red-500 text-[9px] font-black uppercase tracking-widest bg-red-950 px-2 py-1 rounded-sm">Depleted</span>
                              ) : (
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-zinc-700 bg-zinc-950 group-hover:border-primary/50'}`}>
                                  {isSelected && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-zinc-800 bg-zinc-950 mt-auto">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Selected Value</span>
                      <span className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]">${currentPrice.toLocaleString()}</span>
                    </div>
                    <Button 
                      onClick={() => { 
                        setAddingToCartId(fakeId);
                        setTimeout(() => {
                          selectedProducts.forEach(p => {
                            setProducts(prev => prev.map(pr => pr.ID === p.ID ? { ...pr, stock: pr.stock - 1 } : pr));
                            setCart(prev => {
                              const existing = prev.find(item => item.product_id === p.ID);
                              if (existing) {
                                return prev.map(item => item.product_id === p.ID ? { ...item, quantity: item.quantity + 1 } : item);
                              }
                              return [...prev, { product_id: p.ID, name: p.name, price: p.price, quantity: 1 }];
                            });
                          });
                          setAddingToCartId(null);
                          setSelectedBundle(null);
                          setSelectedAttachments([]);
                        }, 600);
                      }}
                      disabled={!allSelectedInStock || selectedProducts.length === 0}
                      className={`w-full h-12 px-8 text-xs font-black uppercase tracking-widest transition-all duration-300 ${addingToCartId === fakeId ? 'bg-green-500 text-black' : 'bg-primary text-black hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]'} ${(!allSelectedInStock || selectedProducts.length === 0) && 'opacity-50 cursor-not-allowed'}`}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2 inline-block" />
                      {!allSelectedInStock ? 'Components Depleted' : (addingToCartId === fakeId ? 'Secured!' : 'Secure Configuration')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
          </Portal>
        );
      })()}

      {/* Floating Bottom Right Basket Button */}
      <Button 
        onClick={() => setShowCart(true)}
        className={`fixed bottom-6 right-6 h-14 md:h-16 px-6 md:px-8 rounded-full z-40 flex items-center gap-3 cursor-pointer group transition-all duration-300 ${cart.length > 0 ? 'bg-primary text-black hover:bg-yellow-400 hover:scale-105 shadow-[0_0_30px_rgba(250,204,21,0.5)]' : 'bg-zinc-950 text-primary border border-primary/30 hover:bg-zinc-900 shadow-xl'}`}
      >
        <ShoppingCart className={`w-5 h-5 md:w-6 md:h-6 ${cart.length > 0 ? 'group-hover:animate-pulse' : ''}`} />
        <span className="font-black uppercase tracking-widest text-xs md:text-sm">
          {cart.length > 0 ? `Basket (${cart.length})` : 'Basket'}
        </span>
      </Button>
    </div>
  );
}
