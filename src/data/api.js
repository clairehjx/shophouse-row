// The ONE data interface the whole UI imports. It forwards to a backend chosen at
// build time: the local-first store by default, or the Supabase-backed cloud store
// when VITE_SUPABASE_URL is set. No screen code changes between the two.
import * as localStore from './localStore.js';
import * as cloudStore from './cloudStore.js';

// `import.meta.env && import.meta.env.VITE_SUPABASE_URL` so Vite statically inlines
// the flag at build (the `.VITE_SUPABASE_URL` form it replaces) while staying safe
// under plain Node tooling (the `&&` short-circuits when import.meta.env is undefined).
const store = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) ? cloudStore : localStore;

export const api = {
  // auth
  ensureSeeded: store.ensureSeeded,
  nameExists: store.nameExists,
  login: store.login,
  getSession: store.getSession,
  logout: store.logout,

  // players
  listPlayers: store.listPlayers,
  getPlayer: store.getPlayer,
  completeSetup: store.completeSetup,
  saveAvatar: store.saveAvatar,

  // shops
  getShop: store.getShop,
  listShops: store.listShops,
  saveShop: store.saveShop,

  // inventory
  getInventory: store.getInventory,
  addInventoryItem: store.addInventoryItem,
  removeInventoryItem: store.removeInventoryItem,

  // custom pixel creations
  getCreations: store.getCreations,
  addCreation: store.addCreation,

  // messages (sticky notes)
  sendMessage: store.sendMessage,
  listInbox: store.listInbox,
  markInboxRead: store.markInboxRead,
  listThreads: store.listThreads,
  markThreadRead: store.markThreadRead,

  // trades + gifts
  proposeTrade: store.proposeTrade,
  listTrades: store.listTrades,
  respondTrade: store.respondTrade,
  giftItem: store.giftItem,

  // notifications
  getCounts: store.getCounts,

  // dev only (local store)
  devSwitch: store.devSwitch,
  resetStore: store.resetStore,
};

export default api;
