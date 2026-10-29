import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  analyze, loadData, saveData, sampleData, isValidData, newId, unitCost, salesBase, menuCost,
  won, pct, num, TAX_LABEL,
  type AppData, type Ingredient, type Menu, type Unit, type TaxType,
} from "@/lib/calc";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "메뉴 원가 계산기 · 사장님용" },
      { name: "description", content: "카페·음식점 사장님을 위한 메뉴 원가율, 남는 돈, 권장 판매가 계산기" },
      { property: "og:title", content: "메뉴 원가 계산기 · 사장님용" },
      { property: "og:description", content: "휴대폰으로 메뉴 원가율과 권장 판매가를 바로 계산하세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Tab = "ing" | "menu" | "sim" | "set";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "ing", label: "재료", icon: "🥬" },
  { id: "menu", label: "메뉴", icon: "🍽️" },
  { id: "sim", label: "시뮬레이션", icon: "📊" },
  { id: "set", label: "설정", icon: "⚙️" },
];

function App() {
  const [data, setData] = useState<AppData>(() => sampleData());
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("menu");
  useEffect(() => { setData(loadData()); setReady(true); }, []);
  useEffect(() => { if (ready) saveData(data); }, [data, ready]);

  return (
    <div className="mx-auto min-h-screen max-w-xl pb-28">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="text-xl font-bold">{data.settings.shopName || "우리 가게"} 원가 계산기</h1>
        <div className="mt-2 rounded-lg bg-notice px-3 py-2 text-sm leading-snug">
          모든 기본값과 수수료는 예시입니다. 우리 가게 값과 내 계약 조건으로 바꾸세요.
          <span className="mt-0.5 block text-xs text-muted-foreground">이 기기 브라우저에 자동 저장됨</span>
        </div>
      </header>
      <main className="space-y-4 px-4 pt-4">
        {tab === "ing" && <IngredientsTab data={data} setData={setData} />}
        {tab === "menu" && <MenusTab data={data} setData={setData} />}
        {tab === "sim" && <SimTab data={data} />}
        {tab === "set" && <SettingsTab data={data} setData={setData} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-medium ${tab === t.id ? "text-primary" : "text-muted-foreground"}`}>
              <span className="text-xl" aria-hidden>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

type SetData = React.Dispatch<React.SetStateAction<AppData>>;

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border bg-card p-4 shadow-sm ${className}`}>{children}</section>;
}
function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-sm text-muted-foreground">{children}</span>;
}
function NumInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string | undefined }) {
  const [text, setText] = useState(String(value ?? ""));
  useEffect(() => { if (Number(text.replace(/,/g, "")) !== value) setText(String(value ?? "")); }, [value]); // eslint-disable-line
  return (
    <div className="relative">
      <input inputMode="decimal" className="field pr-10" value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.,]/g, "");
          setText(t);
          const v = parseFloat(t.replace(/,/g, ""));
          onChange(Number.isFinite(v) ? v : 0);
        }} />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{suffix}</span>}
    </div>
  );
}
function Btn({ children, onClick, variant = "primary", className = "" }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger"; className?: string }) {
  const v = variant === "primary" ? "bg-primary text-primary-foreground" : variant === "danger" ? "border border-destructive text-destructive" : "bg-secondary text-foreground";
  return <button onClick={onClick} className={`min-h-11 rounded-xl px-4 font-semibold ${v} ${className}`}>{children}</button>;
}
function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "good" | undefined }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xl font-bold tabular-nums ${tone === "bad" ? "text-destructive" : tone === "good" ? "text-good" : ""}`}>{value}</div>
    </div>
  );
}

/* ---------- 재료 ---------- */
function IngredientsTab({ data, setData }: { data: AppData; setData: SetData }) {
  const update = (id: string, patch: Partial<Ingredient>) =>
    setData((d) => ({ ...d, ingredients: d.ingredients.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const remove = (id: string) => {
    const used = data.menus.filter((m) => m.rows.some((r) => r.ingredientId === id)).map((m) => m.name);
    if (!confirm(used.length ? `이 재료는 ${used.join(", ")}에 쓰이고 있어요. 삭제할까요?` : "이 재료를 삭제할까요?")) return;
    setData((d) => ({
      ...d,
      ingredients: d.ingredients.filter((i) => i.id !== id),
      menus: d.menus.map((m) => ({ ...m, rows: m.rows.filter((r) => r.ingredientId !== id) })),
    }));
  };
  const add = () => setData((d) => ({ ...d, ingredients: [...d.ingredients, { id: newId(), name: "새 재료", price: 0, amount: 1, unit: "g", loss: 0 }] }));
  return (
    <>
      <h2 className="text-lg font-bold">재료 {data.ingredients.length}개</h2>
      {data.ingredients.map((i) => (
        <Card key={i.id}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">단위당 단가</span>
            <span className="text-2xl font-bold text-primary tabular-nums">{num(unitCost(i))}원/{i.unit}</span>
          </div>
          <div className="mt-3 space-y-3">
            <label className="block"><Label>재료명</Label>
              <input className="field" value={i.name} onChange={(e) => update(i.id, { name: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><Label>구매 가격 (실제 낸 금액)</Label><NumInput value={i.price} suffix="원" onChange={(v) => update(i.id, { price: v })} /></label>
              <label className="block"><Label>손실률 (선택)</Label><NumInput value={i.loss} suffix="%" onChange={(v) => update(i.id, { loss: Math.min(v, 99) })} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><Label>구매 용량</Label><NumInput value={i.amount} onChange={(v) => update(i.id, { amount: v })} /></label>
              <div><Label>단위</Label>
                <div className="grid grid-cols-3 gap-1">
                  {(["g", "ml", "개"] as Unit[]).map((u) => (
                    <button key={u} onClick={() => update(i.id, { unit: u })}
                      className={`min-h-12 rounded-lg border font-semibold ${i.unit === u ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{u}</button>
                  ))}
                </div>
              </div>
            </div>
            <Btn variant="danger" className="w-full" onClick={() => remove(i.id)}>삭제</Btn>
          </div>
        </Card>
      ))}
      <Btn className="w-full min-h-14 text-lg" onClick={add}>+ 재료 추가</Btn>
    </>
  );
}

/* ---------- 메뉴 ---------- */
function MenusTab({ data, setData }: { data: AppData; setData: SetData }) {
  const update = (id: string, f: (m: Menu) => Menu) => setData((d) => ({ ...d, menus: d.menus.map((m) => (m.id === id ? f(m) : m)) }));
  const add = () => setData((d) => ({ ...d, menus: [...d.menus, { id: newId(), name: "새 메뉴", price: 0, rows: [] }] }));
  const remove = (id: string) => { if (confirm("이 메뉴를 삭제할까요?")) setData((d) => ({ ...d, menus: d.menus.filter((m) => m.id !== id) })); };
  return (
    <>
      <h2 className="text-lg font-bold">메뉴 {data.menus.length}개</h2>
      {data.menus.map((m) => (
        <div key={m.id} className="space-y-2">
          <Card>
            <div className="grid grid-cols-[1fr_8.5rem] gap-3">
              <label className="block"><Label>메뉴명</Label><input className="field" value={m.name} onChange={(e) => update(m.id, (x) => ({ ...x, name: e.target.value }))} /></label>
              <label className="block"><Label>판매가 (부가세 포함)</Label><NumInput value={m.price} suffix="원" onChange={(v) => update(m.id, (x) => ({ ...x, price: v }))} /></label>
            </div>
            <div className="mt-4 space-y-2">
              <Label>재료와 사용량</Label>
              {m.rows.map((r, idx) => {
                const ing = data.ingredients.find((i) => i.id === r.ingredientId);
                return (
                  <div key={idx} className="grid grid-cols-[1fr_6.5rem_2.75rem] items-center gap-2">
                    <select className="field min-w-0 px-2" value={r.ingredientId}
                      onChange={(e) => update(m.id, (x) => ({ ...x, rows: x.rows.map((rr, j) => (j === idx ? { ...rr, ingredientId: e.target.value } : rr)) }))}>
                      {!ing && <option value="">재료 선택</option>}
                      {data.ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <NumInput value={r.qty} suffix={ing?.unit} onChange={(v) => update(m.id, (x) => ({ ...x, rows: x.rows.map((rr, j) => (j === idx ? { ...rr, qty: v } : rr)) }))} />
                    <button aria-label="재료 행 삭제" className="min-h-11 rounded-lg bg-secondary text-lg"
                      onClick={() => update(m.id, (x) => ({ ...x, rows: x.rows.filter((_, j) => j !== idx) }))}>✕</button>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <Btn variant="ghost" className="flex-1" onClick={() => update(m.id, (x) => ({ ...x, rows: [...x.rows, { ingredientId: data.ingredients[0]?.id ?? "", qty: 0 }] }))}>+ 재료 행 추가</Btn>
                <Btn variant="danger" onClick={() => remove(m.id)}>메뉴 삭제</Btn>
              </div>
            </div>
          </Card>
          <MenuResult m={m} data={data} />
        </div>
      ))}
      <Btn className="w-full min-h-14 text-lg" onClick={add}>+ 메뉴 추가</Btn>
    </>
  );
}

function MenuResult({ m, data }: { m: Menu; data: AppData }) {
  const r = analyze(m, data);
  const s = data.settings;
  const baseFormula = s.taxType === "general" ? `${won(m.price)} ÷ 1.1` : s.taxType === "simple" ? `${won(m.price)} × 0.985` : `${won(m.price)} 그대로`;
  const recStep = s.taxType === "general" ? " × 1.1" : s.taxType === "simple" ? " ÷ 0.985" : "";
  return (
    <Card className="bg-accent/40">
      <div className="mb-2 text-sm font-semibold">{m.name} 결과</div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="재료비" value={won(r.cost)} />
        <Stat label="원가율" value={pct(r.rate)} tone={r.rate > s.targetRate ? "bad" : "good"} />
        <Stat label="한 개 팔면 남는 돈" value={won(r.profit)} tone={r.profit <= 0 ? "bad" : undefined} />
        <Stat label={`권장 판매가 (목표 ${s.targetRate}%)`} value={won(r.rec)} />
      </div>
      {r.rec < m.price && (
        <p className="mt-2 text-xs text-muted-foreground">이 계산기는 재료비만 봅니다. 임대료·인건비도 감당해야 하니 권장가는 최소 기준으로만 참고하세요.</p>
      )}
      <details className="mt-3 rounded-xl bg-card p-3">
        <summary className="min-h-8 cursor-pointer font-semibold">어떻게 계산했나요?</summary>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed">
          <li><b>재료비</b> = {m.rows.map((row, i) => {
            const ing = data.ingredients.find((x) => x.id === row.ingredientId);
            return ing ? <span key={i}>{i > 0 && " + "}{ing.name} {num(unitCost(ing))}원 × {num(row.qty)}{ing.unit}</span> : null;
          })} = <b>{won(r.cost)}</b></li>
          <li><b>매출 기준액</b> ({TAX_LABEL[s.taxType]}) = {baseFormula} = {won(r.base)}</li>
          <li><b>원가율</b> = {won(r.cost)} ÷ {won(r.base)} × 100 = <b>{pct(r.rate)}</b></li>
          <li><b>남는 돈</b> = {won(r.base)} − {won(r.cost)} = <b>{won(r.profit)}</b></li>
          <li><b>권장 판매가</b> = {won(r.cost)} ÷ {s.targetRate / 100}{recStep} → 100원 단위 올림 = <b>{won(r.rec)}</b></li>
        </ul>
      </details>
    </Card>
  );
}

/* ---------- 시뮬레이션 ---------- */
function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between"><Label>{label}</Label><span className="text-2xl font-bold text-primary">{value}%</span></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full" />
    </label>
  );
}

function SimTab({ data }: { data: AppData }) {
  const [rise, setRise] = useState(10);
  const [disc, setDisc] = useState(10);
  const [menuId, setMenuId] = useState(data.menus[0]?.id ?? "");
  const s = data.settings;
  const sel = data.menus.find((m) => m.id === menuId) ?? data.menus[0];

  let discBlock: ReactNode = <p className="text-muted-foreground">메뉴를 먼저 추가하세요.</p>;
  if (sel) {
    const cost = menuCost(sel, data.ingredients);
    const before = salesBase(sel.price, s.taxType) - cost;
    const newPrice = sel.price * (1 - disc / 100);
    const after = salesBase(newPrice, s.taxType) - cost;
    const need = (before / after - 1) * 100;
    discBlock = (
      <>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="할인 전 한 개 남는 돈" value={won(before)} />
          <Stat label={`할인 후 (${won(newPrice)})`} value={won(after)} tone={after <= 0 ? "bad" : undefined} />
        </div>
        {after <= 0 ? (
          <p className="mt-3 text-lg font-bold text-destructive">팔수록 손해예요</p>
        ) : (
          <p className="mt-3 text-lg">같은 이익을 남기려면 판매량을 <b className="text-primary">{pct(need)}</b> 늘려야 해요</p>
        )}
      </>
    );
  }

  return (
    <>
      <Card>
        <h2 className="text-lg font-bold">재료값이 오르면?</h2>
        <p className="mb-2 text-sm text-muted-foreground">하루 {s.dailySales}개 · 월 {s.monthDays}일 판매 기준 (설정에서 변경)</p>
        <Slider label="재료값 인상률" value={rise} min={0} max={30} onChange={setRise} />
        <div className="mt-3 space-y-2">
          {data.menus.map((m) => {
            const cost = menuCost(m, data.ingredients);
            const base = salesBase(m.price, s.taxType);
            const newCost = cost * (1 + rise / 100);
            const loss = newCost - cost;
            return (
              <div key={m.id} className="rounded-xl bg-muted p-3">
                <div className="font-semibold">{m.name}</div>
                <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-xs text-muted-foreground">인상 후 원가율</div><div className="font-bold tabular-nums">{pct(base > 0 ? (newCost / base) * 100 : 0)}</div></div>
                  <div><div className="text-xs text-muted-foreground">한 개당 줄어듦</div><div className="font-bold tabular-nums text-destructive">−{won(loss)}</div></div>
                  <div><div className="text-xs text-muted-foreground">한 달 줄어듦</div><div className="font-bold tabular-nums text-destructive">−{won(loss * s.dailySales * s.monthDays)}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 text-lg font-bold">할인 행사를 하면?</h2>
        <label className="block"><Label>메뉴 선택</Label>
          <select className="field" value={sel?.id ?? ""} onChange={(e) => setMenuId(e.target.value)}>
            {data.menus.map((m) => <option key={m.id} value={m.id}>{m.name} ({won(m.price)})</option>)}
          </select></label>
        <div className="mt-3"><Slider label="할인율" value={disc} min={0} max={50} onChange={setDisc} /></div>
        <div className="mt-2">{discBlock}</div>
      </Card>
    </>
  );
}

/* ---------- 설정 ---------- */
function SettingsTab({ data, setData }: { data: AppData; setData: SetData }) {
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<AppData["settings"]>) => setData((d) => ({ ...d, settings: { ...d.settings, ...p } }));

  const backup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cost-calc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const restore = async (f?: File) => {
    if (!f) return;
    try {
      const p = JSON.parse(await f.text());
      if (!isValidData(p)) throw new Error();
      setData(p);
      alert("백업을 불러왔어요.");
    } catch { alert("백업 파일을 읽을 수 없어요. 올바른 파일인지 확인하세요."); }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <Card className="space-y-5">
        <label className="block"><Label>가게 이름</Label><input className="field" value={s.shopName} onChange={(e) => set({ shopName: e.target.value })} /></label>
        <fieldset>
          <Label>과세 유형</Label>
          <div className="space-y-2">
            {(Object.keys(TAX_LABEL) as TaxType[]).map((t) => (
              <label key={t} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 ${s.taxType === t ? "border-primary bg-accent/50" : ""}`}>
                <input type="radio" name="tax" className="size-5" checked={s.taxType === t} onChange={() => set({ taxType: t })} />
                <span>{TAX_LABEL[t]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <Slider label="목표 원가율" value={s.targetRate} min={15} max={45} onChange={(v) => set({ targetRate: v })} />
          <p className="text-xs text-muted-foreground">부가세를 뺀 공급가 기준으로 계산합니다. 판매가 기준보다 약 2%p 엄격하게 나올 수 있어요.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><Label>하루 판매량</Label><NumInput value={s.dailySales} suffix="개" onChange={(v) => set({ dailySales: v })} /></label>
          <label className="block"><Label>월 영업일</Label><NumInput value={s.monthDays} suffix="일" onChange={(v) => set({ monthDays: v })} /></label>
        </div>
      </Card>
      <Card className="space-y-3">
        <Btn className="w-full" onClick={backup}>JSON 파일로 백업</Btn>
        <p className="text-xs text-muted-foreground">다른 기기로 옮기려면 백업 파일이 필요해요.</p>
        <Btn variant="ghost" className="w-full" onClick={() => fileRef.current?.click()}>백업 불러오기</Btn>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
        <Btn variant="danger" className="w-full" onClick={() => { if (confirm("지금 데이터를 지우고 예시 데이터로 바꿀까요?")) setData(sampleData()); }}>예시 데이터로 초기화</Btn>
      </Card>
    </>
  );
}
