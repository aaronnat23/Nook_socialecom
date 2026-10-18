"""Frozen initial relational commerce and versioned storefront schema."""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE TABLE audit_logs (\n\tactor_id VARCHAR(36) NOT NULL, \n\taction VARCHAR(80) NOT NULL, \n\tresource_id VARCHAR(120) NOT NULL, \n\tdata JSONB NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id)\n)"
    )
    op.execute("CREATE INDEX ix_audit_logs_resource_id ON audit_logs (resource_id)")
    op.execute(
        "CREATE TABLE payment_webhook_events (\n\texternal_event_id VARCHAR(120) NOT NULL, \n\tpayload_hash VARCHAR(64) NOT NULL, \n\tprocessed_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (external_event_id)\n)"
    )
    op.execute(
        "CREATE TABLE profiles (\n\temail VARCHAR(254) NOT NULL, \n\tpassword_hash TEXT NOT NULL, \n\thandle VARCHAR(30) NOT NULL, \n\tdisplay_name VARCHAR(80) NOT NULL, \n\tbio VARCHAR(600) NOT NULL, \n\tis_admin BOOLEAN NOT NULL, \n\tpreferences JSONB NOT NULL, \n\tdisabled BOOLEAN NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (email), \n\tUNIQUE (handle)\n)"
    )
    op.execute(
        "CREATE TABLE reports (\n\treporter_id VARCHAR(36) NOT NULL, \n\ttarget_id VARCHAR(120) NOT NULL, \n\ttarget_type VARCHAR(20) NOT NULL, \n\treason VARCHAR(1000) NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(reporter_id) REFERENCES profiles (id)\n)"
    )
    op.execute("CREATE INDEX ix_reports_reporter_id ON reports (reporter_id)")
    op.execute(
        "CREATE TABLE shops (\n\towner_user_id VARCHAR(36) NOT NULL, \n\tslug VARCHAR(60) NOT NULL, \n\tname VARCHAR(100) NOT NULL, \n\tbio VARCHAR(600) NOT NULL, \n\tcategory VARCHAR(40) NOT NULL, \n\tlocation VARCHAR(100) NOT NULL, \n\tavatar VARCHAR(120) NOT NULL, \n\tcover VARCHAR(120) NOT NULL, \n\ttheme VARCHAR(50) NOT NULL, \n\tseller_enabled BOOLEAN NOT NULL, \n\tstatus VARCHAR(24) NOT NULL, \n\tshipping_minor INTEGER NOT NULL, \n\treturn_policy VARCHAR(1000) NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tCHECK (shipping_minor >= 0), \n\tUNIQUE (owner_user_id), \n\tFOREIGN KEY(owner_user_id) REFERENCES profiles (id), \n\tUNIQUE (slug)\n)"
    )
    op.execute(
        "CREATE TABLE assets (\n\towner_user_id VARCHAR(36) NOT NULL, \n\tshop_id VARCHAR(36) NOT NULL, \n\tpath VARCHAR(250) NOT NULL, \n\twidth INTEGER NOT NULL, \n\theight INTEGER NOT NULL, \n\tsize_bytes INTEGER NOT NULL, \n\tchecksum VARCHAR(64) NOT NULL, \n\talt VARCHAR(300) NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(owner_user_id) REFERENCES profiles (id), \n\tFOREIGN KEY(shop_id) REFERENCES shops (id)\n)"
    )
    op.execute("CREATE INDEX ix_assets_owner_user_id ON assets (owner_user_id)")
    op.execute("CREATE INDEX ix_assets_shop_id ON assets (shop_id)")
    op.execute(
        "CREATE TABLE collections (\n\tshop_id VARCHAR(36) NOT NULL, \n\ttitle VARCHAR(160) NOT NULL, \n\tproduct_ids JSONB NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(shop_id) REFERENCES shops (id)\n)"
    )
    op.execute("CREATE INDEX ix_collections_shop_id ON collections (shop_id)")
    op.execute(
        "CREATE TABLE orders (\n\tshop_id VARCHAR(36) NOT NULL, \n\tbuyer_user_id VARCHAR(36) NOT NULL, \n\tstate VARCHAR(32) NOT NULL, \n\tcurrency VARCHAR(3) NOT NULL, \n\tsubtotal_minor INTEGER NOT NULL, \n\tshipping_minor INTEGER NOT NULL, \n\ttotal_minor INTEGER NOT NULL, \n\taddress JSONB NOT NULL, \n\titems JSONB NOT NULL, \n\tidempotency_key VARCHAR(100) NOT NULL, \n\texpires_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\ttracking VARCHAR(160) NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (buyer_user_id, idempotency_key), \n\tCHECK (total_minor = subtotal_minor + shipping_minor), \n\tCHECK (subtotal_minor >= 0 AND shipping_minor >= 0), \n\tFOREIGN KEY(shop_id) REFERENCES shops (id), \n\tFOREIGN KEY(buyer_user_id) REFERENCES profiles (id)\n)"
    )
    op.execute("CREATE INDEX ix_orders_buyer_user_id ON orders (buyer_user_id)")
    op.execute("CREATE INDEX ix_orders_shop_id ON orders (shop_id)")
    op.execute(
        "CREATE TABLE products (\n\tshop_id VARCHAR(36) NOT NULL, \n\tslug VARCHAR(180) NOT NULL, \n\ttitle VARCHAR(160) NOT NULL, \n\tdescription VARCHAR(6000) NOT NULL, \n\tprice_minor INTEGER NOT NULL, \n\tcurrency VARCHAR(3) NOT NULL, \n\timage VARCHAR(120) NOT NULL, \n\tcategory VARCHAR(40) NOT NULL, \n\tstatus VARCHAR(24) NOT NULL, \n\ttags JSONB NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tCHECK (price_minor >= 0), \n\tFOREIGN KEY(shop_id) REFERENCES shops (id), \n\tUNIQUE (slug)\n)"
    )
    op.execute("CREATE INDEX ix_products_public ON products (status, category, created_at)")
    op.execute("CREATE INDEX ix_products_shop_id ON products (shop_id)")
    op.execute(
        "CREATE TABLE shop_followers (\n\tuser_id VARCHAR(36) NOT NULL, \n\tshop_id VARCHAR(36) NOT NULL, \n\tPRIMARY KEY (user_id, shop_id), \n\tFOREIGN KEY(user_id) REFERENCES profiles (id), \n\tFOREIGN KEY(shop_id) REFERENCES shops (id)\n)"
    )
    op.execute("CREATE INDEX ix_shop_followers_shop_id ON shop_followers (shop_id)")
    op.execute(
        "CREATE TABLE storefront_drafts (\n\tshop_id VARCHAR(36) NOT NULL, \n\tdocument JSONB NOT NULL, \n\trevision INTEGER NOT NULL, \n\tupdated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (shop_id), \n\tFOREIGN KEY(shop_id) REFERENCES shops (id)\n)"
    )
    op.execute(
        "CREATE TABLE storefront_versions (\n\tshop_id VARCHAR(36) NOT NULL, \n\tversion_no INTEGER NOT NULL, \n\tdocument JSONB NOT NULL, \n\tchecksum VARCHAR(64) NOT NULL, \n\tauthor_id VARCHAR(36) NOT NULL, \n\tnote VARCHAR(300) NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (shop_id, version_no), \n\tFOREIGN KEY(shop_id) REFERENCES shops (id), \n\tFOREIGN KEY(author_id) REFERENCES profiles (id)\n)"
    )
    op.execute("CREATE INDEX ix_storefront_versions_shop_id ON storefront_versions (shop_id)")
    op.execute(
        "CREATE TABLE product_favorites (\n\tuser_id VARCHAR(36) NOT NULL, \n\tproduct_id VARCHAR(36) NOT NULL, \n\tPRIMARY KEY (user_id, product_id), \n\tFOREIGN KEY(user_id) REFERENCES profiles (id), \n\tFOREIGN KEY(product_id) REFERENCES products (id)\n)"
    )
    op.execute("CREATE INDEX ix_product_favorites_product_id ON product_favorites (product_id)")
    op.execute(
        "CREATE TABLE product_variants (\n\tproduct_id VARCHAR(36) NOT NULL, \n\tsku VARCHAR(80) NOT NULL, \n\toptions JSONB NOT NULL, \n\tprice_minor INTEGER NOT NULL, \n\tstock INTEGER NOT NULL, \n\tid VARCHAR(36) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (product_id, sku), \n\tCHECK (stock >= 0), \n\tCHECK (price_minor >= 0), \n\tFOREIGN KEY(product_id) REFERENCES products (id)\n)"
    )
    op.execute("CREATE INDEX ix_product_variants_product_id ON product_variants (product_id)")
    op.execute(
        "CREATE TABLE shop_publications (\n\tshop_id VARCHAR(36) NOT NULL, \n\tversion_id VARCHAR(36) NOT NULL, \n\tPRIMARY KEY (shop_id), \n\tFOREIGN KEY(shop_id) REFERENCES shops (id), \n\tFOREIGN KEY(version_id) REFERENCES storefront_versions (id)\n)"
    )
    op.execute(
        "CREATE TABLE cart_items (\n\tuser_id VARCHAR(36) NOT NULL, \n\tvariant_id VARCHAR(36) NOT NULL, \n\tquantity INTEGER NOT NULL, \n\tPRIMARY KEY (user_id, variant_id), \n\tCHECK (quantity BETWEEN 1 AND 99), \n\tFOREIGN KEY(user_id) REFERENCES profiles (id), \n\tFOREIGN KEY(variant_id) REFERENCES product_variants (id)\n)"
    )


def downgrade() -> None:
    op.drop_table("cart_items")
    op.drop_table("shop_publications")
    op.drop_table("product_variants")
    op.drop_table("product_favorites")
    op.drop_table("storefront_versions")
    op.drop_table("storefront_drafts")
    op.drop_table("shop_followers")
    op.drop_table("products")
    op.drop_table("orders")
    op.drop_table("collections")
    op.drop_table("assets")
    op.drop_table("shops")
    op.drop_table("reports")
    op.drop_table("profiles")
    op.drop_table("payment_webhook_events")
    op.drop_table("audit_logs")
