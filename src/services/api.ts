import {
  Company,
  User,
  Technician,
  Client,
  ServiceItem,
  Quote,
  WorkOrder,
  DashboardStats,
  NotificationLog
} from '../types';
import { firebaseService, cleanFirestoreDatabaseComplete } from './firebase';

const BASE_URL = '/api';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs: number = 3000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
};

const LOCAL_COMPANIES_KEY = 'cast_cached_companies';
export const getCachedCompanies = (): Company[] => {
  try {
    const raw = localStorage.getItem(LOCAL_COMPANIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setCachedCompanies = (comps: Company[]) => {
  try {
    localStorage.setItem(LOCAL_COMPANIES_KEY, JSON.stringify(comps));
  } catch {}
};

const LOCAL_USERS_KEY = 'cast_cached_users';
export const getCachedUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    const users: User[] = raw ? JSON.parse(raw) : [];
    return users.map(u => ({
      ...u,
      email: (u.email || '').trim().toLowerCase()
    }));
  } catch {
    return [];
  }
};

export const setCachedUsers = (users: User[]) => {
  try {
    const sanitized = users.map(u => ({
      ...u,
      email: (u.email || '').trim().toLowerCase()
    }));
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(sanitized));
  } catch {}
};

export const api = {
  getCachedCompanies,
  getCachedUsers,

  // AUTH (Firebase Auth & Firestore Users)
  login: async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // First try login via server/local
      const res = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      }, 3000);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        if (data.user) {
          data.user.email = (data.user.email || cleanEmail).trim().toLowerCase();
        }
        return data;
      }
      if (res.status === 401 || res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('Credenciais inválidas') || e.message.includes('desativad') || e.message.includes('suspens'))) {
        throw e;
      }
      // Server unreachable or network error, proceed to Firestore fallback
    }

    // Firestore Users authentication fallback
    try {
      const users = await firebaseService.users.getAll();
      const found = users.find((u) => (u.email || '').trim().toLowerCase() === cleanEmail);
      if (found) {
        return {
          token: `fb-token-${found.id}-${Date.now()}`,
          user: {
            ...found,
            email: (found.email || cleanEmail).trim().toLowerCase()
          }
        };
      }
    } catch (e) {}

    throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
  },

  // COMPANIES (Local SQLite API + Firestore mirror + Local Cache)
  getCompanies: async (userRole?: string, companyId?: string): Promise<Company[]> => {
    try {
      const params = new URLSearchParams();
      if (userRole) params.append('userRole', userRole);
      if (companyId) params.append('companyId', companyId);
      const res = await fetchWithTimeout(`${BASE_URL}/companies?${params.toString()}`, {}, 2500);
      if (res.ok) {
        const companies: Company[] = await res.json();
        if (Array.isArray(companies)) {
          setCachedCompanies(companies);
          return companies;
        }
      }
    } catch (err) {
      // Local API unavailable or timed out, fallback to Firestore
    }

    try {
      const companies = await firebaseService.companies.getAll(userRole, companyId);
      if (Array.isArray(companies)) {
        setCachedCompanies(companies);
        return companies;
      }
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar empresas:', err);
    }

    return getCachedCompanies();
  },

  createCompany: async (company: Partial<Company> & { manager_name?: string; manager_email?: string; manager_password?: string }): Promise<Company> => {
    let created: Company | null = null;
    const sanitizedCompany = {
      ...company,
      email: company.email ? company.email.trim().toLowerCase() : '',
      manager_email: company.manager_email ? company.manager_email.trim().toLowerCase() : undefined
    };
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedCompany)
      }, 3500);
      if (res.ok) {
        created = await res.json();
      }
    } catch (err) {
      console.warn('Erro ao criar empresa na API local:', err);
    }

    if (created) {
      // Sync em segundo plano no Firestore sem bloquear o usuário
      firebaseService.companies.create(created).catch(() => {});
      try {
        const existing = getCachedCompanies();
        const updated = [created, ...existing.filter(c => c.id !== created!.id)];
        setCachedCompanies(updated);
      } catch {}
      return created;
    }

    // Fallback apenas se a API local falhar
    const fbCompany = await firebaseService.companies.create(company);
    try {
      const existing = getCachedCompanies();
      setCachedCompanies([fbCompany, ...existing.filter(c => c.id !== fbCompany.id)]);
    } catch {}
    return fbCompany;
  },

  updateCompany: async (id: string, company: Partial<Company>): Promise<Company> => {
    let updated: Company | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      }, 3000);
      if (res.ok) {
        updated = await res.json();
      }
    } catch (err) {
      console.warn('Erro ao atualizar empresa na API local:', err);
    }

    if (updated) {
      firebaseService.companies.update(id, company).catch(() => {});
      try {
        const currentList = getCachedCompanies();
        const nextList = currentList.map(c => c.id === id ? { ...c, ...updated } : c);
        setCachedCompanies(nextList);
      } catch {}
      return updated;
    }

    return await firebaseService.companies.update(id, company);
  },

  updateCompanyBranding: async (id: string, primaryColor: string, logoUrl?: string, storagePath?: string): Promise<Company> => {
    let updated: Company | null = null;
    try {
      const res = await fetch(`${BASE_URL}/companies/${id}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_color: primaryColor, logo_url: logoUrl, logo_storage_path: storagePath })
      });
      if (res.ok) {
        updated = await res.json();
      }
    } catch (err) {
      console.warn('Erro ao atualizar branding na API local:', err);
    }

    if (updated) {
      firebaseService.companies.updateBranding(id, primaryColor, logoUrl, storagePath).catch(() => {});
      return updated;
    }

    return await firebaseService.companies.updateBranding(id, primaryColor, logoUrl, storagePath);
  },

  deleteCompany: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetch(`${BASE_URL}/companies/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Erro ao deletar empresa localmente:', err);
    }
    firebaseService.companies.delete(id).catch(() => {});
    try {
      setCachedCompanies(getCachedCompanies().filter(c => c.id !== id));
    } catch {}
    return { success: true };
  },

  toggleCompanyStatus: async (id: string, active: boolean): Promise<{ company: Company; usersAffected?: number; message?: string }> => {
    let result: any = null;
    try {
      const res = await fetch(`${BASE_URL}/companies/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: active ? 1 : 0 })
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (err) {
      console.warn('Erro ao alterar status da empresa na API local:', err);
    }

    firebaseService.companies.update(id, { active: active ? 1 : 0 }).catch(() => {});
    if (result) return result;
    return { company: { id, active: active ? 1 : 0 } as Company };
  },

  // USERS (Local SQLite API + Firestore mirror + Local Cache)
  getUsers: async (companyId?: string, userRole?: string): Promise<User[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetchWithTimeout(`${BASE_URL}/users?${params.toString()}`, {}, 2500);
      if (res.ok) {
        const users: User[] = await res.json();
        if (Array.isArray(users)) {
          const filtered = users.filter((u) => u.role !== 'DEV');
          setCachedUsers(filtered);
          return filtered;
        }
      }
    } catch (err) {
      // Local API unavailable
    }

    try {
      const users = await firebaseService.users.getAll(companyId, userRole);
      const filtered = users.filter((u) => u.role !== 'DEV');
      return filtered;
    } catch (err) {
      return getCachedUsers().filter(u => u.role !== 'DEV');
    }
  },

  createUser: async (user: Partial<User>): Promise<User> => {
    let created: User | null = null;
    const cleanEmail = (user.email || '').trim().toLowerCase();
    const sanitizedUser: Partial<User> = {
      ...user,
      name: user.name ? user.name.trim() : '',
      email: cleanEmail
    };

    try {
      const res = await fetchWithTimeout(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedUser)
      }, 3000);
      const data = await res.json();
      if (res.ok) {
        created = {
          ...data,
          email: (data.email || cleanEmail).trim().toLowerCase()
        };
      } else {
        throw new Error(data.error || 'Erro ao criar usuário');
      }
    } catch (err: any) {
      console.warn('Erro na API local ao criar usuário:', err.message);
      if (!err.message?.includes('fetch') && !err.message?.includes('network') && !err.message?.includes('timeout') && !err.message?.includes('Failed')) {
        throw err;
      }
    }

    try {
      const fbUser = await firebaseService.users.create(created || sanitizedUser);
      if (!created) created = { ...fbUser, email: (fbUser.email || cleanEmail).trim().toLowerCase() };
    } catch (err) {
      console.warn('Firestore offline ao criar usuário:', err);
    }

    if (!created) {
      const id = sanitizedUser.id || `usr-${Date.now()}`;
      created = {
        id,
        company_id: sanitizedUser.company_id || '',
        name: sanitizedUser.name || '',
        email: cleanEmail,
        role: sanitizedUser.role || 'TÉCNICO',
        active: sanitizedUser.active ?? 1,
        created_at: new Date().toISOString()
      };
    }

    try {
      const cached = getCachedUsers();
      setCachedUsers([created, ...cached.filter(u => u.id !== created!.id)]);
    } catch {}
    return created;
  },

  updateUser: async (id: string, user: Partial<User>): Promise<User> => {
    let updated: User | null = null;
    const sanitizedUser: Partial<User> = {
      ...user,
      ...(user.name ? { name: user.name.trim() } : {}),
      ...(user.email ? { email: user.email.trim().toLowerCase() } : {})
    };

    try {
      const res = await fetchWithTimeout(`${BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedUser)
      }, 3000);
      const data = await res.json();
      if (res.ok) {
        updated = {
          ...data,
          email: (data.email || sanitizedUser.email || '').trim().toLowerCase()
        };
      } else {
        throw new Error(data.error || 'Erro ao atualizar usuário');
      }
    } catch (err: any) {
      console.warn('Erro na API local ao atualizar usuário:', err.message);
      if (!err.message?.includes('fetch') && !err.message?.includes('network') && !err.message?.includes('timeout') && !err.message?.includes('Failed')) {
        throw err;
      }
    }

    try {
      const fbUser = await firebaseService.users.update(id, sanitizedUser);
      if (!updated) updated = { ...fbUser, email: (fbUser.email || sanitizedUser.email || '').trim().toLowerCase() };
    } catch (err) {
      console.warn('Firestore offline ao atualizar usuário:', err);
    }

    if (!updated) {
      const cached = getCachedUsers();
      const existing = cached.find(u => u.id === id);
      updated = { ...(existing || {}), ...sanitizedUser, id } as User;
    }

    try {
      const cached = getCachedUsers();
      setCachedUsers(cached.map(u => (u.id === id ? { ...u, ...updated } : u)));
    } catch {}
    return updated;
  },

  deleteUser: async (id: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/users/${id}`, { method: 'DELETE' }, 3000);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn('Aviso ao excluir usuário na API local:', data.error);
      }
    } catch (err) {
      console.warn('Erro na API local ao excluir usuário:', err);
    }

    try {
      await firebaseService.users.delete(id);
    } catch (err) {
      console.warn('Firestore ao excluir usuário:', err);
    }

    try {
      const cached = getCachedUsers();
      setCachedUsers(cached.filter(u => u.id !== id));
    } catch {}
    return { success: true };
  },

  resetUserPassword: async (id: string, password: string, email?: string): Promise<{ success: boolean; message: string }> => {
    let success = false;
    let message = 'Senha atualizada com sucesso.';

    try {
      const res = await fetchWithTimeout(`${BASE_URL}/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim(), email: email ? email.trim().toLowerCase() : undefined })
      }, 3000);
      const data = await res.json();
      if (res.ok) {
        success = true;
        message = data.message || message;
      } else {
        throw new Error(data.error || 'Erro ao redefinir senha do usuário');
      }
    } catch (err: any) {
      console.warn('Erro na API local ao redefinir senha:', err.message);
      if (!err.message?.includes('fetch') && !err.message?.includes('network') && !err.message?.includes('timeout') && !err.message?.includes('Failed')) {
        throw err;
      }
    }

    try {
      await firebaseService.users.update(id, { password: password.trim() } as any);
      success = true;
    } catch (err) {
      console.warn('Firestore offline ao redefinir senha:', err);
    }

    if (!success) {
      throw new Error('Não foi possível atualizar a senha. Verifique sua conexão e tente novamente.');
    }
    return { success, message };
  },

  toggleUserStatus: async (id: string, active: boolean): Promise<User> => {
    let updated: User | null = null;
    const statusVal = active ? 1 : 0;

    try {
      const res = await fetch(`${BASE_URL}/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: statusVal })
      });
      if (res.ok) {
        updated = await res.json();
      }
    } catch (err) {
      console.warn('API local ao alterar status do usuário:', err);
    }

    try {
      const fbUser = await firebaseService.users.update(id, { active: statusVal });
      if (!updated) updated = fbUser;
    } catch (err) {
      console.warn('Firestore ao atualizar status do usuário:', err);
    }

    if (!updated) throw new Error('Erro ao alterar status do usuário');
    return updated;
  },

  // STORAGE (Firebase Storage)
  uploadMedia: async (base64: string, filename?: string): Promise<{ url: string; base64: string }> => {
    try {
      const path = `uploads/${Date.now()}_${filename || 'media'}`;
      const url = await firebaseService.media.uploadBase64(base64, path);
      return { url, base64 };
    } catch (err) {
      console.warn('Fallback de upload:', err);
      const res = await fetch(`${BASE_URL}/upload-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, filename })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer upload da mídia');
      return data;
    }
  },

  uploadCompanyLogo: async (
    companyId: string,
    fileOrBase64: File | string,
    filename?: string
  ): Promise<{ downloadUrl: string; storagePath: string }> => {
    return await firebaseService.media.uploadCompanyLogo(companyId, fileOrBase64, filename);
  },

  // TECHNICIANS (Local SQLite API + Firestore mirror + Auto Cloud Persistence)
  getTechnicians: async (companyId?: string, userRole?: string): Promise<Technician[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetchWithTimeout(`${BASE_URL}/technicians?${params.toString()}`, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('API local de técnicos indisponível, buscando no Firestore...');
    }

    try {
      return await firebaseService.technicians.getAll(companyId, userRole);
    } catch {
      return [];
    }
  },

  createTechnician: async (technician: Partial<Technician>): Promise<Technician> => {
    let created: Technician | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/technicians`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(technician)
      }, 3000);
      if (res.ok) {
        created = await res.json();
      }
    } catch (err) {
      console.warn('API local ao cadastrar técnico:', err);
    }

    if (created) {
      firebaseService.technicians.create(created).catch(() => {});
      return created;
    }

    return await firebaseService.technicians.create(technician);
  },

  updateTechnician: async (id: string, technician: Partial<Technician>): Promise<Technician> => {
    let updated: Technician | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/technicians/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(technician)
      }, 3000);
      if (res.ok) {
        updated = await res.json();
      }
    } catch (err) {
      console.warn('API local ao atualizar técnico:', err);
    }

    if (updated) {
      firebaseService.technicians.update(id, technician).catch(() => {});
      return updated;
    }

    return await firebaseService.technicians.update(id, technician);
  },

  deleteTechnician: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetch(`${BASE_URL}/technicians/${id}`, { method: 'DELETE' });
    } catch (err) {}
    firebaseService.technicians.delete(id).catch(() => {});
    return { success: true };
  },

  // CLIENTS (Local SQLite API + Firestore mirror + Auto Cloud Persistence)
  getClients: async (companyId?: string, userRole?: string): Promise<Client[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetchWithTimeout(`${BASE_URL}/clients?${params.toString()}`, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('API local de clientes indisponível, buscando no Firestore...');
    }

    try {
      return await firebaseService.clients.getAll(companyId, userRole);
    } catch {
      return [];
    }
  },

  createClient: async (client: Partial<Client>): Promise<Client> => {
    let created: Client | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      }, 3000);
      if (res.ok) {
        created = await res.json();
      }
    } catch (err) {
      console.warn('API local ao cadastrar cliente:', err);
    }

    if (created) {
      firebaseService.clients.create(created).catch(() => {});
      return created;
    }

    return await firebaseService.clients.create(client);
  },

  updateClient: async (id: string, client: Partial<Client>): Promise<Client> => {
    let updated: Client | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      }, 3000);
      if (res.ok) {
        updated = await res.json();
      }
    } catch (err) {
      console.warn('API local ao atualizar cliente:', err);
    }

    if (updated) {
      firebaseService.clients.update(id, client).catch(() => {});
      return updated;
    }

    return await firebaseService.clients.update(id, client);
  },

  deleteClient: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetch(`${BASE_URL}/clients/${id}`, { method: 'DELETE' });
    } catch (err) {}
    firebaseService.clients.delete(id).catch(() => {});
    return { success: true };
  },

  // SERVICES & MATERIALS (Local SQLite API + Firestore mirror + Auto Cloud Persistence)
  getServices: async (filters?: { companyId?: string; userRole?: string; type?: 'servico' | 'material'; search?: string }): Promise<ServiceItem[]> => {
    try {
      const params = new URLSearchParams();
      if (filters?.companyId) params.append('companyId', filters.companyId);
      if (filters?.userRole) params.append('userRole', filters.userRole);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.search) params.append('search', filters.search);
      const res = await fetchWithTimeout(`${BASE_URL}/services?${params.toString()}`, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('API local de serviços indisponível, buscando no Firestore...');
    }

    try {
      let list = await firebaseService.services.getAll(filters?.companyId, filters?.userRole);
      if (filters?.type) list = list.filter((s) => s.item_type === filters.type);
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        list = list.filter((s) => s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
      }
      return list;
    } catch {
      return [];
    }
  },

  createService: async (service: Partial<ServiceItem>): Promise<ServiceItem> => {
    let created: ServiceItem | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      }, 3000);
      if (res.ok) {
        created = await res.json();
      }
    } catch (err) {
      console.warn('API local ao cadastrar serviço:', err);
    }

    if (created) {
      firebaseService.services.create(created).catch(() => {});
      return created;
    }

    return await firebaseService.services.create(service);
  },

  updateService: async (id: string, service: Partial<ServiceItem>): Promise<ServiceItem> => {
    let updated: ServiceItem | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      }, 3000);
      if (res.ok) {
        updated = await res.json();
      }
    } catch (err) {
      console.warn('API local ao atualizar serviço:', err);
    }

    if (updated) {
      firebaseService.services.update(id, service).catch(() => {});
      return updated;
    }

    return await firebaseService.services.update(id, service);
  },

  deleteService: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetch(`${BASE_URL}/services/${id}`, { method: 'DELETE' });
    } catch (err) {}
    firebaseService.services.delete(id).catch(() => {});
    return { success: true };
  },

  batchImportServices: async (
    items: any[],
    companyId?: string,
    updateExisting: boolean = true
  ): Promise<{ success: boolean; count: number }> => {
    const targetCompanyId = companyId || 'comp-master-cast';
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/services/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, company_id: targetCompanyId, update_existing: updateExisting })
      }, 12000);
      if (res.ok) {
        const result = await res.json();
        // Background sync to Firestore without blocking
        items.forEach((item) => {
          firebaseService.services.create({
            ...item,
            company_id: targetCompanyId
          }).catch(() => {});
        });
        return result;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao importar itens em lote.');
    } catch (e: any) {
      // Fallback: If local API fails, save directly to Firestore
      try {
        let imported = 0;
        for (const item of items) {
          if (!item.name || !item.name.trim()) continue;
          await firebaseService.services.create({
            ...item,
            company_id: targetCompanyId
          });
          imported++;
        }
        return { success: true, count: imported };
      } catch (fbErr: any) {
        throw new Error(e.message || fbErr.message || 'Falha ao importar itens.');
      }
    }
  },

  seedDefaultCatalog: async (companyId?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/services/seed-defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      }, 10000);
      if (res.ok) {
        return await res.json();
      }
      return { success: false, message: 'Falha ao recarregar catálogo.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao recarregar catálogo.' };
    }
  },

  // QUOTES (Local SQLite API + Firestore mirror + Auto Cloud Persistence)
  getQuotes: async (filters: { companyId?: string; userRole?: string; status?: string; search?: string }): Promise<Quote[]> => {
    try {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.userRole) params.append('userRole', filters.userRole);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      const res = await fetchWithTimeout(`${BASE_URL}/quotes?${params.toString()}`, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('API local de orçamentos indisponível, buscando no Firestore...');
    }

    try {
      return await firebaseService.quotes.getAll(filters);
    } catch {
      return [];
    }
  },

  getQuote: async (id: string): Promise<Quote> => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/quotes/${id}`, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) return data;
      }
    } catch (err) {
      console.warn('API local ao buscar orçamento por ID:', err);
    }

    try {
      const quote = await firebaseService.quotes.getById(id);
      if (quote) return quote;
    } catch (err) {}
    throw new Error('Orçamento não encontrado');
  },

  createQuote: async (quoteData: any): Promise<{ id: string; quote_number: number; total: number; message: string }> => {
    let apiResult: any = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      }, 3500);
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch (err) {
      console.warn('API local ao criar orçamento:', err);
    }

    if (apiResult) {
      const payloadToFirebase = {
        ...quoteData,
        id: apiResult.id || quoteData.id,
        quote_number: apiResult.quote_number || quoteData.quote_number
      };
      firebaseService.quotes.create(payloadToFirebase).catch(() => {});
      return apiResult;
    }

    const created = await firebaseService.quotes.create(quoteData);
    return {
      id: created.id,
      quote_number: created.quote_number,
      total: created.total,
      message: 'Orçamento salvo com sucesso!'
    };
  },

  updateQuote: async (id: string, quoteData: any): Promise<{ success: boolean; total: number; message: string }> => {
    let apiResult: any = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      }, 3500);
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch (err) {
      console.warn('API local ao atualizar orçamento:', err);
    }

    if (apiResult) {
      firebaseService.quotes.update(id, quoteData).catch(() => {});
      return apiResult;
    }

    await firebaseService.quotes.update(id, quoteData);
    return { success: true, total: quoteData.total || 0, message: 'Orçamento atualizado com sucesso!' };
  },

  duplicateQuote: async (id: string): Promise<{ id: string; quote_number: number; message: string }> => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/quotes/${id}/duplicate`, { method: 'POST' }, 3000);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {}

    const original = await firebaseService.quotes.getById(id);
    if (original) {
      const copy = await firebaseService.quotes.create({
        ...original,
        id: undefined,
        quote_number: undefined,
        client_name: `${original.client_name} (Cópia)`,
        status: 'Rascunho',
        created_at: new Date().toISOString()
      });
      return {
        id: copy.id,
        quote_number: copy.quote_number,
        message: 'Orçamento duplicado com sucesso!'
      };
    }
    throw new Error('Erro ao duplicar orçamento');
  },

  deleteQuote: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetch(`${BASE_URL}/quotes/${id}`, { method: 'DELETE' });
    } catch (err) {}
    firebaseService.quotes.delete(id).catch(() => {});
    return { success: true };
  },

  // WORK ORDERS (Local SQLite API + Firestore mirror + Auto Cloud Persistence)
  getWorkOrders: async (filters: { companyId?: string; userRole?: string; status?: string; search?: string; technicianId?: string }): Promise<WorkOrder[]> => {
    try {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.userRole) params.append('userRole', filters.userRole);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.technicianId) params.append('technicianId', filters.technicianId);
      const res = await fetchWithTimeout(`${BASE_URL}/work-orders?${params.toString()}`, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('API local de OS indisponível, buscando no Firestore...');
    }

    try {
      return await firebaseService.workOrders.getAll(filters);
    } catch {
      return [];
    }
  },

  getWorkOrder: async (id: string): Promise<WorkOrder> => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/work-orders/${id}`, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) return data;
      }
    } catch (err) {
      console.warn('API local ao buscar OS por ID:', err);
    }

    try {
      const order = await firebaseService.workOrders.getById(id);
      if (order) return order;
    } catch (err) {}
    throw new Error('Ordem de serviço não encontrada');
  },

  createWorkOrder: async (orderData: any): Promise<{ id: string; order_number: number; total: number; message: string }> => {
    let apiResult: any = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      }, 3500);
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch (err) {
      console.warn('API local ao criar ordem de serviço:', err);
    }

    if (apiResult) {
      const payloadToFirebase = {
        ...orderData,
        id: apiResult.id || orderData.id,
        order_number: apiResult.order_number || orderData.order_number
      };
      firebaseService.workOrders.create(payloadToFirebase).catch(() => {});
      return apiResult;
    }

    const created = await firebaseService.workOrders.create(orderData);
    return {
      id: created.id,
      order_number: created.order_number,
      total: created.total,
      message: 'Ordem de serviço salva com sucesso!'
    };
  },

  updateWorkOrder: async (id: string, orderData: any): Promise<{ success: boolean; total: number; message: string }> => {
    let apiResult: any = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/work-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      }, 3500);
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch (err) {
      console.warn('API local ao atualizar ordem de serviço:', err);
    }

    if (apiResult) {
      firebaseService.workOrders.update(id, orderData).catch(() => {});
      return apiResult;
    }

    return { success: true, total: orderData.total || 0, message: 'Ordem de serviço atualizada com sucesso!' };
  },

  saveWorkOrderSignature: async (
    id: string,
    signatureData: {
      client_signature?: string;
      client_signed_at?: string;
      technician_signature?: string;
      technician_signed_at?: string;
    }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/work-orders/${id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData)
      }, 3000);
      if (res.ok) {
        const data = await res.json();
        firebaseService.workOrders.update(id, signatureData).catch(() => {});
        return data;
      }
    } catch (err) {
      console.warn('API local de assinatura indisponível, tentando Firestore:', err);
    }
    await firebaseService.workOrders.update(id, signatureData);
    return { success: true, message: 'Assinatura salva com sucesso!' };
  },

  saveQuoteSignature: async (
    id: string,
    signatureData: {
      client_signature?: string;
      client_signed_at?: string;
      technician_signature?: string;
      technician_signed_at?: string;
    }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/quotes/${id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData)
      }, 3000);
      if (res.ok) {
        const data = await res.json();
        firebaseService.quotes.update(id, signatureData).catch(() => {});
        return data;
      }
    } catch (err) {
      console.warn('API local de assinatura indisponível, tentando Firestore:', err);
    }
    await firebaseService.quotes.update(id, signatureData);
    return { success: true, message: 'Assinatura salva com sucesso!' };
  },

  duplicateWorkOrder: async (id: string): Promise<{ id: string; order_number: number; message: string }> => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/work-orders/${id}/duplicate`, { method: 'POST' }, 3000);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {}

    const original = await firebaseService.workOrders.getById(id);
    if (original) {
      const copy = await firebaseService.workOrders.create({
        ...original,
        id: undefined,
        order_number: undefined,
        client_name: `${original.client_name} (Cópia)`,
        status: 'Aberta',
        created_at: new Date().toISOString()
      });
      return {
        id: copy.id,
        order_number: copy.order_number,
        message: 'Ordem de serviço duplicada no Firestore!'
      };
    }
    throw new Error('Erro ao duplicar ordem de serviço');
  },

  createWorkOrderFromQuote: async (quoteId: string): Promise<{ id: string; order_number: number; message: string }> => {
    // 1. Tentar endpoint local direto (ultra-rápido, ~2ms)
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/work-orders/from-quote/${quoteId}`, { method: 'POST' }, 3000);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {}

    // 2. Fallback Firestore se API local estiver inacessível
    const quote = await firebaseService.quotes.getById(quoteId);
    if (quote) {
      const order = await firebaseService.workOrders.create({
        company_id: quote.company_id,
        quote_id: quote.id,
        client_id: quote.client_id,
        client_name: quote.client_name,
        client_phone: quote.client_phone,
        client_email: quote.client_email,
        client_document: quote.client_document,
        technician_id: quote.technician_id || '',
        technician_name: quote.technician_name || '',
        created_by: quote.created_by,
        date: new Date().toISOString().split('T')[0],
        status: 'Aberta',
        service_description: quote.description || '',
        subtotal: quote.subtotal || 0,
        discount: quote.discount || 0,
        addition: quote.addition || 0,
        total: quote.total || 0,
        notes: quote.notes || '',
        items: quote.items?.map((item) => ({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price
        })) || []
      });

      firebaseService.quotes.update(quoteId, { status: 'Aprovado' }).catch(() => {});

      return {
        id: order.id,
        order_number: order.order_number,
        message: 'Ordem de serviço gerada a partir do orçamento com sucesso!'
      };
    }
    throw new Error('Erro ao converter orçamento em ordem de serviço');
  },

  deleteWorkOrder: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetch(`${BASE_URL}/work-orders/${id}`, { method: 'DELETE' });
    } catch (err) {}
    firebaseService.workOrders.delete(id).catch(() => {});
    return { success: true };
  },

  // VERTICAL PHOTO UPLOAD (Storage)
  uploadPhoto: async (payload: {
    image: string;
    width: number;
    height: number;
    company_id: string;
    caption?: string;
  }): Promise<{ success: boolean; url: string; width: number; height: number; caption?: string }> => {
    // 1. Try local server endpoint first to persist file to disk
    try {
      const res = await fetch(`${BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      console.warn('API /upload response not ok:', res.status);
    } catch (err) {
      console.warn('Servidor local /upload falhou, tentando Firebase:', err);
    }

    // 2. Try Firebase Storage if server upload is unreachable
    try {
      const path = `photos/${payload.company_id || 'general'}/${Date.now()}`;
      const url = await firebaseService.media.uploadBase64(payload.image, path);
      if (url && !url.startsWith('data:')) {
        return {
          success: true,
          url,
          width: payload.width,
          height: payload.height,
          caption: payload.caption
        };
      }
    } catch (err) {
      console.warn('Firebase Storage upload failed:', err);
    }

    // 3. Fallback to image data
    return {
      success: true,
      url: payload.image,
      width: payload.width,
      height: payload.height,
      caption: payload.caption
    };
  },

  // DASHBOARD
  getDashboardStats: async (companyId?: string, userRole?: string): Promise<DashboardStats> => {
    const cacheKey = `cast_dash_stats_${companyId || 'all'}_${userRole || 'all'}`;

    // Read stored cache in case of quick fallback
    const getCached = (): DashboardStats | null => {
      try {
        const raw = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    const saveCache = (data: DashboardStats) => {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {}
    };

    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetchWithTimeout(`${BASE_URL}/dashboard/stats?${params.toString()}`, {}, 3500);
      if (res.ok) {
        const rawStats: any = await res.json();
        if (rawStats && (rawStats.quotesCount !== undefined || rawStats.total_quotes !== undefined || rawStats.companiesCount !== undefined)) {
          const qCount = rawStats.quotesCount ?? rawStats.total_quotes ?? 0;
          const oCount = rawStats.ordersCount ?? rawStats.total_orders ?? 0;
          const qTotal = rawStats.quotesTotal ?? rawStats.total_quotes_value ?? 0;
          const oTotal = rawStats.ordersTotal ?? rawStats.total_orders_value ?? 0;
          const cCount = rawStats.clientsCount ?? rawStats.total_clients ?? 0;
          const tCount = rawStats.techniciansCount ?? rawStats.total_technicians ?? 0;
          const compCount = rawStats.companiesCount ?? rawStats.total_companies ?? 0;
          const qStatus = rawStats.statusDistribution?.quotes ?? rawStats.quotes_by_status ?? {};
          const oStatus = rawStats.statusDistribution?.orders ?? rawStats.orders_by_status ?? {};

          const normalized: DashboardStats = {
            quotesCount: qCount,
            ordersCount: oCount,
            quotesTotal: qTotal,
            ordersTotal: oTotal,
            clientsCount: cCount,
            techniciansCount: tCount,
            companiesCount: compCount,
            statusDistribution: {
              quotes: qStatus,
              orders: oStatus
            },
            total_quotes: qCount,
            total_quotes_value: qTotal,
            total_orders: oCount,
            total_orders_value: oTotal,
            total_clients: cCount,
            total_technicians: tCount,
            total_companies: compCount,
            quotes_by_status: qStatus,
            orders_by_status: oStatus,
            recentQuotes: rawStats.recentQuotes || [],
            recentOrders: rawStats.recentOrders || []
          };

          saveCache(normalized);
          return normalized;
        }
      }
    } catch (err) {
      console.warn('API local de stats lenta ou indisponível, verificando cache...');
    }

    const cached = getCached();
    if (cached) {
      return cached;
    }

    try {
      const [quotes, orders, clients, techs, companies] = await Promise.all([
        firebaseService.quotes.getAll({ companyId, userRole }),
        firebaseService.workOrders.getAll({ companyId, userRole }),
        firebaseService.clients.getAll(companyId, userRole),
        firebaseService.technicians.getAll(companyId, userRole),
        firebaseService.companies.getAll(userRole, companyId)
      ]);

      const quotesTotal = quotes.reduce((acc, curr) => acc + (curr.total || 0), 0);
      const ordersTotal = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);

      const quotesStatusDist: Record<string, number> = {
        'Rascunho': 0,
        'Enviado': 0,
        'Aprovado': 0,
        'Recusado': 0
      };
      quotes.forEach((q) => {
        if (quotesStatusDist[q.status] !== undefined) {
          quotesStatusDist[q.status]++;
        } else {
          quotesStatusDist[q.status] = 1;
        }
      });

      const ordersStatusDist: Record<string, number> = {
        'Aberta': 0,
        'Em Andamento': 0,
        'Concluída': 0,
        'Cancelada': 0
      };
      orders.forEach((o) => {
        if (ordersStatusDist[o.status] !== undefined) {
          ordersStatusDist[o.status]++;
        } else {
          ordersStatusDist[o.status] = 1;
        }
      });

      const fbStats: DashboardStats = {
        quotesCount: quotes.length,
        ordersCount: orders.length,
        quotesTotal,
        ordersTotal,
        clientsCount: clients.length,
        techniciansCount: techs.length,
        companiesCount: companies.length,
        statusDistribution: {
          quotes: quotesStatusDist,
          orders: ordersStatusDist
        },
        total_quotes: quotes.length,
        total_quotes_value: quotesTotal,
        total_orders: orders.length,
        total_orders_value: ordersTotal,
        total_clients: clients.length,
        total_technicians: techs.length,
        total_companies: companies.length,
        quotes_by_status: quotesStatusDist,
        orders_by_status: ordersStatusDist,
        recentQuotes: quotes.slice(0, 5),
        recentOrders: orders.slice(0, 5)
      };

      saveCache(fbStats);
      return fbStats;
    } catch (err) {
      console.error('Erro ao carregar estatísticas do painel:', err);
      // If everything fails, return zeroed structure rather than throwing
      return {
        quotesCount: 0,
        ordersCount: 0,
        quotesTotal: 0,
        ordersTotal: 0,
        clientsCount: 0,
        techniciansCount: 0,
        companiesCount: 1,
        statusDistribution: { quotes: {}, orders: {} },
        total_quotes: 0,
        total_quotes_value: 0,
        total_orders: 0,
        total_orders_value: 0,
        total_clients: 0,
        total_technicians: 0,
        total_companies: 1,
        quotes_by_status: {},
        orders_by_status: {},
        recentQuotes: [],
        recentOrders: []
      };
    }
  },

  // NOTIFICATIONS
  getNotifications: async (companyId?: string, userRole?: string): Promise<NotificationLog[]> => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (userRole) params.append('userRole', userRole);
    const res = await fetch(`${BASE_URL}/notifications?${params.toString()}`);
    if (!res.ok) return [];
    return res.json();
  },

  sendNotification: async (payload: {
    company_id: string;
    title: string;
    message: string;
    channel: 'whatsapp' | 'email' | 'system';
    recipient: string;
  }): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao registrar notificação');
    return data;
  },

  // GOOGLE DRIVE SYNC
  syncGoogleDrive: async (payload: {
    company_id: string;
    document_type: string;
    document_number: number | string;
    title: string;
    file_url?: string;
    client_name?: string;
    folder_path?: string;
    folder_url?: string;
    file_id?: string;
    photo_count?: number;
    photos?: Array<{
      uniqueCode: string;
      fileId: string;
      fileName: string;
      webViewLink?: string;
    }>;
  }): Promise<{ success: boolean; folder: string; drive_file_id: string; message: string; folder_url?: string; photo_count?: number }> => {
    const res = await fetch(`${BASE_URL}/drive/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar com Google Drive');
    return data;
  },

  getDriveSettings: async (): Promise<{
    id?: string;
    account_email: string;
    account_name?: string;
    account_photo?: string;
    root_folder_name?: string;
    auto_sync?: number;
    sync_photos?: number;
    updated_at?: string;
  } | null> => {
    try {
      const res = await fetch(`${BASE_URL}/drive/settings`);
      if (res.ok) {
        const localSettings = await res.json();
        if (localSettings && localSettings.account_email) return localSettings;
      }
    } catch {}

    // Fallback: carregar diretamente do Cloud Firestore
    try {
      const fbSettings = await firebaseService.settings.getDriveSettings();
      if (fbSettings && fbSettings.account_email) {
        // Reidratar no backend local em background
        fetch(`${BASE_URL}/drive/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbSettings)
        }).catch(() => {});
        return fbSettings;
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações do Drive no Firestore:', err);
    }
    return null;
  },

  saveDriveSettings: async (settings: {
    account_email: string;
    account_name?: string;
    account_photo?: string;
    root_folder_name?: string;
    auto_sync?: boolean;
    sync_photos?: boolean;
  }): Promise<any> => {
    // 1. Salvar no Firestore para persistência definitiva entre deploys
    try {
      await firebaseService.settings.saveDriveSettings(settings);
    } catch (err) {
      console.warn('Erro ao salvar configurações do Drive no Firestore:', err);
    }

    // 2. Salvar na API local
    let data: any = { success: true };
    try {
      const res = await fetch(`${BASE_URL}/drive/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch (err) {
      console.warn('API local offline ao salvar settings do Drive:', err);
    }

    return data;
  },

  deleteDriveSettings: async (): Promise<any> => {
    try {
      await firebaseService.settings.saveDriveSettings({
        account_email: '',
        account_name: '',
        account_photo: ''
      });
    } catch {}

    try {
      const res = await fetch(`${BASE_URL}/drive/settings`, {
        method: 'DELETE'
      });
      if (res.ok) return await res.json();
    } catch {}
    return { success: true };
  },

  // SINCRONIZAÇÃO COMPLETA NUVEM (Firestore) -> SQLite LOCAL
  // Chamada automaticamente ao carregar o aplicativo para garantir que nenhum dado seja perdido após deploy
  syncCloudToLocal: async (): Promise<{ success: boolean; details?: any }> => {
    try {
      // 1. Verifica se SQLite está vazio ou recém-criado
      const statsRes = await fetch(`${BASE_URL}/sync/stats`).catch(() => null);
      let stats = { quotes: 0, work_orders: 0, clients: 0, technicians: 0, companies: 0, users: 0 };
      if (statsRes && statsRes.ok) {
        stats = await statsRes.json();
      }

      // Se todas as entidades locais já estiverem populadas, não há necessidade de reidratar
      if (
        stats.quotes > 0 &&
        stats.work_orders > 0 &&
        stats.clients > 0 &&
        stats.technicians > 0
      ) {
        return { success: true, details: 'Banco local já populado' };
      }

      // 2. Busca dados salvos no Firestore
      const [fbQuotes, fbOrders, fbClients, fbTechs, fbComps, fbUsers, fbServices] = await Promise.all([
        firebaseService.quotes.getAll({}).catch(() => []),
        firebaseService.workOrders.getAll({}).catch(() => []),
        firebaseService.clients.getAll().catch(() => []),
        firebaseService.technicians.getAll().catch(() => []),
        firebaseService.companies.getAll().catch(() => []),
        firebaseService.users.getAll().catch(() => []),
        firebaseService.services.getAll().catch(() => [])
      ]);

      if (
        fbQuotes.length === 0 &&
        fbOrders.length === 0 &&
        fbClients.length === 0 &&
        fbTechs.length === 0 &&
        fbServices.length === 0
      ) {
        return { success: true, details: 'Sem registros remotos para restaurar' };
      }

      // 3. Envia para o SQLite local para restaurar
      const restoreRes = await fetch(`${BASE_URL}/sync/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: fbComps,
          users: fbUsers,
          clients: fbClients,
          technicians: fbTechs,
          services: fbServices,
          quotes: fbQuotes,
          work_orders: fbOrders
        })
      });

      if (restoreRes.ok) {
        const result = await restoreRes.json();
        console.log('Sincronização Nuvem -> SQLite concluída:', result);
        return { success: true, details: result };
      }
    } catch (err) {
      console.warn('Erro ao sincronizar Firestore -> SQLite:', err);
    }
    return { success: false };
  },

  // LIMPEZA COMPLETA DO BANCO DE DADOS (Mantendo apenas DEV)
  cleanDatabase: async (): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Limpar SQLite local
      await fetch(`${BASE_URL}/dev/clean-database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});

      // 2. Limpar Firestore remoto
      await cleanFirestoreDatabaseComplete().catch(() => {});

      // 3. Limpar caches locais do navegador
      try {
        const devToken = localStorage.getItem('cast_auth_token');
        const devUser = localStorage.getItem('cast_auth_user');
        localStorage.clear();
        sessionStorage.clear();
        if (devToken && devUser) {
          localStorage.setItem('cast_auth_token', devToken);
          localStorage.setItem('cast_auth_user', devUser);
        }
      } catch {}

      return { success: true, message: 'Banco de dados completamente limpo. Apenas cadastros DEV preservados.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao limpar banco de dados' };
    }
  }
};
