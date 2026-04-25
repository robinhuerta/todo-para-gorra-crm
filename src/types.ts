
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

// ─── IMPORTACIONES CHINA → PERÚ ──────────────────────────────────────────────

export type ImportDocType =
  | 'proforma_invoice'
  | 'purchase_order'
  | 'commercial_invoice'
  | 'packing_list'
  | 'bill_of_lading'
  | 'certificate_of_origin'
  | 'inspection_certificate'
  | 'insurance_certificate'
  | 'dua'
  | 'otro';

export interface ImportDoc {
  id: string;
  name: string;
  type: ImportDocType;
  url: string;
  uploadedAt: string;
}

export interface ImportItem {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  type: 'maquinaria' | 'repuesto';
  hsCode?: string;
  brand?: string;
  model?: string;
}

export interface ImportPhaseRecord {
  phaseIndex: number;
  status: 'pendiente' | 'en_progreso' | 'completado' | 'con_problema';
  startDate?: string;
  completedDate?: string;
  notes?: string;
  documents?: ImportDoc[];
}

export type ImportIncoterm = 'EXW' | 'FOB' | 'CIF' | 'CFR' | 'DDP';
export type ImportTransportType = 'maritimo_fcl_20' | 'maritimo_fcl_40' | 'maritimo_lcl' | 'aereo';
export type ImportSunatChannel = 'verde' | 'amarillo' | 'rojo';
export type ImportStatus = 'activo' | 'completado' | 'cancelado' | 'con_problema';

export interface ImportRecord {
  id: string;
  displayId: string;

  clientId?: string;
  clientName: string;
  clientCompany?: string;
  clientPhone?: string;
  clientEmail?: string;

  supplierName: string;
  supplierCity: string;
  supplierContact?: string;

  items: ImportItem[];

  incoterm: ImportIncoterm;
  transportType: ImportTransportType;
  freightForwarder?: string;
  customsAgent?: string;
  trackingNumber?: string;
  blNumber?: string;
  duaNumber?: string;
  sunatChannel?: ImportSunatChannel;

  fobValue: number;
  freightCost: number;
  insuranceCost: number;
  cifValue: number;
  adValoremPct: number;
  adValorem: number;
  igv: number;
  ipm: number;
  totalTributes: number;
  customsAgentFee: number;
  warehouseCost: number;
  localTransportCost: number;
  totalImportCost: number;

  estimatedDeparture?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  expectedDelivery?: string;

  currentPhaseIndex: number;
  status: ImportStatus;

  phases: ImportPhaseRecord[];
  notes?: string;

  createdAt: string;
  updatedAt: string;
}
