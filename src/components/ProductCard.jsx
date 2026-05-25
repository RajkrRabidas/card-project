function ProductCard({ product, onAddToCart }) {
  return (
    <article className="card">
      <img src={product.image} alt={product.name} className="card-image" />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className="card-footer">
        <strong>₹{product.price}</strong>
        <button onClick={() => onAddToCart(product)}>Add to Cart</button>
      </div>
    </article>
  );
}

export default ProductCard;
