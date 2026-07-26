export type PurchaseType = "individual" | "group";

export type OperatorType = "homestay" | "resort" | "lob" | "other";

export type VisitorGender = "male" | "female" | "prefer_not_to_say";

export type IdentityType = "ktp" | "sim" | "passport" | "kitas" | "kitap";

export type TicketVisitor = {
  visitorName: string;
  country: string;
  gender: VisitorGender | "";
  identityType: IdentityType | "";
  identityNumber: string;
};

export type SelectedArea = {
  id: string;
  slug: string;
  name: string;
  imagePath: string | null;
  ticketPrice: number;
};

export type TicketFormData = {
  purchaseType: PurchaseType | "";

  usesOperator: boolean;
  operatorName: string;
  operatorEmail: string;
  operatorType: OperatorType | "";
  operatorTypeOther: string;

  bringsBoat: boolean;
  boatName: string;

  visitorCount: number;

  buyerName: string;
  buyerEmail: string;

  visitors: TicketVisitor[];
  selectedAreas: SelectedArea[];
};
