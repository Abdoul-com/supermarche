export function isPositiveNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0;
}

export function validateProductForm(product) {
  if (!product?.name || !product?.reference) {
    return 'Le nom et la référence du produit sont obligatoires.';
  }

  if (!isPositiveNumber(product.purchase_price) || !isPositiveNumber(product.sale_price)) {
    return 'Les prix ne peuvent pas être négatifs.';
  }

  if (!isPositiveNumber(product.stock)) {
    return 'Le stock ne peut pas être négatif.';
  }

  return null;
}
