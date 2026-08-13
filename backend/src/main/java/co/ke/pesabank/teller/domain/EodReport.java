package co.ke.pesabank.teller.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "eod_reports")
@Getter
@Setter
public class EodReport extends BaseEntity {

    @Column(nullable = false)
    private UUID tellerId;

    private String tellerName;

    @Column(nullable = false)
    private Instant businessDate;

    @Column(precision = 19, scale = 2)
    private BigDecimal openingBalance;

    @Column(precision = 19, scale = 2)
    private BigDecimal deposits;

    @Column(precision = 19, scale = 2)
    private BigDecimal withdrawals;

    @Column(precision = 19, scale = 2)
    private BigDecimal expectedCash;

    @Column(precision = 19, scale = 2)
    private BigDecimal countedCash;

    @Column(precision = 19, scale = 2)
    private BigDecimal variance;

    @Column(length = 2000)
    private String note;
}