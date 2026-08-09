export interface ProductOption {
  name: string;
  values: string[];
}

export function buildProductOptions(variants: any[]): ProductOption[] {

  const map = new Map<string, Set<string>>();

  for (const variant of variants) {

    [
      [variant.variant1, variant.value1],
      [variant.variant2, variant.value2],
      [variant.variant3, variant.value3],
    ].forEach(([name, value]) => {

      if (!name || !value) return;

      if (!map.has(name)) {
        map.set(name, new Set());
      }

      map.get(name)!.add(value);

    });

  }

  return [...map.entries()].map(([name, values]) => ({
    name,
    values: [...values],
  }));

}