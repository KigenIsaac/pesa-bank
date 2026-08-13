package co.ke.pesabank.admin.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "bank_settings")
@Getter
@Setter
public class BankSettings extends BaseEntity {

    @Column(nullable = false)
    private String bankName = "Pesa Bank";

    private String supportEmail = "support@pesabank.co.ke";
    private String supportPhone = "+254 700 000 000";

    private int minPasswordLength = 8;
    private int sessionTimeoutMinutes = 30;
    private boolean enforce2FAForStaff = true;

    @Column(precision = 19, scale = 2)
    private BigDecimal dailyTransferLimit = new BigDecimal("500000");

    @Column(precision = 19, scale = 2)
    private BigDecimal maxCashWithdrawal = new BigDecimal("100000");

    private boolean maintenanceMode = false;
}