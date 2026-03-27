CREATE TABLE IF NOT EXISTS product_content_links (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_product_content_links_content_id ON product_content_links (content_id);

CREATE TABLE IF NOT EXISTS product_domain_links (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, domain_id)
);

CREATE INDEX IF NOT EXISTS idx_product_domain_links_domain_id ON product_domain_links (domain_id);

INSERT INTO product_content_links (product_id, content_id)
SELECT id, content_id
FROM products
WHERE content_id IS NOT NULL
ON CONFLICT (product_id, content_id) DO NOTHING;

INSERT INTO product_domain_links (product_id, domain_id)
SELECT p.id, linked.domain_id::UUID
FROM products p
JOIN LATERAL unnest(p.bundle_domain_ids) AS linked(domain_id) ON TRUE
WHERE p.tier = 'bundle'
  AND linked.domain_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
ON CONFLICT (product_id, domain_id) DO NOTHING;
