/* Démarrage de l'appli. */
(async function boot() {
  try {
    const r = await fetch('data/verbs.json', { cache: 'no-cache' });
    Store.setBase(await r.json());
  } catch (e) {
    try { const r = await fetch('data/verbs.json'); Store.setBase(await r.json()); }
    catch (e2) { $('#app').innerHTML = '<p class="loading">Impossible de charger les verbes. Vérifie ta connexion puis recharge la page.</p>'; return; }
  }
  refreshVerbs();
  wire();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* ignore */ }
  const solo = Store.data.profiles.length === 1 && !Store.profile();
  if (solo) Store.selectProfile(Store.data.profiles[0].id);
  A.view = Store.profile() ? 'home' : 'welcome';
  render();

  // lien de partage : #import=...
  if (location.hash.startsWith('#import=')) {
    const code = location.hash.slice(8);
    history.replaceState(null, '', location.pathname + location.search);
    try { const r = await Store.decodeShare(code); Parent.confirmImport(r.verbs, r.by); }
    catch (e) { toast('Ce lien de partage est invalide 😕'); }
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
