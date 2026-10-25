export const franchiseLocations = [
  {
    name: "London",
    headOffice: true,
    address: "Office address to be confirmed",
    x: 80.5,
    y: 81.5,
    labelSide: "right",
  },
  {
    name: "Manchester",
    headOffice: false,
    address: "Office address to be confirmed",
    x: 56,
    y: 60.5,
    labelSide: "right",
  },
  {
    name: "Hampshire",
    headOffice: false,
    address: "Office address to be confirmed",
    x: 66.5,
    y: 86,
    labelSide: "left",
  },
] as const;

export type FranchiseLocation = (typeof franchiseLocations)[number];
