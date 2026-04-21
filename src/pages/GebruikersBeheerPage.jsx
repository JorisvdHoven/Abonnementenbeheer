import { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useCurrentUser } from '../hooks/useCurrentUser';

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
    }`}>
      {role === 'admin' ? 'Admin' : 'Viewer'}
    </span>
  );
}

function InviteModal({ onClose, onInvite }) {
  const [form, setForm] = useState({ email: '', full_name: '', role: 'viewer' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await onInvite(form);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => { onClose(); }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="surface-card-strong w-full max-w-md p-6 rounded-xl shadow-xl">
        <h2 className="text-lg font-bold mb-4">Gebruiker uitnodigen</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mailadres *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="field-strong w-full px-3 py-2 rounded-md border focus:outline-none"
              placeholder="naam@bedrijf.nl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Naam</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="field-strong w-full px-3 py-2 rounded-md border focus:outline-none"
              placeholder="Volledige naam"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
              className="field-strong w-full px-3 py-2 rounded-md border focus:outline-none"
            >
              <option value="viewer">Viewer — kan alles bekijken</option>
              <option value="admin">Admin — kan alles beheren</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">Uitnodiging verstuurd!</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuleren</button>
            <button type="submit" disabled={saving || success} className="btn-primary">
              {saving ? 'Versturen...' : success ? '✓ Verstuurd' : 'Uitnodigen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GebruikersBeheerPage() {
  const { users, loading, updateUser, deleteUser, inviteUser } = useUsers();
  const { profile: currentUser, isAdmin, loading: roleLoading } = useCurrentUser();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (loading || roleLoading) return <div className="p-6">Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="surface-card-strong p-8 text-center text-slate-500">
          Je hebt geen toegang tot gebruikersbeheer.
        </div>
      </div>
    );
  }

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({ full_name: user.full_name || '', email: user.email || '', role: user.role || 'viewer' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) return;
    const result = await deleteUser(id);
    if (result?.error) setSaveError(result.error);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); setSaveError(null); };

  const saveEdit = async (id) => {
    setSaving(true);
    setSaveError(null);
    const { error } = await updateUser(id, editForm);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setEditingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="surface-card-strong p-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-dark">Gebruikersbeheer</h1>
          <p className="mt-1 text-sm text-slate-600">
            {users.length} gebruiker{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setInviteOpen(true)} className="btn-primary">
          + Uitnodigen
        </button>
      </div>

      <div className="surface-card-strong overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-5 py-3">Naam</th>
              <th className="px-5 py-3">E-mail</th>
              <th className="px-5 py-3">Rol</th>
              <th className="px-5 py-3 text-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isMe = u.id === currentUser?.id;
              const isEditing = editingId === u.id;
              const initial = (u.full_name || u.email || '?')[0].toUpperCase();

              return (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                        {initial}
                      </div>
                      {isEditing ? (
                        <input
                          value={editForm.full_name}
                          onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                          className="field-strong px-2 py-1 rounded-md border focus:outline-none text-sm w-44"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">
                          {u.full_name || <span className="text-slate-400 italic">Geen naam</span>}
                        </span>
                      )}
                      {isMe && <span className="text-xs text-slate-400">(jij)</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {isEditing ? (
                      <input
                        value={editForm.email}
                        onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                        className="field-strong px-2 py-1 rounded-md border focus:outline-none text-sm w-48"
                        type="email"
                      />
                    ) : (
                      u.email || '—'
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {isEditing ? (
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}
                        className="field-strong px-2 py-1 rounded-md border focus:outline-none text-sm"
                        disabled={isMe}
                        title={isMe ? 'Je kunt je eigen rol niet wijzigen' : ''}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <RoleBadge role={u.role || 'viewer'} />
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {isEditing ? (
                      <div className="flex justify-between items-center w-full">
                        {!isMe ? (
                          <button onClick={() => handleDelete(u.id)} className="text-xs text-red-400 hover:text-red-600">
                            Verwijder
                          </button>
                        ) : <span />}
                        <div className="flex gap-3">
                          <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-700">
                            Annuleren
                          </button>
                          <button
                            onClick={() => saveEdit(u.id)}
                            disabled={saving}
                            className="text-xs text-primary font-semibold hover:underline"
                          >
                            {saving ? 'Opslaan...' : 'Opslaan'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(u)} className="text-xs text-primary hover:underline">
                        Bewerken
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {saveError && (
              <tr>
                <td colSpan={4} className="px-5 py-2">
                  <p className="text-xs text-red-500">Fout bij opslaan: {saveError}</p>
                </td>
              </tr>
            )}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-sm">
                  Geen gebruikers gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onInvite={inviteUser}
        />
      )}
    </div>
  );
}

export default GebruikersBeheerPage;
