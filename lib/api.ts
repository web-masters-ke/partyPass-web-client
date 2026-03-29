import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getToken, removeToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

const api: AxiosInstance = axios.create({ baseURL: BASE_URL, headers: { "Content-Type": "application/json" } });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const isAuth = error.config?.url?.includes("/auth/");
    const isPublicPage = typeof window !== "undefined" &&
      ["/", "/login", "/register"].some(p => window.location.pathname === p || window.location.pathname.startsWith("/events/") && window.location.pathname.split("/").length === 3);
    if (error.response?.status === 401 && !isAuth && !isPublicPage) {
      removeToken();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export function unwrap<T>(r: AxiosResponse): T { return r.data?.data ?? r.data; }

export const authApi = {
  login: (email: string, password: string) => api.post("/auth/login", { email, password }),
  register: (data: Record<string, unknown>) => api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
  refresh: (refreshToken: string, userId: string) => api.post("/auth/refresh", { refreshToken, userId }),
};

export const eventsApi = {
  list: (params?: Record<string, unknown>) => api.get("/events", { params }),
  get: (id: string) => api.get(`/events/${id}`),
  featured: () => api.get("/events/featured"),
  search: (q: string, params?: Record<string, unknown>) => api.get("/search/events", { params: { q, ...params } }),
};

export const ticketsApi = {
  myTickets: (params?: Record<string, unknown>) => api.get("/users/me/tickets", { params }),
  get: (id: string) => api.get(`/tickets/${id}`),
  qr: (id: string) => api.get(`/tickets/${id}/qr`),
};

export const ordersApi = {
  create: (data: Record<string, unknown>) => api.post("/orders", data),
  get: (id: string) => api.get(`/orders/${id}`),
  myOrders: (params?: Record<string, unknown>) => api.get("/users/me/orders", { params }),
  initiateMpesa: (orderId: string, phone: string) => api.post(`/orders/${orderId}/pay/mpesa-stk`, { phone }),
  initiatePaybill: (orderId: string) => api.get(`/orders/${orderId}/pay/mpesa-paybill`),
  checkStatus: (orderId: string) => api.get(`/orders/${orderId}`),
  testPay: (orderId: string) => api.post(`/orders/${orderId}/pay/test`),
  payCard: (orderId: string, reference: string) => api.post(`/orders/${orderId}/pay/card`, { reference }),
};

export const loyaltyApi = {
  me: () => api.get("/users/me/loyalty"),
  redeem: (rewardId: string) => api.post(`/loyalty/redeem/${rewardId}`),
  rewards: () => api.get("/loyalty/rewards"),
};

export const venuesApi = {
  list: (params?: Record<string, unknown>) => api.get("/venues", { params }),
  get: (id: string) => api.get(`/venues/${id}`),
};

export const clubsApi = {
  nights: (params?: Record<string, unknown>) => api.get("/clubs/nights", { params }),
};

export const userApi = {
  me: () => api.get("/users/me"),
  update: (data: Record<string, unknown>) => api.patch("/users/me", data),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return api.post("/users/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get("/notifications", { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};

export const reviewsApi = {
  create: (data: Record<string, unknown>) => api.post("/reviews", data),
  event: (eventId: string) => api.get(`/reviews/event/${eventId}`),
};

export const promosApi = {
  validate: (code: string, eventId: string) => api.post("/promos/validate", { code, eventId }),
};

export const organizerApi = {
  myEvents: (params?: Record<string, unknown>) => api.get("/organizer/events", { params }),
  wallet: () => api.get("/organizer/wallet"),
  payouts: (params?: Record<string, unknown>) => api.get("/organizer/payouts", { params }),
  requestPayout: (data: { amount: number; phone: string; notes?: string }) =>
    api.post("/organizer/payouts/request", data),
  updatePayoutSettings: (data: Record<string, unknown>) =>
    api.patch("/organizer/payout-settings", data),
  createEvent: (data: Record<string, unknown>) => api.post("/events", data),
  updateEvent: (id: string, data: Record<string, unknown>) => api.patch(`/events/${id}`, data),
  eventAnalytics: (id: string) => api.get(`/events/${id}/analytics`),
  eventAttendees: (id: string, params?: Record<string, unknown>) => api.get(`/events/${id}/attendees`, { params }),
  publishEvent: (id: string) => api.post(`/events/${id}/publish`),
  cancelEvent: (id: string) => api.post(`/events/${id}/cancel`),
};

export const membershipApi = {
  plans: () => api.get("/membership/plans"),
  me: () => api.get("/membership/me"),
  subscribe: (data: { plan: string; billingCycle: string; phone: string }) =>
    api.post("/membership/subscribe", data),
  cancel: () => api.post("/membership/cancel"),
};

export const walletApi = {
  balance: () => api.get("/wallet/me"),
  transactions: (params?: Record<string, unknown>) => api.get("/wallet/me/transactions", { params }),
  topup: (phone: string, amount: number, extra?: Record<string, unknown>) =>
    api.post("/wallet/topup", { phone, amount, ...extra }),
};

export const waitlistApi = {
  mine: () => api.get("/users/me/waitlist"),
  claim: (id: string) => api.post(`/waitlist/${id}/claim`),
  join: (eventId: string, tierId: string) => api.post("/waitlist", { eventId, tierId }),
};

export const waitingRoomApi = {
  status: (eventId: string) => api.get(`/waiting-room/${eventId}/status`),
  enter: (eventId: string) => api.post(`/waiting-room/${eventId}/enter`),
};

export const groupBookingsApi = {
  create: (data: Record<string, unknown>) => api.post("/group-bookings", data),
  mine: () => api.get("/group-bookings/my"),
  getByToken: (shareToken: string) => api.get(`/group-bookings/join/${shareToken}`),
  join: (shareToken: string) => api.post(`/group-bookings/join/${shareToken}`),
};

export const mediaApi = {
  upload: (file: File, folder = 'events') => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/media/upload?folder=${folder}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const pdfApi = {
  generate: (ticketId: string) => api.post(`/pdf/tickets/${ticketId}`),
};

export const digitalWalletApi = {
  apple: (ticketId: string) => api.post(`/digital-wallet/apple/${ticketId}`),
  google: (ticketId: string) => api.post(`/digital-wallet/google/${ticketId}`),
};

export const teamApi = {
  getMyTeam: () => api.get("/users/my-team"),
  getTeamStats: () => api.get("/users/my-team/stats"),
  searchStaff: (q: string) => api.get("/users/staff/search", { params: { q } }),
  createStaff: (data: Record<string, unknown>) => api.post("/users/staff", data),
  setMemberStatus: (userId: string, isActive: boolean) =>
    api.patch(`/users/${userId}/status`, { isActive }),
  changeAssignmentRole: (assignmentId: string, role: string) =>
    api.patch(`/users/assignments/${assignmentId}/role`, { role }),
  getMemberProfile: (userId: string) => api.get(`/users/my-team/${userId}`),
  updateMemberProfile: (userId: string, data: Record<string, unknown>) =>
    api.patch(`/users/my-team/${userId}`, data),
  getEventStaff: (eventId: string) => api.get(`/events/${eventId}/staff`),
  assignStaff: (
    eventId: string,
    data: { userId: string; role: string; gateId?: string }
  ) => api.post(`/events/${eventId}/staff`, data),
  removeStaff: (eventId: string, assignmentId: string) =>
    api.delete(`/events/${eventId}/staff/${assignmentId}`),
  getEventGates: (eventId: string) => api.get(`/events/${eventId}/gates`),
};

export const wristbandApi = {
  my: (eventId: string) => api.get(`/wristbands/my/${eventId}`),
  issueQr: (ticketId: string) => api.post("/wristbands/issue-qr", { ticketId }),
  topupFromWallet: (nfcId: string, amount: number) =>
    api.post("/wristbands/topup-wallet", { nfcId, amount }),
  transactions: (nfcId: string, page = 1, limit = 20) =>
    api.get(`/wristbands/${nfcId}/transactions`, { params: { page, limit } }),
};

export default api;
