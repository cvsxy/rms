export function formatMXN(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${num.toFixed(2)}`;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num);
}

export function getLocalizedName(
  item: { name: string; nameEs: string },
  locale: string
): string {
  return locale === "es" ? item.nameEs : item.name;
}

export function getLocalizedDescription(
  item: { description: string | null; descriptionEs: string | null },
  locale: string
): string | null {
  return locale === "es" ? item.descriptionEs : item.description;
}
