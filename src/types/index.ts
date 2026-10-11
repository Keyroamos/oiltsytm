// ─── Shared ───────────────────────────────────────────────────────────────────

export type UUID = string;

export interface BaseEntity {
  id: UUID;
  created_at: string;
  updated_at: string;
}

// ─── User & Auth ──────────────────────────────────────────────────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'DEPOT_MANAGER'
  | 'LOADING_OFFICER'
  | 'STOCK_OFFICER'
  | 'SALES_OFFICER'
  | 'ACCOUNTANT'
  | 'DRIVER'
  | 'AUDITOR'
  | 'DIRECTOR';

export interface Profile extends BaseEntity {
  user_id: UUID;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface Driver extends BaseEntity {
  name: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string;
  national_id?: string;
  status: DriverStatus;
  notes?: string;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Product extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  unit: string;
  current_price: number;
  is_active: boolean;
}

// ─── Tanks ────────────────────────────────────────────────────────────────────

export type TankStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

export interface Tank extends BaseEntity {
  name: string;
  code: string;
  product_id: UUID;
  product?: Product;
  capacity_litres: number;
  current_stock_litres: number;
  minimum_level_litres: number;
  maximum_level_litres: number;
  status: TankStatus;
  utilization_pct?: number;
}

// ─── Stock Transactions ───────────────────────────────────────────────────────

export type StockTransactionType =
  | 'RECEIVING'
  | 'DISPATCH'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT';

export interface StockTransaction {
  id: UUID;
  tank_id: UUID;
  tank?: Tank;
  product_id: UUID;
  product?: Product;
  transaction_type: StockTransactionType;
  quantity_litres: number;
  reference_type?: string;
  reference_id?: UUID;
  previous_balance: number;
  new_balance: number;
  notes?: string;
  created_by?: UUID;
  created_at: string;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export interface Supplier extends BaseEntity {
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_terms?: string;
  is_active: boolean;
}

// ─── Tankers ──────────────────────────────────────────────────────────────────

export type TankerStatus =
  | 'AVAILABLE'
  | 'LOADING'
  | 'LOADED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'MAINTENANCE'
  | 'INACTIVE';

export interface Tanker extends BaseEntity {
  registration_number: string;
  capacity_litres: number;
  number_of_compartments: number;
  driver_name?: string;
  driver_phone?: string;
  transporter?: string;
  status: TankerStatus;
  insurance_expiry?: string;
  inspection_expiry?: string;
  current_stock_litres?: number;
  // ProTrack365 GPS tracker hardware & subscription
  tracker_imei?: string;
  tracker_sim?: string;
  tracker_iccid?: string;
  tracker_model?: string;
  tracker_activated_at?: string;
  tracker_expires_at?: string;
  // Live location tracking
  current_latitude?: number;
  current_longitude?: number;
  location_updated_at?: string;
  location_address?: string;
  speed_kmh?: number;
  heading_degrees?: number;
}

export type LocationSource = 'GPS' | 'MANUAL' | 'DRIVER_APP';

export interface TankerLocation {
  id: UUID;
  tanker_id: UUID;
  latitude: number;
  longitude: number;
  address?: string;
  speed_kmh?: number;
  heading_degrees?: number;
  accuracy_m?: number;
  source: LocationSource;
  recorded_by?: UUID;
  notes?: string;
  recorded_at: string;
}

// ─── Receiving ────────────────────────────────────────────────────────────────

export type ReceivingStatus = 'PENDING' | 'RECEIVED' | 'REJECTED' | 'CANCELLED';

export type DeliveryDestinationType = 'COMPANY_DEPOT' | 'DIRECT_CLIENT';
export type VesselMarketType = 'LOCAL' | 'TRANSIT';
export type VesselCurrency = 'KES' | 'USD';

export interface ReceivingRecord {
  id: UUID;
  supplier_id: UUID;
  supplier?: Supplier;
  product_id: UUID;
  product?: Product;
  tank_id: UUID;
  tank?: Tank;
  tanker_id?: UUID;
  tanker?: Tanker;
  quantity_ordered: number;
  quantity_received?: number;
  reference_number: string;
  vessel_name?: string;
  market_type?: VesselMarketType;
  currency?: VesselCurrency;
  arrival_time?: string;
  receiving_date: string;
  driver_name?: string;
  meter_reading?: number;
  quality_status?: string;
  notes?: string;
  status: ReceivingStatus;
  destination_type?: DeliveryDestinationType;
  destination_customer_id?: UUID;
  destination_customer?: Customer;
  client_selling_price?: number;
  client_total_amount?: number;
  generated_invoice_id?: UUID;
  generated_invoice?: Invoice;
  purchase_price?: number;
  purchase_total?: number;
  port_charges?: number;
  demurrage_cost?: number;
  inspection_fees?: number;
  pumping_charges?: number;
  customs_duty?: number;
  transport_cost?: number;
  driver_allowance?: number;
  toll_fees?: number;
  loading_charges?: number;
  other_expenses?: number;
  other_expenses_note?: string;
  total_delivery_cost?: number;
  total_cost?: number;
  expected_arrival?: string;
  tanker_latitude?: number;
  tanker_longitude?: number;
  tanker_last_seen?: string;
  created_by?: UUID;
  created_at: string;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface Customer extends BaseEntity {
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  current_balance: number;
  payment_terms?: string;
  kra_pin?: string;
  is_active: boolean;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ALLOCATED'
  | 'LOADING'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Order extends BaseEntity {
  order_number: string;
  customer_id: UUID;
  customer?: Customer;
  product_id: UUID;
  product?: Product;
  quantity_litres: number;
  unit_price: number;
  total_amount: number;
  status: OrderStatus;
  requested_date: string;
  market_type?: 'LOCAL' | 'TRANSIT';
  vat_amount?: number;
  notes?: string;
  created_by?: UUID;
  approved_by?: UUID;
  approved_at?: string;
}

// ─── Dispatches ───────────────────────────────────────────────────────────────

export type DispatchStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'LOADING'
  | 'LOADED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Dispatch {
  id: UUID;
  dispatch_number: string;
  order_id: UUID;
  order?: Order;
  customer_id: UUID;
  customer?: Customer;
  product_id: UUID;
  product?: Product;
  tank_id: UUID;
  tank?: Tank;
  tanker_id: UUID;
  tanker?: Tanker;
  quantity_ordered: number;
  quantity_loaded?: number;
  loading_bay?: string;
  loading_started_at?: string;
  loading_start_time?: string;
  loading_completed_at?: string;
  loading_end_time?: string;
  dispatch_time?: string;
  delivered_at?: string;
  driver_name?: string;
  seal_number?: string;
  initial_meter_reading?: number;
  final_meter_reading?: number;
  status: DispatchStatus;
  notes?: string;
  updated_at?: string;
  created_by?: UUID;
  created_at: string;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export interface Invoice extends BaseEntity {
  invoice_number: string;
  customer_id: UUID;
  customer?: Customer;
  order_id?: UUID;
  order?: Order;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  due_date: string;
  // KRA eTIMS Fields
  etims_status?: 'PENDING' | 'TRANSMITTED' | 'VERIFIED' | 'FAILED';
  etims_cu_number?: string;
  etims_scu_id?: string;
  etims_signing_code?: string;
  etims_qr_code?: string;
  etims_transmitted_at?: string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentMethod = 'BANK' | 'CREDIT';

export interface Payment {
  id: UUID;
  customer_id: UUID;
  customer?: Customer;
  invoice_id: UUID;
  invoice?: Invoice;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  created_by?: UUID;
  created_at: string;
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: UUID;
  user_id?: UUID;
  action: string;
  entity_type: string;
  entity_id?: UUID;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  description: string;
  created_at: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalStock: number;
  todayReceived: number;
  todayDispatched: number;
  todaySales: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  activeTankers: number;
  alertCount: number;
}

export interface StockSummaryRow {
  product: string;
  productCode: string;
  openingStock: number;
  received: number;
  totalIn: number;
  dispatched: number;
  closingStock: number;
  variance: number;
  variancePct: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface MovementEvent {
  id: string;
  time: string;
  type: 'RECEIPT' | 'LOADING' | 'DISPATCH' | 'ADJUSTMENT';
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  quantity?: number;
  product?: string;
}

// ─── Financial Profitability & Analytics ──────────────────────────────────────

export interface TruckProfitSummary {
  tanker_id: UUID;
  registration_number: string;
  transporter?: string;
  driver_name?: string;
  capacity_litres: number;
  total_trips: number;
  total_volume_litres: number;
  total_revenue: number;
  total_product_cost: number;
  total_logistics_cost: number;
  total_cost: number;
  net_profit: number;
  profit_margin_pct: number;
}

export interface OrderProfitRecord {
  id: string;
  transaction_type: 'ORDER_DISPATCH' | 'DIRECT_DELIVERY';
  reference_number: string;
  date: string;
  customer_name: string;
  customer_code?: string;
  tanker_registration: string;
  tanker_id?: UUID;
  volume_litres: number;
  unit_selling_price: number;
  revenue: number;
  unit_cost: number;
  total_cost: number;
  net_profit: number;
  margin_pct: number;
  status: string;
  driver_name?: string;
}

export interface CompanyProfitSummary {
  total_revenue: number;
  total_cogs: number;
  total_logistics_expenses: number;
  total_cost: number;
  net_profit: number;
  profit_margin_pct: number;
  total_volume_litres: number;
  total_orders_count: number;
  top_performing_truck?: {
    registration_number: string;
    net_profit: number;
    total_volume_litres: number;
  };
}

// ─── Expenses System ─────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'TRUCK_MAINTENANCE'
  | 'TRUCK_FUEL'
  | 'TYRES_SPARES'
  | 'DRIVER_ALLOWANCE'
  | 'TOLLS_WEIGHBRIDGE'
  | 'PERMITS_LICENSES'
  | 'TRUCK_INSURANCE'
  | 'DEPOT_OPERATIONS'
  | 'ADMIN_OVERHEAD'
  | 'OTHER';

export type ExpenseAllocationType = 'TRUCK' | 'DEPOT_GENERAL';

export type ExpensePaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'MPESA'
  | 'PETTY_CASH'
  | 'CHEQUE';

export type ExpenseStatus = 'PAID' | 'PENDING' | 'APPROVED';

export interface Expense extends BaseEntity {
  expense_number: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  expense_date: string;
  allocation_type: ExpenseAllocationType;
  tanker_id?: UUID;
  tanker?: Tanker;
  vehicle_registration?: string;
  payee_vendor?: string;
  payment_method: ExpensePaymentMethod;
  reference_number?: string;
  status: ExpenseStatus;
  notes?: string;
  created_by?: UUID;
}

// ─── TPMS: Fuel Allocations ───────────────────────────────────────────────────

export type AllocationStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
export type QuantityUnit = 'MT' | 'M3' | 'L';

export interface FuelAllocation extends BaseEntity {
  allocation_reference: string;
  allocation_period: string; // e.g. "OCT-2026"
  supplier_id: UUID;
  supplier?: Supplier;
  product_id: UUID;
  product?: Product;
  allocated_quantity_mt?: number;
  allocated_quantity_m3?: number;
  allocated_quantity_litres: number;
  lifted_quantity_litres: number;
  remaining_quantity_litres: number;
  source_terminal?: string;
  period_start_date: string;
  period_end_date: string;
  status: AllocationStatus;
  notes?: string;
  created_by?: UUID;
  // Computed helpers
  lifted_pct?: number;
}

// ─── TPMS: Fuel Purchases (Multi-Currency, FX Rates, Product Entry Tax) ───────

export type PurchaseCurrency = 'USD' | 'KES';
export type PurchaseStatus = 'ORDERED' | 'PARTIALLY_LIFTED' | 'COMPLETED' | 'CANCELLED';
export type MarketType = 'LOCAL' | 'TRANSIT';

export interface FuelPurchase extends BaseEntity {
  purchase_number: string;
  supplier_id: UUID;
  supplier?: Supplier;
  product_id: UUID;
  product?: Product;
  allocation_id?: UUID;
  allocation?: FuelAllocation;
  market_type: MarketType;
  // Quantity (in chosen unit + always litres)
  quantity_unit: QuantityUnit;
  quantity_value: number;
  quantity_litres: number;
  quantity_mt?: number;
  // Foreign-currency pricing
  currency: PurchaseCurrency;
  unit_cost_currency: number;
  invoice_value_currency: number;
  exchange_rate: number;
  exchange_rate_date: string;
  exchange_rate_source: string;
  invoice_value_kes: number;
  // Product Entry Tax (strictly tied to this purchase/entry)
  product_entry_tax_kes: number;
  import_declaration_fee_kes: number;
  railway_development_levy_kes: number;
  petroleum_development_levy_kes: number;
  demurrage_port_charges_kes: number;
  total_landed_cost_kes: number;
  unit_landed_cost_kes_per_litre: number;
  reference_document?: string;
  purchase_date: string;
  lifted_quantity_litres: number;
  status: PurchaseStatus;
  notes?: string;
  created_by?: UUID;
  // Computed
  unlifted_quantity_litres?: number;
}

// ─── TPMS: Customer Delivery Outturns ─────────────────────────────────────────

export type OutturnStatus = 'CONFIRMED' | 'DISPUTED' | 'INVESTIGATING';

export interface CustomerOutturn extends BaseEntity {
  outturn_number: string;
  dispatch_id: UUID;
  dispatch?: Dispatch;
  customer_id: UUID;
  customer?: Customer;
  product_id: UUID;
  product?: Product;
  tanker_id?: UUID;
  tanker?: Tanker;
  loaded_quantity_litres: number;
  offloaded_quantity_litres: number;
  variance_litres: number;
  variance_pct: number;
  allowable_tolerance_pct: number;
  outturn_status: OutturnStatus;
  delivery_destination?: string;
  customer_rep_name?: string;
  driver_name?: string;
  meter_reading_before?: number;
  meter_reading_after?: number;
  outturn_date: string;
  notes?: string;
  created_by?: UUID;
  // Computed
  is_within_tolerance?: boolean;
}

// ─── TPMS: Four Quantities Summary (Core Management KPI) ──────────────────────

export interface FourQuantitiesRow {
  product_code: string;
  product_name: string;
  market_type: MarketType;
  period: string;
  // The 4 Quantities (all in Litres)
  allocated_litres: number;
  purchased_litres: number;
  received_lifted_litres: number;
  sold_dispatched_litres: number;
  // Variances
  allocation_vs_purchase_variance: number;
  purchase_vs_lifting_variance: number;
  lifting_vs_sale_variance: number;
  // Outturn Transit Losses
  total_outturn_variance_litres: number;
}

export interface FourQuantitiesSummary {
  period: string;
  rows: FourQuantitiesRow[];
  generated_at: string;
}

// ─── TPMS: EPRA Monthly Report ────────────────────────────────────────────────

export interface EpraProductLine {
  product: string;
  market_type: MarketType;
  opening_stock_litres: number;
  received_litres: number;
  total_available_litres: number;
  sold_dispatched_litres: number;
  closing_stock_litres: number;
  variance_litres: number;
}

export interface EpraMonthlyReport {
  company_name: string;
  epra_license: string;
  period: string;
  generated_at: string;
  lines: EpraProductLine[];
}
