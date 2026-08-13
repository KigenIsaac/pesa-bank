package co.ke.pesabank.teller.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tills", indexes = @Index(name = "idx_till_teller", columnList = "tellerId"))
@Getter
@Setter
public class Till extends BaseEntity {

    @Column(nullable = false)
    private UUID tellerId;

    @Column(nullable = false)
    private boolean open = false;

    private Instant openedAt;
    private Instant closedAt;

    @Column(precision = 19, scale = 2)
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(precision = 19, scale = 2)
    private BigDecimal deposits = BigDecimal.ZERO;

    @Column(precision = 19, scale = 2)
    private BigDecimal withdrawals = BigDecimal.ZERO;

    @Column(precision = 19, scale = 2)
    private BigDecimal transfersOut = BigDecimal.ZERO;

    @Column(precision = 19, scale = 2)
    private BigDecimal countedCash;

    @Column(precision = 19, scale = 2)
    private BigDecimal expectedCash;
}