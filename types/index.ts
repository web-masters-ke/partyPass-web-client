export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  isVerified: boolean;
  loyaltyTier: string;
  loyaltyPoints: number;
  organizerName?: string;
  payoutMethod?: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  category: string;
  status: string;
  startDateTime: string;
  endDateTime: string;
  doorsOpenAt?: string;
  dressCode?: string;
  ageRestriction?: number;
  maxCapacity: number;
  isPrivate: boolean;
  venue?: Venue;
  organizer?: { id: string; firstName: string; lastName: string; organizerName?: string };
  ticketTiers?: TicketTier[];
  attendeeCount?: number;
  genreTags: string[];
}

export interface TicketTier {
  id: string;
  name: string;
  tierType: string;
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  description?: string;
  color?: string;
  perks: string[];
}

export interface Ticket {
  id: string;
  qrCode: string;
  status: string;
  event: Pick<Event, "id" | "title" | "startDateTime" | "coverImageUrl" | "category">;
  tier: Pick<TicketTier, "name" | "tierType" | "color" | "perks">;
  order: { total: number; currency: string; paidAt?: string; status: string };
  createdAt: string;
}

export interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  paymentMethod?: string;
  mpesaRef?: string;
  paidAt?: string;
  event: Pick<Event, "id" | "title" | "coverImageUrl" | "startDateTime" | "category">;
  tickets: Ticket[];
  createdAt: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  logoUrl?: string;
  bannerUrl?: string;
  photos: string[];
  amenities: string[];
}

export interface LoyaltyInfo {
  tier: string;
  points: number;
  nextTier?: string;
  nextTierPoints?: number;
  pointsToNextTier: number;
  recentHistory: LoyaltyEvent[];
}

export interface LoyaltyEvent {
  id: string;
  action: string;
  points: number;
  description?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  user: Pick<User, "id" | "firstName" | "lastName" | "avatarUrl">;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
