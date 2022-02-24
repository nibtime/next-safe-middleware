export type Primitve = string | number | boolean;
export type Nullable<T = null> = T | null;
// a script as simple data (pair of its attributes)
export type IterableScript = [string, Primitve][];
