export const CURRENCY_CODES: Record<number, string> = {
  980: "UAH",
  975: "BGN",
  978: "EUR",
  840: "USD",
  985: "PLN",
  949: "TRY",
}

// === базові економічні константи ===
export const MINIMUM_WAGE = 8000 // мінімальна заробітна плата, грн/міс
export const LIVING_WAGE = 3028 // прожитковий мінімум, грн/міс
export const ESV_RATE = 0.22 // ставка ЄСВ (єдиний соціальний внесок)
export const MILITARY_TAX_RATE = 0.01 // ставка військового збору (1%)
export const PERSONAL_INCOME_TAX_RATE = 0.18 // ставка ПДФО (18%)
export const VAT_RATE = 0.2 // ставка ПДВ (20%)

// === річні ліміти доходів (грн/рік) ===
export const LIMIT_GROUP_1 = 1336000 // ліміт для ФОП 1 групи
export const LIMIT_GROUP_2 = 6672000 // ліміт для ФОП 2 групи
export const LIMIT_GROUP_3 = 9336000 // ліміт для ФОП 3 групи

// === ліміти за кількістю працівників ===
export const MAX_EMPLOYEES_GROUP_1 = 0 // максимум працівників для 1 групи (не дозволено)
export const MAX_EMPLOYEES_GROUP_2 = 10 // максимум працівників для 2 групи
export const MAX_EMPLOYEES_GROUP_3 = Infinity // для 3 групи обмежень немає

// === ставки єдиного податку ===
export const FIXED_TAX_GROUP_1 = 302.8 // макс 10% от прожиточного минимума (3028)
export const FIXED_TAX_GROUP_2 = 1600 // макс 20% от мінімальної зарплати (8000)
export const TAX_RATE_GROUP_3_NON_VAT = 0.05 // ставка 5% для 3 групи без ПДВ
export const TAX_RATE_GROUP_3_VAT = 0.03 // ставка 3% для 3 групи з ПДВ

// === єдиний соціальний внесок (ЄСВ) ===
export const ESV_MIN_MONTHLY = 1760 // мінімальний ЄСВ за місяць, грн
export const ESV_MIN_QUARTERLY = 5280 // мінімальний ЄСВ за квартал, грн

// === строки звітності та сплати ===
export const REPORTING_DEADLINE_DAYS = 40 // крайній термін подачі звіту, днів після кварталу
export const PAYMENT_DEADLINE_DAYS = 50 // крайній термін сплати податків, днів після кварталу

export const DISABLED_QUARTERS = [] // ["Q4"]

export const FIN_AID_KEYWORDS = [
  "допомога",
  "фінансова допомога",
  "матеріальна допомога",
  "матеріальна підтримка",
  "підтримка",
  "пожертва",
  "благодійність",
  "благодійна допомога",
  "подарунок",
  "дарунок",
  "на подарунок",
  "грошова допомога",
  "безповоротна допомога",
  "безповоротна фінансова допомога",
  "допомога на лікування",
  "допомога на оренду",
  "допомога на життя",
  "гуманітарна допомога",
  "волонтерська допомога",
]

export const RETURN_KEYWORDS = [
  "повернення",
  "повернення боргу",
  "борг",
  "повертаю борг",
  "повернення коштів",
  "повернення грошей",
  "поворотна фінансова допомога",
  "позика",
  "повернення позики",
  "кредиторська заборгованість",
  "відшкодування",
  "компенсація",
  "повертаю за",
]

export const FX_SALE_KEYWORDS = [
  "продаж",
  "продажа",
  "продажу",
  "продажі",
  "продаж валют",
  "продаж валюти",
  "продажа валюты",
  "гривні від продажу",
  "грн від продажу",
  "від продажу",
  "зарахування від продажу",
  "продаж валюти за договором",
  "купівля-продаж валюти",
  "по курсу",
  "обмін валют",
  "конвертація валюти",
  "prodazh",
  "prodaja",
  "prodazha",
  "prodazhu",
  "prodazhi",
  "valuti",
  "valiuty",
  "valyuty",
  "valuty",
  "prodazh valiuty",
  "prodazh valuti",
  "prodazha valiuty",
  "za dogovorom",
  "za dohovorom",
  "za dogovor",
  "vid prodazhu",
  "vid prodazh",
  "vid prodazha",
  "po kursu",
]
