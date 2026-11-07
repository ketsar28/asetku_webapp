# ERD AsetKu

Diagram dapat dilihat di VS Code (ekstensi *Markdown Preview Mermaid Support*), GitHub, atau mermaid.live.

```mermaid
erDiagram
  departments ||--o{ users : memiliki
  categories ||--o{ assets : mengelompokkan
  users ||--o{ loan_requests : mengajukan
  assets ||--o{ loan_requests : disewa
  assets ||--o{ asset_logs : riwayat
  assets ||--o{ maintenance_records : perawatan
  assets ||--o{ stock_opname_items : diperiksa
  stock_opnames ||--o{ stock_opname_items : berisi
  employees ||--o{ payrolls : menerima
  users ||--o{ wallet_transactions : dompet
  users ||--o{ notifications : menerima
  users ||--o{ password_resets : meminta

  users { int id PK string email string role decimal wallet_balance string pin_hash }
  departments { int id PK string name string code }
  categories { int id PK string name }
  assets { int id PK string asset_code UK string name string condition string status decimal rental_rate string rental_unit decimal purchase_cost text specs }
  loan_requests { int id PK string request_number UK date start_date date expected_return_date string status decimal rental_fee decimal vat_amount decimal total_amount string payment_status string group_no string extension_of }
  asset_logs { int id PK string action_type text description }
  maintenance_records { int id PK date maintenance_date decimal cost string status }
  transactions { int id PK string type string category decimal amount string source string ref_no string payment_method datetime tx_date datetime voided_at string approval }
  employees { int id PK string employee_no UK string position decimal base_salary int kpi_score }
  payrolls { int id PK string slip_no UK string period decimal net string status }
  wallet_transactions { int id PK string type decimal amount string status }
  notifications { int id PK string title boolean read }
  period_closes { int id PK string period UK }
  audit_logs { int id PK string action text detail }
  budgets { int id PK string period string category decimal amount }
  reconciliations { int id PK string channel decimal book_balance decimal actual_balance decimal diff }
  stock_opnames { int id PK string name string status }
  stock_opname_items { int id PK string status }
  password_resets { int id PK string token_hash UK datetime expires_at }
```

Catatan: tabel `transactions` (buku kas) mengacu secara logis ke aset (`asset_id`) dan nomor pesanan (`ref_no`) tanpa foreign key, supaya riwayat keuangan tidak ikut terhapus bila data operasional berubah.
