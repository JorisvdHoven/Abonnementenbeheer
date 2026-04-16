import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

function SettingsPage() {
  const {
    categories,
    types,
    loading,
    addCategory,
    addType,
    deleteCategory,
    deleteType
  } = useSettings();
  const [newCategory, setNewCategory] = useState('');
  const [newType, setNewType] = useState('');

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await addCategory(newCategory.trim());
    setNewCategory('');
  };

  const handleAddType = async (e) => {
    e.preventDefault();
    if (!newType.trim()) return;
    await addType(newType.trim());
    setNewType('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="surface-card-strong flex items-center justify-between p-5">
        <div>
          <h1 className="text-2xl font-bold text-dark">Instellingen</h1>
          <p className="text-sm text-slate-600">Beheer categorieën en types voor je abonnementen.</p>
        </div>
      </div>

      {loading ? (
        <div className="surface-card-strong p-6">Loading instellingen...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="surface-card-strong p-6">
            <h2 className="text-lg font-semibold mb-4">Categorieën</h2>
            <form onSubmit={handleAddCategory} className="flex gap-3">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nieuwe categorie"
                className="field-strong flex-1 px-3 py-2 rounded-md focus:outline-none"
              />
              <button className="btn-primary">Toevoegen</button>
            </form>
            <div className="mt-5 space-y-2">
              {categories.length === 0 ? (
                <div className="text-sm text-gray-500">Nog geen categorieën toegevoegd.</div>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="font-medium text-slate-700">{category.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteCategory(category.id)}
                      className="rounded-md px-2 py-1 text-sm font-medium text-red-600 transition-all duration-150 hover:bg-red-50 hover:text-red-800"
                    >
                      Verwijder
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="surface-card-strong p-6">
            <h2 className="text-lg font-semibold mb-4">Types</h2>
            <form onSubmit={handleAddType} className="flex gap-3">
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="Nieuwe type"
                className="field-strong flex-1 px-3 py-2 rounded-md focus:outline-none"
              />
              <button className="btn-primary">Toevoegen</button>
            </form>
            <div className="mt-5 space-y-2">
              {types.length === 0 ? (
                <div className="text-sm text-gray-500">Nog geen types toegevoegd.</div>
              ) : (
                types.map((type) => (
                  <div key={type.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="font-medium text-slate-700">{type.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteType(type.id)}
                      className="rounded-md px-2 py-1 text-sm font-medium text-red-600 transition-all duration-150 hover:bg-red-50 hover:text-red-800"
                    >
                      Verwijder
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
