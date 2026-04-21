import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useCurrentUser } from '../hooks/useCurrentUser';

function SettingsPage() {
  const {
    categories,
    types,
    departments,
    loading,
    exchangeRate,
    updateExchangeRate,
    addCategory,
    addType,
    addDepartment,
    deleteCategory,
    deleteType,
    deleteDepartment,
  } = useSettings();
  const { isAdmin } = useCurrentUser();
  const navigate = useNavigate();
  const [newCategory, setNewCategory] = useState('');
  const [newType, setNewType] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [rateInput, setRateInput] = useState(exchangeRate.toString());
  const [rateSaved, setRateSaved] = useState(false);

  const handleSaveRate = (e) => {
    e.preventDefault();
    updateExchangeRate(rateInput);
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2000);
  };

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

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartment.trim()) return;
    await addDepartment(newDepartment.trim());
    setNewDepartment('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="surface-card-strong flex items-center justify-between p-5">
        <div>
          <h1 className="text-2xl font-bold text-dark">Instellingen</h1>
          <p className="text-sm text-slate-600">Beheer categorieën, types en wisselkoersen.</p>
        </div>
      </div>

      {loading ? (
        <div className="surface-card-strong p-6">Loading instellingen...</div>
      ) : (
        <>
        <section className="surface-card-strong p-6">
          <h2 className="text-lg font-semibold mb-1">Wisselkoers USD → EUR</h2>
          <p className="text-sm text-slate-500 mb-4">Wordt gebruikt om USD-abonnementen om te rekenen naar EUR op het dashboard.</p>
          {isAdmin ? (
            <form onSubmit={handleSaveRate} className="flex gap-3 items-center">
              <span className="text-sm text-slate-600">1 USD =</span>
              <input
                type="number"
                step="0.0001"
                min="0.01"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="field-strong w-32 px-3 py-2 rounded-md focus:outline-none"
              />
              <span className="text-sm text-slate-600">EUR</span>
              <button className="btn-primary">{rateSaved ? '✓ Opgeslagen' : 'Opslaan'}</button>
            </form>
          ) : (
            <p className="text-sm text-slate-600">1 USD = {exchangeRate} EUR</p>
          )}
          {isAdmin && <p className="mt-2 text-xs text-slate-400">Huidige koers: 1 USD = {exchangeRate} EUR</p>}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="surface-card-strong p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">Categorieën</h2>
              <span className="relative flex items-center justify-center w-4 h-4 rounded-full bg-slate-300 text-white text-xs font-bold cursor-default select-none group">
                i
                <span className="absolute left-0 top-5 z-10 hidden group-hover:block w-72 rounded-md bg-slate-800 text-white text-xs p-3 shadow-lg font-normal">
                  <strong>Categorie</strong> geeft aan tot welk bedrijfsonderdeel of kostenpost een abonnement behoort.<br /><br />
                  Wordt gebruikt voor de kostengrafiek op het dashboard en voor filteren.
                </span>
              </span>
            </div>
            {isAdmin && (
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
            )}
            <div className="mt-4 divide-y divide-slate-100 border border-slate-100 rounded-md overflow-hidden">
              {categories.length === 0 ? (
                <div className="text-sm text-slate-400 px-3 py-2">Nog geen categorieën toegevoegd.</div>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="group flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 transition-colors">
                    <span className="text-sm text-slate-700">{category.name}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => deleteCategory(category.id)}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Verwijder
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="surface-card-strong p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">Types</h2>
              <span className="relative flex items-center justify-center w-4 h-4 rounded-full bg-slate-300 text-white text-xs font-bold cursor-default select-none group">
                i
                <span className="absolute left-0 top-5 z-10 hidden group-hover:block w-72 rounded-md bg-slate-800 text-white text-xs p-3 shadow-lg font-normal">
                  <strong>Type</strong> geeft aan op welke manier een abonnement wordt afgerekend.<br /><br />
                  Voorbeelden: <em>Licentie, Abonnement, Pay-per-use, Eenmalig</em><br /><br />
                  Gebruik dit om onderscheid te maken in contractvorm, los van het bedrijfsonderdeel.
                </span>
              </span>
            </div>
            {isAdmin && (
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
            )}
            <div className="mt-4 divide-y divide-slate-100 border border-slate-100 rounded-md overflow-hidden">
              {types.length === 0 ? (
                <div className="text-sm text-slate-400 px-3 py-2">Nog geen types toegevoegd.</div>
              ) : (
                types.map((type) => (
                  <div key={type.id} className="group flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 transition-colors">
                    <span className="text-sm text-slate-700">{type.name}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => deleteType(type.id)}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Verwijder
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="surface-card-strong p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">Afdelingen</h2>
              <span className="relative flex items-center justify-center w-4 h-4 rounded-full bg-slate-300 text-white text-xs font-bold cursor-default select-none group">
                i
                <span className="absolute left-0 top-5 z-10 hidden group-hover:block w-72 rounded-md bg-slate-800 text-white text-xs p-3 shadow-lg font-normal">
                  <strong>Afdeling</strong> geeft aan welke afdeling of team verantwoordelijk is voor het abonnement.<br /><br />
                  Voorbeelden: <em>Facilitair, Sales, Finance, IT, HR, Operations</em><br /><br />
                  Gebruik dit om kosten per afdeling inzichtelijk te maken op het dashboard. Voeg <strong>Overig</strong> toe voor abonnementen die niet onder een specifieke afdeling vallen.
                </span>
              </span>
            </div>
            {isAdmin && (
              <form onSubmit={handleAddDepartment} className="flex gap-3">
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="Nieuwe afdeling"
                  className="field-strong flex-1 px-3 py-2 rounded-md focus:outline-none"
                />
                <button className="btn-primary">Toevoegen</button>
              </form>
            )}
            <div className="mt-4 divide-y divide-slate-100 border border-slate-100 rounded-md overflow-hidden">
              {departments.length === 0 ? (
                <div className="text-sm text-slate-400 px-3 py-2">Nog geen afdelingen toegevoegd.</div>
              ) : (
                departments.map((dept) => (
                  <div key={dept.id} className="group flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 transition-colors">
                    <span className="text-sm text-slate-700">{dept.name}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => deleteDepartment(dept.id)}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Verwijder
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        {isAdmin && (
          <section className="surface-card-strong p-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Gebruikersbeheer</h2>
              <p className="text-sm text-slate-500">Beheer gebruikers en stel hun rollen in (admin of viewer).</p>
            </div>
            <button onClick={() => navigate('/gebruikers')} className="btn-primary whitespace-nowrap">
              Beheren →
            </button>
          </section>
        )}
        </>
      )}
    </div>
  );
}


export default SettingsPage;
