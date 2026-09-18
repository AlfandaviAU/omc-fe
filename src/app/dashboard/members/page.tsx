'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { User, ShieldAlert, BadgeCheck, Trash2, Pencil, X, Check, History } from 'lucide-react';

type Member = {
  ID: number;
  username: string;
  role: string;
};

const roleLabel: Record<string, string> = {
  admin: 'President',
  sgt: 'SGT At Arms',
  member: 'Member',
};

const roleBadge: Record<string, { className: string; icon: typeof User }> = {
  admin: {
    className: 'bg-red-950 text-red-500 border-red-900/50',
    icon: BadgeCheck,
  },
  sgt: {
    className: 'bg-primary/20 text-primary border-primary/30',
    icon: ShieldAlert,
  },
  member: {
    className: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    icon: User,
  },
};

export default function ManageMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    fetchMembers();

    const handleSync = () => fetchMembers();
    window.addEventListener('sync_update', handleSync);
    return () => window.removeEventListener('sync_update', handleSync);
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await api.get('/api/users');
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/users', { username, password, role });
      setUsername('');
      setPassword('');
      setRole('member');
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create member');
    }
  };

  const handleUpdateRole = async (id: number) => {
    try {
      await api.put(`/api/users/${id}`, { role: editRole });
      setEditingId(null);
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`Remove ${username} from the club? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/users/${id}`);
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete member');
    }
  };

  const startEdit = (member: Member) => {
    setEditingId(member.ID);
    setEditRole(member.role);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRole('');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-black uppercase tracking-widest text-primary">Member Administration</h1>
        <p className="text-sm text-zinc-400 uppercase tracking-widest mt-1">Manage Club Hierarchy and Access</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="uppercase tracking-widest text-lg font-black text-primary flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Add New Member
              </CardTitle>
              <CardDescription>Create a new account for a member, SGT, or Admin.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMember} className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} required className="bg-black/80" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-black/80" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v || 'member')}>
                    <SelectTrigger className="bg-black/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="sgt">Sergeant at Arms (SGT)</SelectItem>
                      <SelectItem value="admin">Admin (President)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full uppercase font-black tracking-widest">Create Member</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">Club Roster</h2>
          {members.map(m => {
            const badge = roleBadge[m.role] || roleBadge.member;
            const BadgeIcon = badge.icon;
            const isEditing = editingId === m.ID;

            return (
              <div key={m.ID} className="flex items-center justify-between bg-zinc-950 p-4 border border-zinc-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <div className="font-black text-lg text-white uppercase tracking-wider">{m.username}</div>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Select value={editRole} onValueChange={(val) => setEditRole(val || '')}>
                          <SelectTrigger className="h-7 text-xs bg-black/80 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="sgt">SGT At Arms</SelectItem>
                            <SelectItem value="admin">President</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-400" onClick={() => handleUpdateRole(m.ID)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300" onClick={cancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-sm border ${badge.className}`}>
                        <BadgeIcon className="w-3 h-3" /> {roleLabel[m.role] || m.role}
                      </span>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <Link href={`/dashboard/orders?account=${encodeURIComponent(m.username)}&tab=by-account`}>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-primary" title="View Purchase History">
                        <History className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-primary" onClick={() => startEdit(m)} title="Change role">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-red-500" onClick={() => handleDelete(m.ID, m.username)} title="Remove member">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {members.length === 0 && (
            <div className="py-12 text-center text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-lg">
              No members found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
