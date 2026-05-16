export type AccountTypeId =
  | "taxable_brokerage"
  | "roth_ira"
  | "traditional_ira"
  | "roth_401k"
  | "traditional_401k"
  | "hsa"
  | "529"
  | "custodial";

export interface AccountTypeMeta {
  id: AccountTypeId;
  label: string;
  short: string;
  group: "Taxable" | "Retirement" | "Education" | "Health";
  tagline: string;
}

export const ACCOUNT_TYPES: AccountTypeMeta[] = [
  { id: "taxable_brokerage", label: "Taxable Brokerage", short: "Brokerage", group: "Taxable",
    tagline: "Standard account. Capital gains tax + dividend tax apply." },
  { id: "roth_ira", label: "Roth IRA", short: "Roth IRA", group: "Retirement",
    tagline: "Tax-free growth + withdrawals. No tax-loss harvesting." },
  { id: "traditional_ira", label: "Traditional IRA", short: "Trad IRA", group: "Retirement",
    tagline: "Tax-deferred. No capital gains tax until withdrawal." },
  { id: "roth_401k", label: "Roth 401(k)", short: "Roth 401k", group: "Retirement",
    tagline: "Tax-free growth via employer. No tax-loss harvesting." },
  { id: "traditional_401k", label: "Traditional 401(k)", short: "Trad 401k", group: "Retirement",
    tagline: "Tax-deferred via employer. Pre-tax contributions." },
  { id: "hsa", label: "HSA", short: "HSA", group: "Health",
    tagline: "Triple tax advantage. Preserve for medical expenses." },
  { id: "529", label: "529 Education", short: "529", group: "Education",
    tagline: "Tax-free if used for education. De-risk as goal nears." },
  { id: "custodial", label: "Custodial (UGMA/UTMA)", short: "Custodial", group: "Taxable",
    tagline: "Taxed at minor's bracket (kiddie tax). Transfers at age of majority." },
];

const ACCOUNT_TYPE_MAP: Record<AccountTypeId, AccountTypeMeta> =
  Object.fromEntries(ACCOUNT_TYPES.map(t => [t.id, t])) as Record<AccountTypeId, AccountTypeMeta>;

export const DEFAULT_ACCOUNT_TYPE: AccountTypeId = "taxable_brokerage";

export function isAccountTypeId(value: unknown): value is AccountTypeId {
  return typeof value === "string" && value in ACCOUNT_TYPE_MAP;
}

export function getAccountType(id: string | null | undefined): AccountTypeMeta {
  if (id && isAccountTypeId(id)) return ACCOUNT_TYPE_MAP[id];
  return ACCOUNT_TYPE_MAP[DEFAULT_ACCOUNT_TYPE];
}
