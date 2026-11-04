export interface FranchiseOfficeContent {
  _id: string;
  name: string;
  isHeadOffice?: boolean;
  address?: string;
  phone?: string;
}

export interface FranchiseLocation {
  id: string;
  name: string;
  headOffice: boolean;
  address: string;
  phone: string;
  x: number;
  y: number;
  labelSide: "left" | "right";
}

export const franchiseMapPositions = [
  {
    id: "location-london",
    x: 80.5,
    y: 81.5,
    labelSide: "right",
  },
  {
    id: "location-manchester",
    x: 56,
    y: 60.5,
    labelSide: "left",
  },
  {
    id: "location-hampshire",
    x: 66.5,
    y: 86,
    labelSide: "left",
  },
] as const;

export function isOfficePhone(value: unknown): value is string {
  if (typeof value !== "string" || !/^\+?[\d ()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 10 && digits <= 15;
}

export function requireFranchiseLocations(offices: FranchiseOfficeContent[]): FranchiseLocation[] {
  return franchiseMapPositions.map(({ id, ...position }) => {
    const office = offices.find(({ _id }) => _id === id);
    if (!office?.name?.trim() || !office.address?.trim() || !isOfficePhone(office.phone)) {
      throw new Error(`Publish ${id} in Sanity Locations with a name, office address and valid phone number before building the website.`);
    }
    return {
      id,
      ...position,
      name: office.name.trim(),
      headOffice: office.isHeadOffice === true,
      address: office.address.trim(),
      phone: office.phone.trim(),
    };
  });
}
