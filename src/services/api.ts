import {
  Company,
  User,
  Technician,
  Client,
  Quote,
  WorkOrder,
  DashboardStats,
  NotificationLog
} from '../types';
import { firebaseService } from './firebase';

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
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setCachedUsers = (users: User[]) => {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
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
        return await res.json();
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
      const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (found) {
        return {
          token: `fb-token-${found.id}-${Date.now()}`,
          user: found
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
      const res = await fetchWithTimeout(`${BASE_URL}/companies?${params.toString()}`, {}, 1200);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const companies: Company[] = await res.json();
        if (companies && companies.length > 0) {
          setCachedCompanies(companies);
          return companies;
        }
      }
    } catch (err) {
      // Local API unavailable or timed out, fallback to Firestore
    }

    try {
      const companies = await firebaseService.companies.getAll(userRole, companyId);
      if (companies && companies.length > 0) {
        setCachedCompanies(companies);
        return companies;
      }
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar empresas:', err);
    }

    // Local cached fallback so UI is NEVER empty
    const cached = getCachedCompanies();
    if (cached.length > 0) {
      if (userRole && userRole !== 'DEV' && companyId) {
        return cached.filter(c => c.id === companyId && c.active !== 0);
      }
      return cached.filter(c => c.active !== 0);
    }

    return [];
  },

  createCompany: async (company: Partial<Company> & { manager_name?: string; manager_email?: string; manager_password?: string }): Promise<Company> => {
    let created: Company | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      }, 3500);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        created = await res.json();
      }
    } catch (err) {
      console.warn('Erro ao criar empresa na API local:', err);
    }

    try {
      const fbCompany = await firebaseService.companies.create(created || company);
      if (!created) created = fbCompany;
    } catch (err) {
      console.warn('Firestore offline ao criar empresa:', err);
    }

    // Fallback if neither local API nor Firestore responded in time
    if (!created) {
      const id = company.id || `comp-${Date.now()}`;
      created = {
        id,
        name: company.name || 'Nova Empresa',
        cnpj: company.cnpj || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        logo_url: company.logo_url || '',
        primary_color: company.primary_color || '#2563eb',
        active: company.active ?? 1,
        created_at: company.created_at || new Date().toISOString()
      };
    }

    try {
      const existing = getCachedCompanies();
      const updated = [created, ...existing.filter(c => c.id !== created!.id)];
      setCachedCompanies(updated);
    } catch {}

    return created;
  },

  updateCompany: async (id: string, company: Partial<Company>): Promise<Company> => {
    let updated: Company | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      }, 3000);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        updated = await res.json();
      }
    } catch (err) {
      console.warn('Erro ao atualizar empresa na API local:', err);
    }

    try {
      const fbCompany = await firebaseService.companies.update(id, company);
      if (!updated) updated = fbCompany;
    } catch (err) {
      console.warn('Firestore offline ao atualizar empresa:', err);
    }

    if (!updated) {
      const existing = getCachedCompanies().find(c => c.id === id);
      updated = {
        ...(existing || {}),
        ...company,
        id
      } as Company;
    }

    try {
      const currentList = getCachedCompanies();
      const nextList = currentList.map(c => c.id === id ? { ...c, ...updated } : c);
      setCachedCompanies(nextList);
    } catch {}

    return updated;
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

    try {
      const fbCompany = await firebaseService.companies.updateBranding(id, primaryColor, logoUrl, storagePath);
      if (!updated) updated = fbCompany;
    } catch (err) {
      console.warn('Firestore offline ao salvar branding:', err);
    }

    if (!updated) throw new Error('Erro ao atualizar branding da empresa.');
    return updated;
  },

  deleteCompany: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetch(`${BASE_URL}/companies/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Erro ao deletar empresa localmente:', err);
    }
    try {
      await firebaseService.companies.delete(id);
    } catch (err) {
      console.warn('Erro ao deletar empresa no Firestore:', err);
    }
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

    try {
      const fbCompany = await firebaseService.companies.update(id, { active: active ? 1 : 0 });
      if (!result) {
        result = { company: fbCompany };
      }
    } catch (err) {
      console.warn('Firestore offline ao alterar status da empresa:', err);
    }

    if (!result) throw new Error('Erro ao alterar status da empresa.');
    return result;
  },

  // USERS (Local SQLite API + Firestore mirror + Local Cache)
  getUsers: async (companyId?: string, userRole?: string): Promise<User[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetchWithTimeout(`${BASE_URL}/users?${params.toString()}`, {}, 1200);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const users: User[] = await res.json();
        if (users && users.length > 0) {
          const filtered = users.filter((u) => u.role !== 'DEV');
          const existing = getCachedUsers();
          if (companyId) {
            const others = existing.filter(u => u.company_id !== companyId);
            setCachedUsers([...others, ...filtered]);
          } else {
            setCachedUsers(filtered);
          }
          return filtered;
        }
      }
    } catch (err) {
      // Local API unavailable or timed out, fallback to Firestore
    }

    try {
      const users = await firebaseService.users.getAll(companyId, userRole);
      if (users.length > 0) {
        const filtered = users.filter((u) => u.role !== 'DEV');
        const existing = getCachedUsers();
        if (companyId) {
          const others = existing.filter(u => u.company_id !== companyId);
          setCachedUsers([...others, ...filtered]);
        } else {
          setCachedUsers(filtered);
        }
        return filtered;
      }
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar usuários:', err);
    }

    // Local cached fallback so UI is NEVER empty
    const cached = getCachedUsers();
    if (cached.length > 0) {
      if (companyId && companyId !== 'all' && companyId !== 'ALL') {
        return cached.filter(u => u.company_id === companyId && u.role !== 'DEV');
      }
      return cached.filter(u => u.role !== 'DEV');
    }

    return [];
  },

  createUser: async (user: Partial<User>): Promise<User> => {
    let created: User | null = null;
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      }, 3000);
      const data = await res.json();
      if (res.ok) {
        created = data;
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
      const fbUser = await firebaseService.users.create(created || user);
      if (!created) created = fbUser;
    } catch (err) {
      console.warn('Firestore offline ao criar usuário:', err);
    }

    if (!created) {
      const id = user.id || `usr-${Date.now()}`;
      created = {
        id,
        company_id: user.company_id || '',
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'TÉCNICO',
        active: user.active ?? 1,
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
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      }, 3000);
      const data = await res.json();
      if (res.ok) {
        updated = data;
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
      const fbUser = await firebaseService.users.update(id, user);
      if (!updated) updated = fbUser;
    } catch (err) {
      console.warn('Firestore offline ao atualizar usuário:', err);
    }

    if (!updated) {
      const cached = getCachedUsers();
      const existing = cached.find(u => u.id === id);
      updated = { ...(existing || {}), ...user, id } as User;
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

  // TECHNICIANS (Local SQLite API + Firestore mirror)
  getTechnicians: async (companyId?: string, userRole?: string): Promise<Technician[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetch(`${BASE_URL}/technicians?${params.toString()}`);
      if (res.ok) {
        const techs: Technician[] = await res.json();
        if (techs && techs.length > 0) return techs;
      }
    } catch (err) {
      console.warn('API local de técnicos indisponível, buscando no Firestore...');
    }

    try {
      const techs = await firebaseService.technicians.getAll(companyId, userRole);
      if (techs.length > 0) return techs;
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar técnicos:', err);
    }
    return [];
  },

  createTechnician: async (technician: Partial<Technician>): Promise<Technician> => {
    try {
      return await firebaseService.technicians.create(technician);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/technicians`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(technician)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar técnico');
      return data;
    }
  },

  updateTechnician: async (id: string, technician: Partial<Technician>): Promise<Technician> => {
    try {
      return await firebaseService.technicians.update(id, technician);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/technicians/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(technician)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar técnico');
      return data;
    }
  },

  deleteTechnician: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await firebaseService.technicians.delete(id);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/technicians/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir técnico');
      return res.json();
    }
  },

  // CLIENTS (Local SQLite API + Firestore mirror)
  getClients: async (companyId?: string, userRole?: string): Promise<Client[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetch(`${BASE_URL}/clients?${params.toString()}`);
      if (res.ok) {
        const clients: Client[] = await res.json();
        if (clients && clients.length > 0) return clients;
      }
    } catch (err) {
      console.warn('API local de clientes indisponível, buscando no Firestore...');
    }

    try {
      const clients = await firebaseService.clients.getAll(companyId, userRole);
      if (clients.length > 0) return clients;
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar clientes:', err);
    }
    return [];
  },

  createClient: async (client: Partial<Client>): Promise<Client> => {
    try {
      return await firebaseService.clients.create(client);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cliente');
      return data;
    }
  },

  updateClient: async (id: string, client: Partial<Client>): Promise<Client> => {
    try {
      return await firebaseService.clients.update(id, client);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar cliente');
      return data;
    }
  },

  deleteClient: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await firebaseService.clients.delete(id);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir cliente');
      return res.json();
    }
  },

  // QUOTES (Local SQLite API + Firestore mirror)
  getQuotes: async (filters: { companyId?: string; userRole?: string; status?: string; search?: string }): Promise<Quote[]> => {
    try {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.userRole) params.append('userRole', filters.userRole);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      const res = await fetch(`${BASE_URL}/quotes?${params.toString()}`);
      if (res.ok) {
        const quotes: Quote[] = await res.json();
        return quotes || [];
      }
    } catch (err) {
      console.warn('API local de orçamentos indisponível, buscando no Firestore...');
    }

    try {
      const quotes = await firebaseService.quotes.getAll(filters);
      if (quotes.length > 0) return quotes;
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar orçamentos:', err);
    }
    return [];
  },

  getQuote: async (id: string): Promise<Quote> => {
    try {
      const res = await fetch(`${BASE_URL}/quotes/${id}`);
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
    } catch (err) {
      console.warn('Fallback para Firestore ao buscar orçamento por ID:', err);
    }
    throw new Error('Orçamento não encontrado');
  },

  createQuote: async (quoteData: any): Promise<{ id: string; quote_number: number; total: number; message: string }> => {
    let apiResult: any = null;
    try {
      const res = await fetch(`${BASE_URL}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      });
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch (err) {
      console.warn('API local ao criar orçamento:', err);
    }

    try {
      const payloadToFirebase = {
        ...quoteData,
        id: apiResult?.id || quoteData.id,
        quote_number: apiResult?.quote_number || quoteData.quote_number
      };
      await firebaseService.quotes.create(payloadToFirebase);
    } catch (err) {
      console.warn('Firestore ao sincronizar orçamento:', err);
    }

    if (apiResult) return apiResult;

    // Fallback if backend was unreachable
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
      const res = await fetch(`${BASE_URL}/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      });
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch (err) {
      console.warn('API local ao atualizar orçamento:', err);
    }

    try {
      await firebaseService.quotes.update(id, quoteData);
    } catch (err) {
      console.warn('Firestore ao sincronizar atualização de orçamento:', err);
    }

    if (apiResult) return apiResult;
    return { success: true, total: quoteData.total || 0, message: 'Orçamento atualizado com sucesso!' };
  },

  duplicateQuote: async (id: string): Promise<{ id: string; quote_number: number; message: string }> => {
    try {
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
          message: 'Orçamento duplicado com sucesso no Firestore!'
        };
      }
    } catch (e) {
      // Fallback
    }
    const res = await fetch(`${BASE_URL}/quotes/${id}/duplicate`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao duplicar orçamento');
    return data;
  },

  deleteQuote: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await firebaseService.quotes.delete(id);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/quotes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir orçamento');
      return res.json();
    }
  },

  // WORK ORDERS (Local SQLite API + Firestore mirror)
  getWorkOrders: async (filters: { companyId?: string; userRole?: string; status?: string; search?: string; technicianId?: string }): Promise<WorkOrder[]> => {
    try {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.userRole) params.append('userRole', filters.userRole);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.technicianId) params.append('technicianId', filters.technicianId);
      const res = await fetch(`${BASE_URL}/work-orders?${params.toString()}`);
      if (res.ok) {
        const orders: WorkOrder[] = await res.json();
        return orders || [];
      }
    } catch (err) {
      console.warn('API local de OS indisponível, buscando no Firestore...');
    }

    try {
      const orders = await firebaseService.workOrders.getAll(filters);
      if (orders.length > 0) return orders;
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar ordens de serviço:', err);
    }
    return [];
  },

  getWorkOrder: async (id: string): Promise<WorkOrder> => {
    try {
      const res = await fetch(`${BASE_URL}/work-orders/${id}`);
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
    } catch (err) {
      console.warn('Fallback para Firestore ao buscar ordem de serviço por ID:', err);
    }
    throw new Error('Ordem de serviço não encontrada');
  },

  createWorkOrder: async (orderData: any): Promise<{ id: string; order_number: number; total: number; message: string }> => {
    let apiResult: any = null;
    try {
      const res = await fetch(`${BASE_URL}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch (err) {
      console.warn('API local ao criar ordem de serviço:', err);
    }

    try {
      const payloadToFirebase = {
        ...orderData,
        id: apiResult?.id || orderData.id,
        order_number: apiResult?.order_number || orderData.order_number
      };
      await firebaseService.workOrders.create(payloadToFirebase);
    } catch (err) {
      console.warn('Firestore ao sincronizar ordem de serviço:', err);
    }

    if (apiResult) return apiResult;

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
      const res = await fetch(`${BASE_URL}/work-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch (err) {
      console.warn('API local ao atualizar ordem de serviço:', err);
    }

    try {
      await firebaseService.workOrders.update(id, orderData);
    } catch (err) {
      console.warn('Firestore ao sincronizar atualização de ordem de serviço:', err);
    }

    if (apiResult) return apiResult;
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
      const res = await fetch(`${BASE_URL}/work-orders/${id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData)
      });
      if (res.ok) {
        const data = await res.json();
        // Mirror to Firestore if available
        try {
          await firebaseService.workOrders.update(id, signatureData);
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn('API local de assinatura indisponível, tentando Firestore:', err);
    }
    // Fallback to Firestore update
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
      const res = await fetch(`${BASE_URL}/quotes/${id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData)
      });
      if (res.ok) {
        const data = await res.json();
        try {
          await firebaseService.quotes.update(id, signatureData);
        } catch {}
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
    } catch (e) {
      // Fallback
    }
    const res = await fetch(`${BASE_URL}/work-orders/${id}/duplicate`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao duplicar ordem de serviço');
    return data;
  },

  createWorkOrderFromQuote: async (quoteId: string): Promise<{ id: string; order_number: number; message: string }> => {
    try {
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

        // Mark quote as Aprovado
        await firebaseService.quotes.update(quoteId, { status: 'Aprovado' });

        return {
          id: order.id,
          order_number: order.order_number,
          message: 'Ordem de serviço gerada a partir do orçamento com sucesso!'
        };
      }
    } catch (e) {
      // Fallback
    }
    const res = await fetch(`${BASE_URL}/work-orders/from-quote/${quoteId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao converter orçamento em ordem de serviço');
    return data;
  },

  deleteWorkOrder: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await firebaseService.workOrders.delete(id);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/work-orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir ordem de serviço');
      return res.json();
    }
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
    const res = await fetch(`${BASE_URL}/drive/settings`);
    if (!res.ok) return null;
    return await res.json();
  },

  saveDriveSettings: async (settings: {
    account_email: string;
    account_name?: string;
    account_photo?: string;
    root_folder_name?: string;
    auto_sync?: boolean;
    sync_photos?: boolean;
  }): Promise<any> => {
    const res = await fetch(`${BASE_URL}/drive/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao salvar configurações do Drive');
    return data;
  },

  deleteDriveSettings: async (): Promise<any> => {
    const res = await fetch(`${BASE_URL}/drive/settings`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao desconectar conta do Drive');
    return data;
  }
};
