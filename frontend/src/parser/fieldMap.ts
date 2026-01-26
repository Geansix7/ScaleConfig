export const PLU_FIELDS = {
  KIND: 0,
  ID: 1,
  UNKNOWN_2: 2,
  UNKNOWN_3: 3,
  UNIT_TYPE: 4,     // 1=kg, 2=pcs
  PRICE: 5,         // Primary price "600,0"
  PRICE_2: 6,
  PRICE_3: 7,
  DEPARTMENT: 14,
  NAME: 15,
  SHORT_CODE: 64,
} as const;

export const SCP_FIELDS = {
  KIND: 0,
  LAYER: 1,         // 0, 1, 2
  KEY_INDEX: 2,     // 1-40 (grid), 41-48 (extras)
  PLU_ID: 3,
} as const;

export const DPT_FIELDS = {
  KIND: 0,
  ID: 1,
  NAME: 2,
} as const;

export const CLS_FIELDS = {
  KIND: 0,
  ID: 1,
  NAME: 2,
  DEPT_ID: 3,
} as const;
