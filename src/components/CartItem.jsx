function CartItem({ item, onIncrease, onDecrease }) {
  return (
    <div className="cart-item">
      <div className="cart-item-left">
        <img src={item.image} alt={item.name} className="cart-thumb" />
        <div>
          <h4>{item.name}</h4>
          <p>Rs. {item.price}</p>
        </div>
      </div>
      <div className="qty-controls">
        <button onClick={() => onDecrease(item.id)}>-</button>
        <span>{item.quantity}</span>
        <button onClick={() => onIncrease(item.id)}>+</button>
      </div>
    </div>
  );
}

export default CartItem;
