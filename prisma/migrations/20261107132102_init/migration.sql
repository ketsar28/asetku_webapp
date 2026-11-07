-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `departments_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'staff', 'finance', 'user', 'employee') NOT NULL DEFAULT 'user',
    `phone` VARCHAR(30) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `wallet_balance` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `pin_hash` VARCHAR(191) NULL,
    `pin_failed` INTEGER NOT NULL DEFAULT 0,
    `pin_locked_until` DATETIME(3) NULL,
    `department_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `employee_id` INTEGER NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_employee_id_key`(`employee_id`),
    INDEX `users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category_id` INTEGER NOT NULL,
    `brand` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `serial_number` VARCHAR(191) NULL,
    `image_url` TEXT NULL,
    `condition` ENUM('good', 'damaged', 'maintenance') NOT NULL DEFAULT 'good',
    `status` ENUM('available', 'borrowed', 'disposed', 'sold') NOT NULL DEFAULT 'available',
    `location` VARCHAR(191) NULL,
    `purchase_date` DATETIME(3) NULL,
    `purchase_cost` DECIMAL(14, 2) NULL,
    `rental_rate` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `rental_unit` VARCHAR(10) NOT NULL DEFAULT 'day',
    `sale_price` DECIMAL(14, 2) NULL,
    `sold_at` DATETIME(3) NULL,
    `description` TEXT NULL,
    `specs` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assets_asset_code_key`(`asset_code`),
    INDEX `assets_status_condition_idx`(`status`, `condition`),
    INDEX `assets_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `action_type` ENUM('created', 'updated', 'condition_change', 'maintenance') NOT NULL,
    `description` TEXT NOT NULL,
    `performed_by` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `asset_logs_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_number` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `asset_id` INTEGER NOT NULL,
    `request_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `start_date` DATETIME(3) NOT NULL,
    `expected_return_date` DATETIME(3) NOT NULL,
    `actual_return_date` DATETIME(3) NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'on_loan', 'returned', 'overdue') NOT NULL DEFAULT 'pending',
    `purpose` TEXT NOT NULL,
    `admin_note` TEXT NULL,
    `fine_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `rental_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `insurance` BOOLEAN NOT NULL DEFAULT false,
    `insurance_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `vat_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `group_no` VARCHAR(40) NULL,
    `payment_status` VARCHAR(10) NOT NULL DEFAULT 'unpaid',
    `paid_at` DATETIME(3) NULL,
    `payment_order_id` VARCHAR(80) NULL,
    `proof_url` VARCHAR(255) NULL,
    `terms_accepted_at` DATETIME(3) NULL,
    `extension_of` VARCHAR(40) NULL,
    `damage_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(12) NOT NULL DEFAULT 'cash',
    `bank_name` VARCHAR(60) NULL,
    `account_name` VARCHAR(100) NULL,
    `account_no` VARCHAR(40) NULL,
    `approved_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loan_requests_request_number_key`(`request_number`),
    INDEX `loan_requests_user_id_idx`(`user_id`),
    INDEX `loan_requests_asset_id_idx`(`asset_id`),
    INDEX `loan_requests_status_expected_return_date_idx`(`status`, `expected_return_date`),
    INDEX `loan_requests_payment_order_id_idx`(`payment_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `maintenance_date` DATETIME(3) NOT NULL,
    `completion_date` DATETIME(3) NULL,
    `cost` DECIMAL(14, 2) NULL,
    `description` TEXT NOT NULL,
    `vendor` VARCHAR(191) NULL,
    `status` ENUM('scheduled', 'in_progress', 'completed') NOT NULL DEFAULT 'scheduled',

    INDEX `maintenance_records_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('income', 'expense') NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `description` TEXT NOT NULL,
    `tx_date` DATETIME(3) NOT NULL,
    `source` VARCHAR(20) NOT NULL DEFAULT 'manual',
    `asset_id` INTEGER NULL,
    `ref_no` VARCHAR(60) NULL,
    `payment_method` VARCHAR(12) NOT NULL DEFAULT 'cash',
    `bank_name` VARCHAR(60) NULL,
    `account_name` VARCHAR(100) NULL,
    `account_no` VARCHAR(40) NULL,
    `created_by` INTEGER NOT NULL,
    `created_by_name` VARCHAR(120) NOT NULL,
    `voided_at` DATETIME(3) NULL,
    `void_reason` VARCHAR(255) NULL,
    `approval` VARCHAR(10) NOT NULL DEFAULT 'approved',
    `attachment_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transactions_tx_date_idx`(`tx_date`),
    INDEX `transactions_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `body` TEXT NOT NULL,
    `link` VARCHAR(120) NULL,
    `ref` VARCHAR(80) NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `notifications_ref_key`(`ref`),
    INDEX `notifications_user_id_read_at_idx`(`user_id`, `read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_no` VARCHAR(20) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `position` VARCHAR(40) NOT NULL,
    `gender` VARCHAR(1) NOT NULL DEFAULT 'L',
    `birth_date` DATETIME(3) NULL,
    `nik` VARCHAR(20) NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(120) NULL,
    `address` TEXT NULL,
    `join_date` DATETIME(3) NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'active',
    `base_salary` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `allowance` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `kpi_score` INTEGER NOT NULL DEFAULT 80,
    `kpi_note` VARCHAR(255) NULL,
    `bank_name` VARCHAR(60) NULL,
    `account_name` VARCHAR(100) NULL,
    `account_no` VARCHAR(40) NULL,
    `photo_url` VARCHAR(255) NULL,
    `id_photo_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `employees_employee_no_key`(`employee_no`),
    INDEX `employees_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payrolls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slip_no` VARCHAR(40) NOT NULL,
    `employee_id` INTEGER NOT NULL,
    `period` VARCHAR(7) NOT NULL,
    `base_salary` DECIMAL(14, 2) NOT NULL,
    `allowance` DECIMAL(14, 2) NOT NULL,
    `kpi_score` INTEGER NOT NULL,
    `kpi_bonus` DECIMAL(14, 2) NOT NULL,
    `overtime` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `bpjs` DECIMAL(14, 2) NOT NULL,
    `other_deduction` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `net` DECIMAL(14, 2) NOT NULL,
    `note` VARCHAR(255) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'draft',
    `paid_at` DATETIME(3) NULL,
    `payment_method` VARCHAR(12) NULL,
    `bank_name` VARCHAR(60) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payrolls_slip_no_key`(`slip_no`),
    INDEX `payrolls_period_idx`(`period`),
    UNIQUE INDEX `payrolls_employee_id_period_key`(`employee_id`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(14) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `balance_after` DECIMAL(14, 2) NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'done',
    `description` VARCHAR(255) NOT NULL,
    `ref_no` VARCHAR(60) NULL,
    `bank_name` VARCHAR(60) NULL,
    `account_name` VARCHAR(100) NULL,
    `account_no` VARCHAR(40) NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,

    INDEX `wallet_transactions_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `wallet_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `period_closes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `period` VARCHAR(7) NOT NULL,
    `closed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_by` INTEGER NOT NULL,
    `closed_by_name` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `period_closes_period_key`(`period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `user_name` VARCHAR(120) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `entity` VARCHAR(30) NOT NULL,
    `entity_id` VARCHAR(40) NULL,
    `detail` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_created_at_idx`(`created_at`),
    INDEX `audit_logs_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `period` VARCHAR(7) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,

    UNIQUE INDEX `budgets_period_category_key`(`period`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reconciliations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `channel` VARCHAR(12) NOT NULL,
    `bank` VARCHAR(60) NOT NULL DEFAULT '',
    `as_of` DATETIME(3) NOT NULL,
    `book_balance` DECIMAL(14, 2) NOT NULL,
    `actual_balance` DECIMAL(14, 2) NOT NULL,
    `diff` DECIMAL(14, 2) NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_by_name` VARCHAR(120) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reconciliations_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_resets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_resets_token_hash_key`(`token_hash`),
    INDEX `password_resets_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_opnames` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'open',
    `created_by_name` VARCHAR(120) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_opname_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `opname_id` INTEGER NOT NULL,
    `asset_id` INTEGER NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'pending',
    `checked_at` DATETIME(3) NULL,
    `checked_by` VARCHAR(120) NULL,

    INDEX `stock_opname_items_opname_id_status_idx`(`opname_id`, `status`),
    UNIQUE INDEX `stock_opname_items_opname_id_asset_id_key`(`opname_id`, `asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_number` VARCHAR(191) NOT NULL,
    `group_no` VARCHAR(40) NULL,
    `user_id` INTEGER NOT NULL,
    `asset_id` INTEGER NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
    `purpose` TEXT NULL,
    `admin_note` TEXT NULL,
    `price` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `insurance` BOOLEAN NOT NULL DEFAULT false,
    `insurance_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `vat_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `payment_status` VARCHAR(10) NOT NULL DEFAULT 'unpaid',
    `paid_at` DATETIME(3) NULL,
    `payment_order_id` VARCHAR(80) NULL,
    `proof_url` VARCHAR(255) NULL,
    `payment_method` VARCHAR(12) NOT NULL DEFAULT 'cash',
    `bank_name` VARCHAR(60) NULL,
    `account_name` VARCHAR(100) NULL,
    `account_no` VARCHAR(40) NULL,
    `terms_accepted_at` DATETIME(3) NULL,
    `approved_by` INTEGER NULL,
    `handed_over_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchases_order_number_key`(`order_number`),
    INDEX `purchases_user_id_idx`(`user_id`),
    INDEX `purchases_asset_id_idx`(`asset_id`),
    INDEX `purchases_group_no_idx`(`group_no`),
    INDEX `purchases_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `overtime_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `work_date` DATE NOT NULL,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `hours` DECIMAL(5, 2) NOT NULL,
    `day_type` VARCHAR(10) NOT NULL DEFAULT 'workday',
    `activity` TEXT NOT NULL,
    `photo_url` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(10) NOT NULL DEFAULT 'pending',
    `admin_note` TEXT NULL,
    `reviewed_by` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `pay_period` VARCHAR(7) NULL,
    `payroll_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `overtime_requests_employee_id_work_date_idx`(`employee_id`, `work_date`),
    INDEX `overtime_requests_status_idx`(`status`),
    INDEX `overtime_requests_pay_period_idx`(`pay_period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reimbursements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `claim_no` VARCHAR(40) NOT NULL,
    `employee_id` INTEGER NOT NULL,
    `category` VARCHAR(60) NOT NULL,
    `expense_date` DATE NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `description` TEXT NOT NULL,
    `receipt_url` VARCHAR(255) NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'pending',
    `admin_note` TEXT NULL,
    `reviewed_by` INTEGER NULL,
    `paid_at` DATETIME(3) NULL,
    `payment_method` VARCHAR(12) NULL,
    `bank_name` VARCHAR(60) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `reimbursements_claim_no_key`(`claim_no`),
    INDEX `reimbursements_employee_id_idx`(`employee_id`),
    INDEX `reimbursements_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_logs` ADD CONSTRAINT `asset_logs_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_logs` ADD CONSTRAINT `asset_logs_performed_by_fkey` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_requests` ADD CONSTRAINT `loan_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_requests` ADD CONSTRAINT `loan_requests_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_requests` ADD CONSTRAINT `loan_requests_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_opname_items` ADD CONSTRAINT `stock_opname_items_opname_id_fkey` FOREIGN KEY (`opname_id`) REFERENCES `stock_opnames`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_opname_items` ADD CONSTRAINT `stock_opname_items_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overtime_requests` ADD CONSTRAINT `overtime_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reimbursements` ADD CONSTRAINT `reimbursements_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
