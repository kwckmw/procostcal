export type Unit = "g" | "ml" | "개";
export type TaxType = "general" | "simple" | "exempt";
export interface Ingredient { id: string; name: string; price: number; amount: number; unit: Unit; loss: number }
export interface MenuRow { ingredientId: string; qty: number }
export interface Menu { id: string; name: string; price: number; rows: MenuRow[] }
export interface Settings { shopName: string; taxType: TaxType; targetRate: number; dailySales: number; monthDays: number; delivery?: Partial<Delivery> }
export interface AppData { ingredients: Ingredient[]; menus: Menu[]; settings: Settings }

export const STORAGE_KEY = "cost-calc-v1";
export const TAX_LABEL: Record<TaxType, string> = {
  general: "일반과세자",
  simple: "간이과세자(납부)",
  exempt: "간이과세자(연매출 4,800만 원 미만, 납부 면제)",
};

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function sampleData(): AppData {
  const ing: Ingredient[] = [
    { id: "i1", name: "원두", price: 25000, amount: 1000, unit: "g", loss: 0 },
    { id: "i2", name: "우유", price: 2980, amount: 1000, unit: "ml", loss: 0 },
    { id: "i3", name: "컵·뚜껑·빨대 세트", price: 54, amount: 1, unit: "개", loss: 0 },
    { id: "i4", name: "배추김치", price: 35000, amount: 10000, unit: "g", loss: 0 },
    { id: "i5", name: "돼지고기 앞다리", price: 17000, amount: 1000, unit: "g", loss: 0 },
    { id: "i6", name: "두부", price: 1600, amount: 300, unit: "g", loss: 0 },
  ];
  return {
    ingredients: ing,
    menus: [
      { id: "m1", name: "아메리카노", price: 4500, rows: [{ ingredientId: "i1", qty: 18 }, { ingredientId: "i3", qty: 1 }] },
      { id: "m2", name: "카페라떼", price: 5000, rows: [{ ingredientId: "i1", qty: 18 }, { ingredientId: "i2", qty: 200 }, { ingredientId: "i3", qty: 1 }] },
      { id: "m3", name: "김치찌개", price: 9000, rows: [{ ingredientId: "i4", qty: 150 }, { ingredientId: "i5", qty: 100 }, { ingredientId: "i6", qty: 150 }] },
    ],
    settings: { shopName: "우리 가게", taxType: "general", targetRate: 30, dailySales: 50, monthDays: 25 },
  };
}

export function isValidData(d: unknown): d is AppData {
  const x = d as AppData;
  return !!x && Array.isArray(x.ingredients) && Array.isArray(x.menus) && !!x.settings && typeof x.settings.targetRate === "number";
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (isValidData(p)) return p;
    }
  } catch { /* storage blocked */ }
  return sampleData();
}

export function saveData(d: AppData): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); return true; } catch { return false; }
}

const n = (v: number) => (Number.isFinite(v) ? v : 0);

export function unitCost(i: Ingredient) {
  if (!i.amount || i.loss >= 100) return 0;
  return n(i.price / i.amount / (1 - (i.loss || 0) / 100));
}

export function salesBase(price: number, t: TaxType) {
  if (t === "general") return price / 1.1;
  if (t === "simple") return price * 0.985;
  return price;
}

export function menuCost(m: Menu, ings: Ingredient[]) {
  return m.rows.reduce((s, r) => {
    const i = ings.find((x) => x.id === r.ingredientId);
    return s + (i ? unitCost(i) * (r.qty || 0) : 0);
  }, 0);
}

export function recommendedPrice(cost: number, s: Settings) {
  let p = cost / (s.targetRate / 100);
  if (s.taxType === "general") p *= 1.1;
  else if (s.taxType === "simple") p /= 0.985;
  p = Math.round(p * 1e6) / 1e6;
  return Math.ceil(p / 100) * 100;
}

export function analyze(m: Menu, d: AppData) {
  const cost = menuCost(m, d.ingredients);
  const base = salesBase(m.price, d.settings.taxType);
  return {
    cost,
    base,
    rate: base > 0 ? (cost / base) * 100 : 0,
    profit: base - cost,
    rec: recommendedPrice(cost, d.settings),
  };
}

export const won = (v: number) => `${Math.round(n(v)).toLocaleString("ko-KR")}원`;
export const pct = (v: number) => `${n(v).toFixed(1)}%`;
export const num = (v: number, digits = 2) =>
  n(v).toLocaleString("ko-KR", { maximumFractionDigits: digits });

export interface Delivery { avgOrder: number; costRate: number; appFee: number; payFee: number; deliveryFee: number; packFee: number; cardFee: number }
export const DELIVERY_DEFAULT: Delivery = { avgOrder: 25000, costRate: 30, appFee: 6.8, payFee: 1.4, deliveryFee: 2900, packFee: 0, cardFee: 0.4 };
export function getDelivery(s: Settings): Delivery {
  return { ...DELIVERY_DEFAULT, ...(s.delivery || {}) };
}
export function deliveryCompare(s: Settings) {
  const d = getDelivery(s);
  const base = salesBase(d.avgOrder, s.taxType);
  const cost = base * (d.costRate / 100);
  const delivery = base - cost - d.avgOrder * ((d.appFee + d.payFee) / 100) - d.deliveryFee - d.packFee;
  const store = base - cost - d.avgOrder * (d.cardFee / 100);
  return { base, cost, delivery, store, diff: store - delivery };
}
