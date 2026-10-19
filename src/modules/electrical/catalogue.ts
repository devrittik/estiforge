export const electricalCatalogue = [
  {
    code: "light-point",
    name: "Light point",
    unit: "nos",
    methodId: "electrical.point-quantity",
  },
  {
    code: "fan-point",
    name: "Fan point",
    unit: "nos",
    methodId: "electrical.point-quantity",
  },
  {
    code: "switch",
    name: "Switch",
    unit: "nos",
    methodId: "electrical.point-quantity",
  },
  {
    code: "socket",
    name: "Socket outlet",
    unit: "nos",
    methodId: "electrical.point-quantity",
  },
  {
    code: "distribution-board",
    name: "Distribution board",
    unit: "nos",
    methodId: "electrical.point-quantity",
  },
  {
    code: "cable",
    name: "Cable",
    unit: "m",
    methodId: "electrical.route-length",
  },
  {
    code: "conduit",
    name: "Conduit",
    unit: "m",
    methodId: "electrical.route-length",
  },
] as const;

export type CatalogueCode = (typeof electricalCatalogue)[number]["code"];
export type QuantityUnit = "nos" | "m";

export function findCatalogueItem(code: string) {
  return electricalCatalogue.find((item) => item.code === code) ?? null;
}
