// === Базові економічні показники ===
export const YEAR = 2025
export const MINIMUM_WAGE = 8000 // грн — мінімальна заробітна плата
export const LIVING_WAGE = 2920 // грн — прожитковий мінімум
export const ESV_RATE = 0.22 // 22% від мінімальної зарплати
export const MILITARY_TAX_RATE = 0.01 // 1% військовий збір (для ФОП 3 групи)
export const PERSONAL_INCOME_TAX_RATE = 0.18 // 18% ПДФО (для довідкових розрахунків)
export const VAT_RATE = 0.2 // 20% — стандартна ставка ПДВ

// === Річні ліміти доходу (грн/рік) ===
export const LIMIT_GROUP_1 = 1336000
export const LIMIT_GROUP_2 = 6672000
export const LIMIT_GROUP_3 = 9336000

// === Обмеження за кількістю працівників ===
export const MAX_EMPLOYEES_GROUP_1 = 0
export const MAX_EMPLOYEES_GROUP_2 = 10
export const MAX_EMPLOYEES_GROUP_3 = Infinity

// === Ставки єдиного податку ===
export const FIXED_TAX_GROUP_1 = 400 // грн / місяць
export const FIXED_TAX_GROUP_2 = 1600 // грн / місяць
export const TAX_RATE_GROUP_3_NON_VAT = 0.05 // 5% — без ПДВ
export const TAX_RATE_GROUP_3_VAT = 0.03 // 3% — платники ПДВ

// === Єдиний соціальний внесок (ЄСВ) ===
export const ESV_MIN_MONTHLY = 1760 // грн / місяць
export const ESV_MIN_QUARTERLY = 5280 // грн / квартал

// === Звітність та строки сплати ===
export const REPORTING_PERIOD = "quarter" // квартальна звітність
export const REPORTING_DEADLINE_DAYS = 40 // днів після закінчення кварталу для подання декларації
export const PAYMENT_DEADLINE_DAYS = 50 // днів після закінчення кварталу для сплати податку

// === Граничні значення (для можливих змін) ===
export const MAX_SINGLE_TAX_RATE = 0.05
export const MIN_SINGLE_TAX_RATE = 0.03
export const MAX_ESV_RATE = 0.22
export const MAX_MILITARY_TAX_RATE = 0.015

// === Опис груп (для звітів / підказок) ===
export const GROUP_LABEL_1 = "1 група — роздрібна торгівля, побутові послуги, без найманих осіб"
export const GROUP_LABEL_2 = "2 група — послуги населенню, торгівля, ресторанний бізнес (до 10 осіб)"
export const GROUP_LABEL_3 = "3 група — будь-яка діяльність, у тому числі ІТ, без обмежень за працівниками"
