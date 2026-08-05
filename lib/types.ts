export type ExpenseCategory =
  | '차량정비'
  | '주유'
  | '부품'
  | '실내정비'
  | '탁송료'
  | '검사료'
  | '배터리'
  | '도색'
  | '타이어'
  | '세차'
  | '이전비'
  | '기타';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  '차량정비',
  '주유',
  '부품',
  '실내정비',
  '탁송료',
  '검사료',
  '배터리',
  '도색',
  '타이어',
  '세차',
  '이전비',
  '기타',
];

export type PaymentMethod = '카드' | '현금' | '이체' | '미결제';
export const PAYMENT_METHODS: PaymentMethod[] = ['카드', '현금', '이체', '미결제'];

export type CardCompany = '하나' | '농협' | '기업';
export const CARD_COMPANIES: CardCompany[] = ['하나', '농협', '기업'];

export const CATEGORY_COLORS: Record<string, string> = {
  '차량정비': 'bg-brand-100 text-brand-700',
  '주유': 'bg-amber-100 text-amber-700',
  '부품': 'bg-indigo-100 text-indigo-700',
  '실내정비': 'bg-violet-100 text-violet-700',
  '탁송료': 'bg-fuchsia-100 text-fuchsia-700',
  '검사료': 'bg-rose-100 text-rose-700',
  '배터리': 'bg-lime-100 text-lime-700',
  '도색': 'bg-cyan-100 text-cyan-700',
  '타이어': 'bg-slate-200 text-slate-700',
  '세차': 'bg-teal-100 text-teal-700',
  '이전비': 'bg-sky-100 text-sky-700',
  '기타': 'bg-ink-100 text-ink-600',
};

export interface Vendor {
  id: string;
  name: string;
  created_at: string;
}

export type EmployeeRole = 'staff' | 'admin' | 'ceo';

export const EMPLOYEE_ROLE_LABEL: Record<EmployeeRole, string> = {
  staff: '직원',
  admin: '관리자',
  ceo: '대표이사',
};

export interface Employee {
  id: string;
  name: string;
  phone: string | null;
  role: EmployeeRole;
  active: boolean;
  created_at: string;
}

export type VehicleStatus = 'in_stock' | 'contracted' | 'sold';

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  in_stock: '판매중',
  contracted: '계약완료',
  sold: '판매완료',
};

export type RegistrationType = 'business' | 'private';

export const REGISTRATION_TYPE_LABEL: Record<RegistrationType, string> = {
  business: '영업용',
  private: '자가용',
};

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string | null;
  options: string | null;
  registration_type: RegistrationType;
  inbound_date: string | null;
  transfer_date: string | null;
  status: VehicleStatus;
  purchase_price: number | null; // 매입가
  purchase_amount: number | null; // 매입계산서
  ad_amount: number | null; // 광고가
  dealer_deposit_amount: number | null; // 딜러입금가
  contract_deposit_amount: number | null; // 계약금
  stock_finance: boolean;
  hyundai_commercial_amount: number | null;
  sale_price: number | null; // 최종 판매금액
  tax_invoice_amount: number | null; // 매출계산서
  purchased_by: string | null;
  sold_by: string | null;
  sold_at: string | null;
  managed_by: string | null;
  sales_memo_1: string | null;
  sales_memo_2: string | null;
  extra_commission_1: number | null;
  extra_commission_2: number | null;
  performance_check_confirmed: boolean;
  performance_check_confirmed_by: string | null;
  performance_check_confirmed_at: string | null;
  created_at: string;
}

export type VehicleFileType = 'photo' | 'registration' | 'repair_report' | 'performance_check';

export const VEHICLE_FILE_LABEL: Record<VehicleFileType, string> = {
  photo: '차량 사진',
  registration: '차량등록증',
  repair_report: '수리내역서',
  performance_check: '성능점검기록부',
};

export interface VehicleFile {
  id: string;
  vehicle_id: string;
  file_type: VehicleFileType;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  category: ExpenseCategory;
  category_note: string | null;
  payment_method: PaymentMethod;
  card_company: CardCompany | null;
  amount: number;
  vendor: string;
  description: string | null;
  receipt_url: string | null;
  employee_id: string | null;
  created_at: string;
  // 조인 조회 시 편의 필드
  vehicles?: { plate_number: string } | null;
  employees?: { name: string } | null;
}

export interface VehicleAd {
  id: string;
  vehicle_id: string;
  platform: string;
  advertiser_name: string | null;
  ad_amount: number | null;
  posted_at: string | null;
  active: boolean;
  created_at: string;
}

export interface CorporateExpense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  source: string | null;
  created_at: string;
}

export interface SettlementItem {
  id: string;
  vehicle_id: string;
  label: string;
  amount: number;
  sort_order: number;
  created_at: string;
}

export interface SalesCommission {
  id: string;
  vehicle_id: string;
  employee_id: string;
  amount: number;
  created_at: string;
}

export interface MonthlyMemo {
  month: string;
  memo: string | null;
  extra_seller_1_name: string | null;
  extra_seller_2_name: string | null;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  vehicle_id: string | null;
  message: string;
  created_at: string;
}

export interface ExpenseFilters {
  vehicleId?: string;
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
}
