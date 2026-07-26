export type TicketCharge = {
  id: string;
  name: string;
  calculation_type: "percentage" | "fixed";
  value: number;
  applies_to: "subtotal" | "order" | "visitor";
};

export type CalculatedTicketCharge = TicketCharge & { amount: number };

export function calculateTicketCharges(charges: TicketCharge[], subtotal: number, visitorCount: number) {
  return charges.map<CalculatedTicketCharge>((charge) => {
    const numericValue = Number(charge.value);
    let amount = 0;

    if (charge.calculation_type === "percentage") amount = Math.round(subtotal * (numericValue / 100));
    else if (charge.applies_to === "visitor") amount = Math.round(numericValue * visitorCount);
    else amount = Math.round(numericValue);

    return { ...charge, value: numericValue, amount };
  });
}
