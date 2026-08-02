export function calculatePlateServiceProfit(input: {
  totalRevenue: number;
  registrationTax: number;
  plateFee: number;
  policeFee: number;
  plateFrameTotalCost?: number;
}) {
  return (
    Number(input.totalRevenue || 0)
    - Number(input.registrationTax || 0)
    - Number(input.plateFee || 0)
    - Number(input.policeFee || 0)
    - Number(input.plateFrameTotalCost || 0)
  );
}
