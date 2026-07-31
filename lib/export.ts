import * as XLSX from 'xlsx';
import { Expense } from './types';
import { expenseCategoryLabel } from './format';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function rowOf(e: Expense) {
  return {
    등록일시: formatDateTime(e.created_at),
    차량번호: e.vehicles?.plate_number ?? '',
    비용항목: expenseCategoryLabel(e),
    결제방법:
      e.payment_method === '카드' && e.card_company
        ? `카드(${e.card_company})`
        : e.payment_method,
    결제금액: e.amount,
    업체명: e.vendor,
    수리내용: e.description ?? '',
    등록자: e.employees?.name ?? '',
    영수증첨부: e.receipt_url ? 'O' : 'X',
  };
}

export function exportExpensesToExcel(expenses: Expense[], filename = '비용정산내역') {
  const rows = expenses.map(rowOf);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 8 },
    { wch: 12 },
    { wch: 20 },
    { wch: 28 },
    { wch: 10 },
    { wch: 10 },
  ];

  const totalRow = ['합계', '', '', '', expenses.reduce((sum, e) => sum + e.amount, 0)];
  XLSX.utils.sheet_add_aoa(worksheet, [totalRow], { origin: -1 });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '정산내역');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filename}_${today}.xlsx`);
}

export function exportExpensesByVehicle(expenses: Expense[], filename = '차량별_정산내역') {
  const grouped = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.vehicles?.plate_number ?? '미확인차량';
    const list = grouped.get(key) ?? [];
    list.push(e);
    grouped.set(key, list);
  }

  const workbook = XLSX.utils.book_new();

  const summaryRows = Array.from(grouped.entries()).map(([plate, list]) => ({
    차량번호: plate,
    건수: list.length,
    총비용: list.reduce((sum, e) => sum + e.amount, 0),
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, '요약');

  grouped.forEach((list, plate) => {
    const rows = list.map((e) => {
      const { 차량번호, ...rest } = rowOf(e);
      return rest;
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 28 }, { wch: 10 }, { wch: 10 }];
    const totalRow = ['합계', '', '', '', list.reduce((sum, e) => sum + e.amount, 0)];
    XLSX.utils.sheet_add_aoa(sheet, [totalRow], { origin: -1 });
    const safeName = plate.replace(/[\\/*?:[\]]/g, '').slice(0, 28) || '차량';
    XLSX.utils.book_append_sheet(workbook, sheet, safeName);
  });

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filename}_${today}.xlsx`);
}
