CREATE TABLE IF NOT EXISTS content_domain_links (
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  subdomain_id UUID REFERENCES subdomains(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (content_id, domain_id)
);

CREATE INDEX IF NOT EXISTS idx_content_domain_links_domain_id ON content_domain_links (domain_id);
CREATE INDEX IF NOT EXISTS idx_content_domain_links_subdomain_id ON content_domain_links (subdomain_id);

INSERT INTO content_domain_links (content_id, domain_id, subdomain_id)
SELECT
  c.id,
  d.id,
  sd.id
FROM contents c
JOIN domains d
  ON lower(d.name) = lower(c.metadata->>'domain')
LEFT JOIN subdomains sd
  ON sd.domain_id = d.id
 AND lower(sd.name) = lower(c.metadata->>'subdomain')
WHERE c.metadata ? 'domain'
ON CONFLICT (content_id, domain_id) DO UPDATE
SET
  subdomain_id = EXCLUDED.subdomain_id,
  updated_at = NOW();
