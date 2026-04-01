
export type BusinessCategory = 'Maquinaria' | 'Repuestos' | 'Insumos' | 'Materiales' | 'Gorras';

export interface CompanyInfo {
  name: string;
  ruc: string;
  address: string;
  phone: string;
  email: string;
  slogan: string;
  logoUrl?: string;
}

export interface Client {
  id: string;
  name: string;
  rucOrDni: string;
  email: string;
  phone: string;
  address: string;
  category: 'Frecuente' | 'Nuevo' | 'VIP';
  createdAt: string;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: BusinessCategory;
  description: string;
  price: number;
  stock: number;
  unit: string; // 'Unidad', 'Set', 'Rollo', 'Saco'
  imageUrl?: string;
  technicalSpecs?: Record<string, string>;
  brand?: string;
  origin?: string;
}

export interface TechnicalDocument {
  id: string;
  title: string;
  type: 'Manual' | 'Ficha Técnica' | 'Importación' | 'Certificado';
  url: string;
  relatedItemId?: string;
  uploadedAt: string;
}

export type OrderStatus = 
  | 'Cotización' 
  | 'Pendiente de Pago' 
  | 'Procesando' 
  | 'Enviado' 
  | 'Entregado' 
  | 'Cancelado';

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Proforma {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  validUntil: string;
  notes?: string;
  createdBy: string;
}

export interface DashboardStats {
  totalSales: number;
  pendingProformas: number;
  activeClients: number;
  lowStockItems: number;
  salesByMonth: { month: string; amount: number }[];
  categoryDistribution: { category: string; count: number }[];
}
