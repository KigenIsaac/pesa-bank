package co.ke.pesabank.payee.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payees")
@Getter
@Setter
public class Payee extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PayeeCategory category;

    @Column(nullable = false)
    private String accountNumber;
}