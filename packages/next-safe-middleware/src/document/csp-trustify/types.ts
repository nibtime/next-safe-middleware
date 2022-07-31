export type Nullable<T = null> = T | null;
export type Primitve = string | number | boolean;
export type IterableScript = [string, Primitve][];
export type ExcludeList = ("scripts" | "styles")[];
export type TrustifyComponentProps = {
  children?: any;
};

export type TrustifyComponents = {
  Head: (props: TrustifyComponentProps) => any;
  NextScript: (props: TrustifyComponentProps) => any;
};
