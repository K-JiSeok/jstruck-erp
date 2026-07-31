// 원 단위 그대로 콤마 포맷 (예: 5,000,000원)
export function formatWon(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return `${amount.toLocaleString('ko-KR')}원`;
}

// 억/만원 단위 표기 (예: 150,000,000 -> "1억 5,000만원")
// amount는 항상 "원" 단위로 저장되어 있다고 가정 (만원 단위 입력값 * 10000)
export function formatEokMan(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || amount === 0) return '-';
  const eok = Math.floor(amount / 100_000_000);
  const remainder = amount % 100_000_000;
  const man = Math.floor(remainder / 10_000);
  const won = remainder % 10_000;

  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`);
  if (won > 0) parts.push(`${won.toLocaleString('ko-KR')}`);
  if (parts.length === 0) return '0원';
  return parts.join(' ') + '원';
}

// 만원 단위 입력값(예: 15000) -> 원 단위로 변환하여 저장
export function manToWon(manInput: string): number | null {
  const digits = manInput.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return Number(digits) * 10_000;
}

// 원 단위 -> 만원 단위 입력값으로 되돌리기 (수정 시 인풋에 다시 채우기 위함)
export function wonToManInput(won: number | null | undefined): string {
  if (won === null || won === undefined) return '';
  return String(Math.round(won / 10_000));
}

// 비용 항목 표시 라벨: '기타'를 선택하고 내용을 입력한 경우 "기타(내용)" 대신 입력한 내용만 보여준다.
export function expenseCategoryLabel(e: { category: string; category_note?: string | null }): string {
  if (e.category === '기타' && e.category_note) return e.category_note;
  return e.category;
}

// 영업용(사업용) 번호판은 '아', '바', '사', '자' 글자만 사용한다 (한국 자동차 등록 규정).
// 예: 대전88아2345, 서울98바1234 -> 영업용 / 84라1234 -> 자가용
const BUSINESS_PLATE_CHARS = ['아', '바', '사', '자'];

export function isBusinessPlateNumber(plateNumber: string): boolean {
  const normalized = plateNumber.replace(/\s/g, '');
  const match = normalized.match(/([가-힣])\d{4}$/);
  if (!match) return false;
  return BUSINESS_PLATE_CHARS.includes(match[1]);
}

// 차량 목록/상세에 표시할 대표 날짜: 차량번호가 영업용 패턴이고 아직 이전 안 된 차량은 입고일,
// 그 외(이전 완료됐거나 애초에 자가용 번호)는 이전일을 보여준다.
export function vehicleDisplayDate(v: {
  plate_number: string;
  inbound_date: string | null;
  transfer_date: string | null;
}): { label: string; value: string | null } {
  if (isBusinessPlateNumber(v.plate_number) && !v.transfer_date) {
    return { label: '입고일', value: v.inbound_date };
  }
  return { label: '이전일', value: v.transfer_date };
}

// 정렬/기준일로 쓸 단일 날짜값 (이전일 우선, 없으면 입고일)
export function vehicleSortDate(v: { inbound_date: string | null; transfer_date: string | null }): string {
  return v.transfer_date ?? v.inbound_date ?? '';
}
