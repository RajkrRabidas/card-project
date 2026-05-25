import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import products from "./products";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-sdk")) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);

const createDemoId = (prefix) => `${prefix}_${Math.random().toString(16).slice(2, 14)}`;

function App() {
  const [cartItems, setCartItems] = useState([]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [toastProduct, setToastProduct] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const toastTimerRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const cartCount = useMemo(
    () => cartItems.reduce((count, item) => count + item.quantity, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const addToBag = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (!existing) {
        return [...prev, { ...product, quantity: 1 }];
      }

      return prev.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    });

    setToastProduct(product.name.toUpperCase());
    setIsToastVisible(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // meta API token test fetch - can be removed once verified

  useEffect(() => {
    const metaToken = import.meta.env.VITE_META_API_TOKEN;
    
    fetch('https://graph.instagram.com/me/media', {
      headers: { 'Authorization': `Bearer ${metaToken}` }
    })
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.error(err));
  }, []);

  const updateQty = (id, step) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(item.quantity + step, 0) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const goCheckout = () => {
    setIsBagOpen(false);
    navigate("/checkout");
  };

  const goHome = () => {
    navigate("/");
  };

  const processOrderCompletion = (paymentId, customer) => {
    setLastOrder({
      orderId: createDemoId("order_demo"),
      paymentId: paymentId || createDemoId("pay_demo"),
      amount: subtotal,
      items: cartItems,
      customer
    });
    setCartItems([]);
    navigate("/thank-you");
  };

  const payNow = async (customer) => {
    if (!cartItems.length) {
      return;
    }

    if (!RAZORPAY_KEY_ID) {
      processOrderCompletion(null, customer);
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert("Razorpay SDK failed to load. Please check your internet connection.");
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: subtotal * 100,
      currency: "INR",
      name: "ATELIER/NULL",
      description: "Collection Checkout",
      handler: (response) => {
        processOrderCompletion(response.razorpay_payment_id, customer);
      },
      prefill: {
        name: customer.fullName,
        email: customer.email,
        contact: customer.phone
      },
      theme: {
        color: "#0b0b0c"
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  return (
    <div className="site-shell">
      <StoreHeader
        cartCount={cartCount}
        onCartClick={() => {
          if (location.pathname === "/") {
            setIsBagOpen(true);
            return;
          }
          navigate("/");
        }}
        onHomeClick={goHome}
      />

      <Routes>
        <Route
          path="/"
          element={<HomePage products={products} onAddToBag={addToBag} />}
        />
        <Route
          path="/checkout"
          element={
            <CheckoutPage
              cartItems={cartItems}
              subtotal={subtotal}
              onBack={goHome}
              onIncrease={(id) => updateQty(id, 1)}
              onDecrease={(id) => updateQty(id, -1)}
              onRemove={removeItem}
              onPay={payNow}
            />
          }
        />
        <Route
          path="/thank-you"
          element={<ThankYouPage order={lastOrder} onBackHome={goHome} />}
        />
      </Routes>

      {location.pathname !== "/checkout" && location.pathname !== "/thank-you" && (
        <BagDrawer
          isOpen={isBagOpen}
          cartItems={cartItems}
          subtotal={subtotal}
          onClose={() => setIsBagOpen(false)}
          onIncrease={(id) => updateQty(id, 1)}
          onDecrease={(id) => updateQty(id, -1)}
          onRemove={removeItem}
          onCheckout={goCheckout}
        />
      )}

      <AddToBagToast
        isVisible={isToastVisible}
        productName={toastProduct}
        onViewBag={() => {
          setIsToastVisible(false);
          setIsBagOpen(true);
        }}
      />
    </div>
  );
}

function AddToBagToast({ isVisible, productName, onViewBag }) {
  return (
    <div className={`bag-toast ${isVisible ? "show" : ""}`} role="status" aria-live="polite">
      <span>{productName} ADDED TO BAG</span>
      <button onClick={onViewBag}>VIEW BAG</button>
    </div>
  );
}

function StoreHeader({ cartCount, onCartClick, onHomeClick }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHomeClick}>ATELIER/NULL</button>
      <div className="topbar-center">
        <span>COLLECTION</span>
        <span>FW / 26</span>
      </div>
      <button className="cart-link" onClick={onCartClick}>
        CART [{String(cartCount).padStart(2, "0")}]
      </button>
    </header>
  );
}

function HomePage({ products, onAddToBag }) {
  return (
    <main className="collection-page">
      <section className="product-grid">
        {products.map((product) => (
          <article key={product.id} className="product-card">
            <div className="product-image-wrap">
              <span className="product-code">{product.code}</span>
              <img src={product.image} alt={product.name} className="product-image" />
            </div>
            <div className="product-copy">
              <div className="mini-meta">{product.code} / {product.category.toUpperCase()}</div>
              <h2>{product.name}</h2>
              <p className="material">{product.material}</p>
              <p className="description">{product.description}</p>
              <button className="primary-btn" onClick={() => onAddToBag(product)}>
                ADD TO BAG - {formatINR(product.price)}
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function BagDrawer({
  isOpen,
  cartItems,
  subtotal,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
  onCheckout
}) {
  return (
    <>
      <div className={`bag-overlay ${isOpen ? "show" : ""}`} onClick={onClose} />
      <aside className={`bag-drawer ${isOpen ? "open" : ""}`}>
        <div className="bag-header">
          <h3>YOUR BAG [{String(cartItems.reduce((n, item) => n + item.quantity, 0)).padStart(2, "0")}]</h3>
          <button onClick={onClose} className="icon-btn">x</button>
        </div>

        <div className="bag-items">
          {!cartItems.length && <p className="empty-note">Your bag is empty.</p>}
          {cartItems.map((item) => (
            <div className="bag-item" key={item.id}>
              <img src={item.image} alt={item.name} className="bag-thumb" />
              <div className="bag-item-copy">
                <div className="mini-meta">{item.code} / {item.category.toUpperCase()}</div>
                <h4>{item.name}</h4>
                <div className="qty-row">
                  <button className="qty-btn" onClick={() => onDecrease(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button className="qty-btn" onClick={() => onIncrease(item.id)}>+</button>
                </div>
              </div>
              <div className="bag-item-side">
                <button className="icon-btn remove-btn" onClick={() => onRemove(item.id)}>x</button>
                <strong>{formatINR(item.price * item.quantity)}</strong>
              </div>
            </div>
          ))}
        </div>

        <footer className="bag-footer">
          <div className="subline">
            <span>SUBTOTAL</span>
            <strong>{formatINR(subtotal)}</strong>
          </div>
          <p>Taxes and shipping calculated at checkout.</p>
          <button className="primary-btn full-width" disabled={!cartItems.length} onClick={onCheckout}>
            PROCEED TO CHECKOUT
          </button>
        </footer>
      </aside>
    </>
  );
}

function CheckoutPage({
  cartItems,
  subtotal,
  onBack,
  onIncrease,
  onDecrease,
  onRemove,
  onPay
}) {
  const [customer, setCustomer] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: ""
  });

  const onInput = (event) => {
    const { name, value } = event.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const shipping = 0;
  const tax = 0;
  const total = subtotal + shipping + tax;

  return (
    <main className="checkout-page">
      <button className="back-link" onClick={onBack}>BACK TO COLLECTION</button>
      <div className="checkout-grid">
        <section>
          <div className="mini-meta">STEP 02 / CHECKOUT</div>
          <h1 className="checkout-title">COMPLETE YOUR ORDER.</h1>

          <div className="form-grid">
            <label className="field full">
              <span>FULL NAME</span>
              <input name="fullName" value={customer.fullName} onChange={onInput} />
            </label>
            <label className="field">
              <span>EMAIL</span>
              <input name="email" type="email" value={customer.email} onChange={onInput} />
            </label>
            <label className="field">
              <span>PHONE</span>
              <input name="phone" value={customer.phone} onChange={onInput} />
            </label>
            <label className="field full">
              <span>SHIPPING ADDRESS</span>
              <input name="address" value={customer.address} onChange={onInput} />
            </label>
            <label className="field">
              <span>CITY</span>
              <input name="city" value={customer.city} onChange={onInput} />
            </label>
            <label className="field">
              <span>STATE</span>
              <input name="state" value={customer.state} onChange={onInput} />
            </label>
            <label className="field">
              <span>POSTAL CODE</span>
              <input name="postalCode" value={customer.postalCode} onChange={onInput} />
            </label>
          </div>

          <button className="primary-btn pay-btn" disabled={!cartItems.length} onClick={() => onPay(customer)}>
            PAY {formatINR(total)} VIA RAZORPAY
          </button>
          {!import.meta.env.VITE_RAZORPAY_KEY_ID && (
            <p className="demo-note">Demo payment mode is active. Add VITE_RAZORPAY_KEY_ID for live checkout popup.</p>
          )}
        </section>

        <aside className="summary-panel">
          <h3>ORDER SUMMARY</h3>
          <div className="summary-items">
            {cartItems.map((item) => (
              <div className="summary-item" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div>
                  <div className="mini-meta">{item.code} / {item.category.toUpperCase()}</div>
                  <p>{item.name}</p>
                  <div className="summary-qty-row">
                    <button className="qty-btn" onClick={() => onDecrease(item.id)}>-</button>
                    <span>{item.quantity}</span>
                    <button className="qty-btn" onClick={() => onIncrease(item.id)}>+</button>
                    <button className="inline-remove" onClick={() => onRemove(item.id)}>remove</button>
                  </div>
                </div>
                <strong>{formatINR(item.price * item.quantity)}</strong>
              </div>
            ))}
            {!cartItems.length && <p className="empty-note">Add an item from collection to continue.</p>}
          </div>

          <div className="totals">
            <div><span>SUBTOTAL</span><span>{formatINR(subtotal)}</span></div>
            <div><span>SHIPPING</span><span>Free</span></div>
            <div><span>TAX</span><span>{formatINR(tax)}</span></div>
            <div className="total-row"><span>TOTAL</span><strong>{formatINR(total)}</strong></div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ThankYouPage({ order, onBackHome }) {
  if (!order) {
    return (
      <main className="thankyou-page">
        <h1 className="thankyou-title">THANK YOU.</h1>
        <p className="description">No active order found. Please place an order from the collection.</p>
        <button className="primary-btn" onClick={onBackHome}>BACK TO THE COLLECTION</button>
      </main>
    );
  }

  return (
    <main className="thankyou-page">
      <div className="badge-row">
        <span className="tick">check</span>
        <span className="mini-meta">DEMO PAYMENT · SIMULATED</span>
      </div>
      <h1 className="thankyou-title">THANK YOU.<br /><em>YOUR ORDER IS IN.</em></h1>
      <p className="description">
        A confirmation has been logged. In a real storefront, this is where receipt and shipping notifications are sent.
      </p>

      <div className="receipt-grid">
        <div>
          <span className="mini-meta">ORDER ID</span>
          <p>{order.orderId}</p>
        </div>
        <div>
          <span className="mini-meta">PAYMENT ID</span>
          <p>{order.paymentId}</p>
        </div>
        <div>
          <span className="mini-meta">AMOUNT</span>
          <p className="receipt-amount">{formatINR(order.amount)}</p>
        </div>
      </div>

      <button className="primary-btn" onClick={onBackHome}>BACK TO THE COLLECTION</button>
    </main>
  );
}

export default App;
