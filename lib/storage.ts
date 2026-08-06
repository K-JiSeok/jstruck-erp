import { supabase } from './supabaseClient';
import { computeAgencyFee, computeTaxAmount, FIXED_INTERIOR_CLEANING_AMOUNT } from './format';
import {
  CardCompany,
  Employee,
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  PaymentMethod,
  SalesCommission,
  SettlementItem,
  Vehicle,
  VehicleAd,
  VehicleFile,
  VehicleFileType,
  VehicleStatus,
  Vendor,
} from './types';

// ================= Employees =================

export async function listEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, phone, role, active, created_at')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Employee[];
}

export async function addEmployee(input: {
  name: string;
  phone?: string;
  pin: string;
  role?: 'staff' | 'admin' | 'ceo';
}): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      name: input.name,
      phone: input.phone ?? null,
      pin: input.pin,
      role: input.role ?? 'staff',
    })
    .select('id, name, phone, role, active, created_at')
    .single();
  if (error) throw error;
  return data as Employee;
}

export async function verifyLogin(name: string, pin: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, phone, role, active, created_at')
    .eq('name', name)
    .eq('pin', pin)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return (data as Employee) ?? null;
}

export async function deactivateEmployee(id: string) {
  const { error } = await supabase.from('employees').update({ active: false }).eq('id', id);
  if (error) throw error;
}

// ================= Vehicles =================

export async function listVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Vehicle[];
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Vehicle | null;
}

export async function addVehicle(input: {
  plate_number: string;
  vehicle_type?: string;
  registration_type: 'business' | 'private';
  inbound_date?: string;
  transfer_date?: string;
  purchased_by?: string;
}): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      plate_number: input.plate_number,
      vehicle_type: input.vehicle_type ?? null,
      registration_type: input.registration_type,
      inbound_date: input.inbound_date ?? null,
      transfer_date: input.transfer_date ?? null,
      purchased_by: input.purchased_by ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Vehicle;
}

// 영업용 -> 자가용 전환: 번호판 변경 + 이전일 기록
export async function convertToPrivate(id: string, newPlateNumber: string, transferDate: string) {
  return updateVehicle(id, {
    plate_number: newPlateNumber,
    registration_type: 'private',
    transfer_date: transferDate,
  });
}

export async function updateVehicle(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Vehicle;
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
}

export async function setVehicleStatus(id: string, status: VehicleStatus) {
  return updateVehicle(id, { status });
}

// 계약완료로 변경 (계약금 입력)
export async function markVehicleContracted(id: string, depositAmount: number | null) {
  return updateVehicle(id, {
    status: 'contracted',
    contract_deposit_amount: depositAmount,
  });
}

// 계약취소 -> 재고 상태로 복귀 (성능점검 확인 상태도 이전 단계로 초기화)
export async function cancelContract(id: string) {
  return updateVehicle(id, {
    status: 'in_stock',
    contract_deposit_amount: null,
    performance_check_confirmed: false,
    performance_check_confirmed_by: null,
    performance_check_confirmed_at: null,
  });
}

// 판매완료 처리: 성능점검기록부 최종 확인이 되어있어야만 허용
export async function markVehicleSold(
  id: string,
  soldByEmployeeId: string,
  salePrice: number | null,
  taxInvoiceAmount: number | null,
  saleDate?: string // 'YYYY-MM-DD' - 실제 판매 날짜 (없으면 오늘)
) {
  const vehicle = await getVehicle(id);
  if (!vehicle) throw new Error('차량을 찾을 수 없습니다.');
  if (!vehicle.performance_check_confirmed) {
    throw new Error('판매완료 처리 전, 성능점검기록부를 먼저 최종 확인해주세요.');
  }
  return updateVehicle(id, {
    status: 'sold',
    sold_by: soldByEmployeeId,
    sale_price: salePrice,
    tax_invoice_amount: taxInvoiceAmount,
    sold_at: saleDate ? new Date(`${saleDate}T12:00:00`).toISOString() : new Date().toISOString(),
  });
}

// 판매취소 -> 다시 재고(판매 가능) 상태로 되돌리기 (성능점검 확인 상태도 이전 단계로 초기화)
export async function cancelSale(id: string) {
  return updateVehicle(id, {
    status: 'in_stock',
    sold_by: null,
    sale_price: null,
    tax_invoice_amount: null,
    contract_deposit_amount: null,
    sold_at: null,
    performance_check_confirmed: false,
    performance_check_confirmed_by: null,
    performance_check_confirmed_at: null,
  });
}

export async function listSoldVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'sold')
    .order('sold_at', { ascending: false });
  if (error) throw error;
  return data as Vehicle[];
}

export async function listVehiclesSoldBy(employeeId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('sold_by', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Vehicle[];
}

export async function listVehiclesPurchasedBy(employeeId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('purchased_by', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Vehicle[];
}

export async function confirmPerformanceCheck(id: string, employeeId: string) {
  return updateVehicle(id, {
    performance_check_confirmed: true,
    performance_check_confirmed_by: employeeId,
    performance_check_confirmed_at: new Date().toISOString(),
  });
}

// ================= Expenses =================

export async function listExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select('*, vehicles(plate_number), employees(name)')
    .order('created_at', { ascending: false });

  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.startDate) query = query.gte('created_at', `${filters.startDate}T00:00:00`);
  if (filters.endDate) query = query.lte('created_at', `${filters.endDate}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Expense[];
}

export async function addExpense(input: {
  vehicle_id: string;
  category: ExpenseCategory;
  category_note?: string;
  payment_method: PaymentMethod;
  card_company?: CardCompany;
  amount: number;
  vendor: string;
  description?: string;
  receipt_url?: string;
  employee_id: string;
}): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      vehicle_id: input.vehicle_id,
      category: input.category,
      category_note: input.category_note ?? null,
      payment_method: input.payment_method,
      card_company: input.card_company ?? null,
      amount: input.amount,
      vendor: input.vendor,
      description: input.description ?? null,
      receipt_url: input.receipt_url ?? null,
      employee_id: input.employee_id,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Expense;
}

export async function updateExpense(id: string, patch: Partial<Expense>): Promise<Expense> {
  // 조인 편의 필드(vehicles, employees)는 저장 대상이 아니므로 제외
  const { vehicles, employees, id: _id, created_at, ...safePatch } = patch as any;
  const { data, error } = await supabase
    .from('expenses')
    .update(safePatch)
    .eq('id', id)
    .select('*, vehicles(plate_number), employees(name)')
    .single();
  if (error) throw error;
  return data as unknown as Expense;
}

export async function listExpensesByEmployee(employeeId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, vehicles(plate_number), employees(name)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as Expense[];
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ================= Vehicle Files (사진/등록증/수리내역서/성능점검기록부) =================

const FILE_TYPE_BUCKET: Record<VehicleFileType, string> = {
  photo: 'vehicle-photos',
  registration: 'vehicle-docs',
  repair_report: 'vehicle-docs',
  performance_check: 'vehicle-docs',
};

export async function uploadVehicleFile(
  vehicleId: string,
  fileType: VehicleFileType,
  file: File,
  uploadedBy?: string
): Promise<VehicleFile> {
  const bucket = FILE_TYPE_BUCKET[fileType];
  const ext = file.name.split('.').pop() || 'dat';
  const path = `${vehicleId}/${fileType}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);

  const { data, error } = await supabase
    .from('vehicle_files')
    .insert({
      vehicle_id: vehicleId,
      file_type: fileType,
      file_url: publicUrlData.publicUrl,
      uploaded_by: uploadedBy ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as VehicleFile;
}

export async function uploadReceiptImage(vehicleId: string, dataUrl: string): Promise<string> {
  const bucket = 'receipts';
  const path = `${vehicleId}/${Date.now()}.jpg`;
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function listVehicleFiles(vehicleId: string): Promise<VehicleFile[]> {
  const { data, error } = await supabase
    .from('vehicle_files')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as VehicleFile[];
}

export async function deleteVehicleFile(id: string) {
  const { error } = await supabase.from('vehicle_files').delete().eq('id', id);
  if (error) throw error;
}

// ================= Vehicle Ads (광고 관리) =================

export async function listVehicleAds(vehicleId: string): Promise<VehicleAd[]> {
  const { data, error } = await supabase
    .from('vehicle_ads')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as VehicleAd[];
}

export async function addVehicleAd(input: {
  vehicle_id: string;
  platform: string;
  advertiser_name?: string;
  ad_amount?: number;
  posted_at?: string;
}): Promise<VehicleAd> {
  const { data, error } = await supabase
    .from('vehicle_ads')
    .insert({
      vehicle_id: input.vehicle_id,
      platform: input.platform,
      advertiser_name: input.advertiser_name ?? null,
      ad_amount: input.ad_amount ?? null,
      posted_at: input.posted_at ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as VehicleAd;
}

export async function deleteVehicleAd(id: string) {
  const { error } = await supabase.from('vehicle_ads').delete().eq('id', id);
  if (error) throw error;
}

// ================= Notifications (계약완료 알림) =================

export async function addNotification(message: string, vehicleId?: string) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ message, vehicle_id: vehicleId ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listNotifications(limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ================= Settlement Items (정산 시트 - 통합 지출 항목) =================

// 정산페이지 전용 항목 (등록 화면 12개 항목과는 겹치지 않는, 사무실에서 직접 입력하는 항목)
// 상사비/세금/실내크리닝/성능비는 자동계산되는 고정 항목이라 이 목록에서 제외한다 (settlement 페이지에서 별도 처리).
export const DEFAULT_SETTLEMENT_LABELS = [
  '낙찰수수료',
  '매입대행비',
  '시트작업비',
  '부가세차액',
  '특장',
  '조선모터스',
  '비앤에스',
  '구조변경',
  '운송료',
  '장착/탈착비',
  '소개비',
  '설정해지료',
  '보험료',
  '광천상사',
];

// 자동으로 초기값이 계산되는 항목 (이후에는 다른 항목처럼 자유롭게 수정 가능)
const FIXED_DEFAULT_LABELS = ['상사비', '세금', '실내크리닝', '성능비'];

function computeFixedDefault(label: string, vehicle: Vehicle): number {
  if (label === '상사비') return computeAgencyFee(vehicle.sale_price);
  if (label === '세금') return computeTaxAmount(vehicle.purchase_amount, vehicle.tax_invoice_amount);
  if (label === '실내크리닝') return FIXED_INTERIOR_CLEANING_AMOUNT;
  if (label === '성능비') return 30_000;
  return 0;
}

// 표에 항상 보여줄 기본 틀 - 지정된 순서대로 명시적으로 배치한다.
const SETTLEMENT_TEMPLATE_LABELS = [
  '상사비',
  '세금',
  '실내크리닝',
  '세차',
  '성능비',
  '이전비',
  '차량정비',
  '타이어',
  '도색',
  '조선모터스',
  '비앤에스',
  '광천상사',
  '주유',
  '부품',
  '실내정비',
  '탁송료',
  '검사료',
  '배터리',
  '낙찰수수료',
  '매입대행비',
  '시트작업비',
  '부가세차액',
  '특장',
  '구조변경',
  '운송료',
  '장착/탈착비',
  '소개비',
  '설정해지료',
  '보험료',
];

export async function listSettlementItems(vehicleId: string): Promise<SettlementItem[]> {
  const { data, error } = await supabase
    .from('vehicle_settlement_items')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as SettlementItem[];
}

// 등록된 비용(특히 '기타'로 등록된 항목은 업체명/내용을 항목명으로 사용)에서
// 라벨별 합계를 계산한다. 기존 표에 없는 라벨만 새로 추가하기 위한 비교 대상.
function computeExpenseDrivenLabels(expenses: Expense[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const label =
      e.category === '기타' ? (e.category_note?.trim() || e.vendor?.trim() || '기타') : e.category;
    map.set(label, (map.get(label) ?? 0) + e.amount);
  }
  return map;
}

// 정산표를 실제 데이터 기준으로 동기화한다.
// - 처음 여는 차량이면: 기본 엑셀 항목(공란, 단 상사비/세금/실내크리닝은 자동계산 초기값) +
//   등록된 비용에서 뽑아낸 항목(금액 채움)을 한번에 생성. 이후에는 다른 항목과 똑같이 자유 수정 가능.
// - 이미 항목이 있으면: 새로 등록된 비용 중 아직 표에 없는 라벨만 추가 (기존 값은 건드리지 않음)
export async function syncSettlementItems(
  vehicleId: string,
  expenses: Expense[],
  vehicle: Vehicle
): Promise<SettlementItem[]> {
  const existing = await listSettlementItems(vehicleId);
  const expenseLabels = computeExpenseDrivenLabels(expenses);

  if (existing.length === 0) {
    const rows: { vehicle_id: string; label: string; amount: number; sort_order: number }[] = [];
    let order = 0;
    for (const label of SETTLEMENT_TEMPLATE_LABELS) {
      const amount = FIXED_DEFAULT_LABELS.includes(label)
        ? computeFixedDefault(label, vehicle)
        : expenseLabels.get(label) ?? 0;
      rows.push({
        vehicle_id: vehicleId,
        label,
        amount,
        sort_order: order++,
      });
    }
    // 기본 목록에 없는(등록된 비용에만 있는) 라벨도 추가
    for (const [label, amount] of expenseLabels.entries()) {
      if (!SETTLEMENT_TEMPLATE_LABELS.includes(label)) {
        rows.push({ vehicle_id: vehicleId, label, amount, sort_order: order++ });
      }
    }
    const { error } = await supabase.from('vehicle_settlement_items').insert(rows);
    if (error) throw error;
    return listSettlementItems(vehicleId);
  }

  const existingLabels = new Set(existing.map((i) => i.label));
  const missing = Array.from(expenseLabels.entries()).filter(([label]) => !existingLabels.has(label));

  // 상사비/세금/실내크리닝이 아직 없다면(예: 삭제 후 재계산이 필요한 경우) 자동계산 초기값으로 추가
  const missingFixed = FIXED_DEFAULT_LABELS.filter((label) => !existingLabels.has(label));

  if (missing.length > 0 || missingFixed.length > 0) {
    let order = existing.length > 0 ? Math.max(...existing.map((i) => i.sort_order)) + 1 : 0;
    // 상사비/세금/실내크리닝은 나중에 추가되더라도 맨 앞에 오도록 음수 순서를 준다
    let fixedOrder = -missingFixed.length;
    const rows = [
      ...missingFixed.map((label) => ({
        vehicle_id: vehicleId,
        label,
        amount: computeFixedDefault(label, vehicle),
        sort_order: fixedOrder++,
      })),
      ...missing.map(([label, amount]) => ({
        vehicle_id: vehicleId,
        label,
        amount,
        sort_order: order++,
      })),
    ];
    const { error } = await supabase.from('vehicle_settlement_items').insert(rows);
    if (error) throw error;
    return listSettlementItems(vehicleId);
  }

  return existing;
}

export async function addSettlementItem(
  vehicleId: string,
  label: string,
  sortOrder: number
): Promise<SettlementItem> {
  const { data, error } = await supabase
    .from('vehicle_settlement_items')
    .insert({ vehicle_id: vehicleId, label, amount: 0, sort_order: sortOrder })
    .select('*')
    .single();
  if (error) throw error;
  return data as SettlementItem;
}

export async function updateSettlementItem(
  id: string,
  patch: Partial<Pick<SettlementItem, 'label' | 'amount'>>
): Promise<SettlementItem> {
  const { data, error } = await supabase
    .from('vehicle_settlement_items')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as SettlementItem;
}

export async function deleteSettlementItem(id: string) {
  const { error } = await supabase.from('vehicle_settlement_items').delete().eq('id', id);
  if (error) throw error;
}

// ================= 월정산 (판매 차량 리스트 + 직원별 판매수당) =================

// 여러 차량의 지출합계를 한번에 조회 (월정산 리스트용, 개별 정산페이지를 열지 않아도 됨)
export async function listSettlementTotals(vehicleIds: string[]): Promise<Map<string, number>> {
  if (vehicleIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('vehicle_settlement_items')
    .select('vehicle_id, amount')
    .in('vehicle_id', vehicleIds);
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data as { vehicle_id: string; amount: number }[]) {
    map.set(row.vehicle_id, (map.get(row.vehicle_id) ?? 0) + row.amount);
  }
  return map;
}

export async function listSalesCommissions(vehicleIds: string[]): Promise<SalesCommission[]> {
  if (vehicleIds.length === 0) return [];
  const { data, error } = await supabase
    .from('vehicle_sales_commissions')
    .select('*')
    .in('vehicle_id', vehicleIds);
  if (error) throw error;
  return data as SalesCommission[];
}

export async function upsertSalesCommission(
  vehicleId: string,
  employeeId: string,
  amount: number
): Promise<SalesCommission> {
  const { data, error } = await supabase
    .from('vehicle_sales_commissions')
    .upsert(
      { vehicle_id: vehicleId, employee_id: employeeId, amount },
      { onConflict: 'vehicle_id,employee_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as SalesCommission;
}

export async function getMonthlyMemo(month: string): Promise<string> {
  const { data, error } = await supabase
    .from('monthly_settlement_memos')
    .select('memo')
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;
  return data?.memo ?? '';
}

export async function getMonthlySettlementConfig(
  month: string
): Promise<{ memo: string; extraSeller1Name: string; extraSeller2Name: string }> {
  const { data, error } = await supabase
    .from('monthly_settlement_memos')
    .select('memo, extra_seller_1_name, extra_seller_2_name')
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;
  return {
    memo: data?.memo ?? '',
    extraSeller1Name: data?.extra_seller_1_name ?? '',
    extraSeller2Name: data?.extra_seller_2_name ?? '',
  };
}

export async function saveMonthlyMemo(month: string, memo: string): Promise<void> {
  const { error } = await supabase
    .from('monthly_settlement_memos')
    .upsert({ month, memo, updated_at: new Date().toISOString() }, { onConflict: 'month' });
  if (error) throw error;
}

export async function saveMonthlyExtraSellerName(
  month: string,
  slot: 1 | 2,
  name: string
): Promise<void> {
  const field = slot === 1 ? 'extra_seller_1_name' : 'extra_seller_2_name';
  const { error } = await supabase
    .from('monthly_settlement_memos')
    .upsert({ month, [field]: name, updated_at: new Date().toISOString() }, { onConflict: 'month' });
  if (error) throw error;
}

// ================= Vendors (자주 쓰는 업체 등록) =================

export async function listVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Vendor[];
}

export async function addVendor(name: string): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .insert({ name })
    .select('*')
    .single();
  if (error) throw error;
  return data as Vendor;
}

export async function deleteVendor(id: string) {
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw error;
}

// ================= Realtime =================

// 관리자 대시보드에서 expenses/vehicles/notifications 변경을 실시간으로 반영하기 위한 구독
export function subscribeRealtime(onChange: () => void) {
  const channel = supabase
    .channel('admin-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
