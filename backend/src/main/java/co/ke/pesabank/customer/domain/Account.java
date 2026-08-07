package co.ke.pesabank.customer.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "accounts", indexes = {
        @Index(name = "idx_account_user", columnList = "userId"),
        @Index(name = "idx_account_number", columnList = "accountNumber")
})
@Getter
@Setter
public class Account extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String accountNumber;

    @Column(nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountType type;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(nullable = false)
    private String currency = "KES";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountStatus status = AccountStatus.ACTIVE;

    private Instant openedAt = Instant.now();
    private Instant lastTransactionAt;
}