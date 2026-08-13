package co.ke.pesabank.teller.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reversal_requests")
@Getter
@Setter
public class ReversalRequest extends BaseEntity {

    @Column(nullable = false)
    private UUID transactionId;

    @Column(nullable = false)
    private String transactionReference;

    private String accountNumber;

    @Column(precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private UUID requestedBy;

    private String requestedByName;

    @Column(nullable = false, length = 2000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReversalStatus status = ReversalStatus.PENDING;

    private Instant decidedAt;
    private UUID decidedBy;
    private String decidedByName;
}