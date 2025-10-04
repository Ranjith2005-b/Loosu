import { Product, ProductId } from '../../domain/types';
import { ValidationError } from '../../utils/errors';

export class CatalogService {
  private products: Map<ProductId, Product> = new Map();

  list(): Product[] {
    return Array.from(this.products.values());
  }

  get(id: ProductId): Product | undefined {
    return this.products.get(id);
  }

  create(product: Product) {
    if (!product.id || !product.name) throw new ValidationError('Product must have id and name');
    if (this.products.has(product.id)) throw new ValidationError('Product id already exists');
    this.products.set(product.id, product);
  }

  update(product: Product) {
    if (!this.products.has(product.id)) throw new ValidationError('Product not found');
    this.products.set(product.id, product);
  }
}
