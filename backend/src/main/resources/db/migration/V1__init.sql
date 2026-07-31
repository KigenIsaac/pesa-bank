CREATE TABLE users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL,
    balance NUMERIC(19,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_transaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    reference VARCHAR(50) NOT NULL UNIQUE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    type VARCHAR(20) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    balance_after NUMERIC(19,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    channel VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    performed_by UUID REFERENCES users(id),
    reversal_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_tx_account ON transactions(account_id);
CREATE INDEX idx_tx_reference ON transactions(reference);
CREATE INDEX idx_tx_created ON transactions(created_at DESC);
CREATE INDEX idx_tx_performed_by ON transactions(performed_by);

CREATE TABLE kyc_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    full_name VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(20),
    marital_status VARCHAR(20),
    nationality VARCHAR(50),
    id_type VARCHAR(20),
    id_number VARCHAR(50),
    id_issue_date DATE,
    id_expiry_date DATE,
    kra_pin VARCHAR(20),
    physical_address VARCHAR(255),
    town VARCHAR(100),
    county VARCHAR(100),
    postal_address VARCHAR(255),
    employment_status VARCHAR(30),
    employer_name VARCHAR(255),
    occupation VARCHAR(120),
    monthly_income VARCHAR(50),
    source_of_funds VARCHAR(50),
    account_purpose VARCHAR(30),
    account_purpose_other VARCHAR(255),
    nok_name VARCHAR(255),
    nok_relationship VARCHAR(50),
    nok_phone VARCHAR(30),
    pep BOOLEAN NOT NULL DEFAULT FALSE,
    pep_details VARCHAR(2000),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    reviewer_name VARCHAR(255),
    rejection_reason VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_kyc_status ON kyc_records(status);

CREATE TABLE tills (
    id UUID PRIMARY KEY,
    teller_id UUID NOT NULL REFERENCES users(id),
    open BOOLEAN NOT NULL DEFAULT FALSE,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    opening_balance NUMERIC(19,2) DEFAULT 0,
    deposits NUMERIC(19,2) DEFAULT 0,
    withdrawals NUMERIC(19,2) DEFAULT 0,
    transfers_out NUMERIC(19,2) DEFAULT 0,
    counted_cash NUMERIC(19,2),
    expected_cash NUMERIC(19,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_till_teller ON tills(teller_id);

CREATE TABLE reversal_requests (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    transaction_reference VARCHAR(50) NOT NULL,
    account_number VARCHAR(20),
    amount NUMERIC(19,2),
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_by_name VARCHAR(255),
    reason VARCHAR(2000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    decided_at TIMESTAMPTZ,
    decided_by UUID REFERENCES users(id),
    decided_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_reversal_status ON reversal_requests(status);

CREATE TABLE eod_reports (
    id UUID PRIMARY KEY,
    teller_id UUID NOT NULL REFERENCES users(id),
    teller_name VARCHAR(255),
    business_date TIMESTAMPTZ NOT NULL,
    opening_balance NUMERIC(19,2),
    deposits NUMERIC(19,2),
    withdrawals NUMERIC(19,2),
    expected_cash NUMERIC(19,2),
    counted_cash NUMERIC(19,2),
    variance NUMERIC(19,2),
    note VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE payees (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE payment_records (
    id UUID PRIMARY KEY,
    reference VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    payee_id UUID NOT NULL REFERENCES payees(id),
    account_ref VARCHAR(100),
    amount NUMERIC(19,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE audit_entries (
    id UUID PRIMARY KEY,
    actor_id UUID,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(30) NOT NULL,
    action VARCHAR(80) NOT NULL,
    target VARCHAR(255) NOT NULL,
    ip VARCHAR(64),
    details VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_audit_actor ON audit_entries(actor_id);
CREATE INDEX idx_audit_created ON audit_entries(created_at DESC);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    href VARCHAR(255),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_notif_user ON notifications(user_id);

CREATE TABLE tickets (
    id UUID PRIMARY KEY,
    reference VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(60) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    author_id UUID NOT NULL REFERENCES users(id),
    author VARCHAR(255) NOT NULL,
    body VARCHAR(4000) NOT NULL,
    from_staff BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_ticket_msg_ticket ON ticket_messages(ticket_id);

CREATE TABLE bank_settings (
    id UUID PRIMARY KEY,
    bank_name VARCHAR(120) NOT NULL DEFAULT 'Pesa Bank',
    support_email VARCHAR(255) DEFAULT 'support@pesabank.co.ke',
    support_phone VARCHAR(40) DEFAULT '+254 700 000 000',
    min_password_length INT NOT NULL DEFAULT 8,
    session_timeout_minutes INT NOT NULL DEFAULT 30,
    enforce2fa_for_staff BOOLEAN NOT NULL DEFAULT TRUE,
    daily_transfer_limit NUMERIC(19,2) NOT NULL DEFAULT 500000,
    max_cash_withdrawal NUMERIC(19,2) NOT NULL DEFAULT 100000,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE compliance_alerts (
    id UUID PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    detail VARCHAR(2000),
    related_transaction_id UUID,
    related_user_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);