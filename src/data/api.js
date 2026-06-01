// The ONE data interface the whole UI imports. It forwards to a backend chosen at
// build time: the local-first store by default, or the Supabase-backed cloud store
// when VITE_SUPABASE_URL is set. No screen code changes between the two.
import * as localStore from './localStore.js';
import * as cloudStore from './cloudStore.js';

// Production builds (Vercel) use the Supabase-backed cloud store; `npm run dev` uses
// the local-first store. The client only calls relative /api/* endpoints, so it needs
// no Supabase env var — just Vite's built-in PROD flag (guarded for plain Node tooling).
const store = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD) ? cloudStore : localStore;

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
