/**
 * Unified admin + superadmin routes.
 *
 * Mounted at /api/admin in app.ts (remove superadmin.routes import).
 *
 * Route map:
 *
 * admin + superadmin:
 *   GET    /api/admin/users            List all regular users
 *   POST   /api/admin/users            Create a user
 *   PATCH  /api/admin/users/:id        Update a user
 *   DELETE /api/admin/users/:id        Delete a user
 *   GET    /api/admin/tickets          List all tickets
 *   GET    /api/admin/predictions      List all predictions
 *   POST   /api/admin/fixtures/sync    Sync fixtures
 *
 * superadmin only:
 *   GET    /api/admin/admins           List all admins
 *   POST   /api/admin/admins           Create an admin
 *   DELETE /api/admin/admins/:id       Delete an admin
 *   GET    /api/admin/usage            Usage stats
 *   GET    /api/admin/system           System config
 */
import { Router } from 'express';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  banUser,
  unbanUser,
  suspendUser,
  listTickets,
  listPredictions,
  adminSyncFixtures,
  listAdmins,
  createAdmin,
  deleteAdmin,
  usage,
  systemConfig,
  getMarketAccuracy,
} from '../controllers/admin.controller';
import authMiddleware from '../middleware/auth';
import { checkRole } from '../middleware/roles';

const router = Router();

// All routes require a valid JWT
router.use(authMiddleware);

// ── admin + superadmin ──────────────────────────────────────────────────────
const adminAccess = checkRole('admin', 'superadmin');

router.get('/users', adminAccess, listUsers);
router.post('/users', adminAccess, createUser);
router.patch('/users/:id', adminAccess, updateUser);
router.delete('/users/:id', adminAccess, deleteUser);

// Ban / suspend / unban — admin and superadmin
router.patch('/users/:id/ban', adminAccess, banUser);
router.patch('/users/:id/unban', adminAccess, unbanUser);
router.patch('/users/:id/suspend', adminAccess, suspendUser);
router.get('/tickets', adminAccess, listTickets);
router.get('/predictions', adminAccess, listPredictions);
router.post('/fixtures/sync', adminAccess, adminSyncFixtures);
router.get('/market-accuracy', adminAccess, getMarketAccuracy);

// ── superadmin only ─────────────────────────────────────────────────────────
const superadminAccess = checkRole('superadmin');

router.get('/admins', superadminAccess, listAdmins);
router.post('/admins', superadminAccess, createAdmin);
router.delete('/admins/:id', superadminAccess, deleteAdmin);
router.get('/usage', superadminAccess, usage);
router.get('/system', superadminAccess, systemConfig);

export default router;
