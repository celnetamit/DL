CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_order_id
  ON payments (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id
  ON payments (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_access_status
  ON purchases (access_status);

CREATE INDEX IF NOT EXISTS idx_purchases_payment_status
  ON purchases (payment_status);
