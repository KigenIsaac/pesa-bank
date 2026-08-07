package co.ke.pesabank.customer.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "transactions", indexes = {
        @Index(name = "idx_tx_account", columnList = "accountId"),
        @Index(name = "idx_tx_reference", columnList = "reference"),
        @Index(name = "idx_tx_created", columnList = "createdAt")
})
@Getter
@Setter
public class Transaction extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(nullable = false)
    private UUID accountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balanceAfter;

    @Column(nullable = false)
    private String description;

    private String channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status = TransactionStatus.COMPLETED;

    private UUID performedBy;
    private String reversalReason;
}