export type Venue = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  price_per_day: number;
  city: string;
  area: string;           // ← add
  address: string;
  description: string;
  amenities: string[];
  images: string[];
  available_dates: string[]; // ← add
  is_available: boolean;
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  images: string[];
  rating: number;
};

export type CateringPackage = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price_per_person: number;
  min_guests: number;
  items: string[];
};

export type Photographer = {
  id: string;
  name: string;
  type: 'individual' | 'company';
  bio: string;
  price_per_day: number;
  rating: number;
  images: string[];
};

export type AVEquipment = {
  id: string;
  name: string;
  category: 'stage' | 'led' | 'projector' | 'audio' | 'lights';
  description: string;
  price_per_day: number;
  image: string;
};

export type PrintingItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  price_per_unit: number;
  image: string;
};

export type CartItem = {
  serviceType: 'venue' | 'catering' | 'photographer' | 'av' | 'printing';
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  metadata?: Record<string, any>;
};

export type Order = {
  id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total_egp: number;
  event_date: string;
  notes: string;
  created_at: string;
  project_manager_id: string | null;
  order_items?: OrderItem[];
};

export type ProjectManager = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  photo_url: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  service_type: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  metadata?: Record<string, any>;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: 'order' | 'system' | 'promo';
  is_read: boolean;
  created_at: string;
};