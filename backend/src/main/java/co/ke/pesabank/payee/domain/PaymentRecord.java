package co.ke.pesabank.payee.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "payment_records")
@Getter
@Setter
public class PaymentRecord extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private UUID accountId;

    @Column(nullable = false)
    private UUID payeeId;

    private String accountRef;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;
}