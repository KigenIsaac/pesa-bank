package co.ke.pesabank.admin.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "compliance_alerts")
@Getter
@Setter
public class ComplianceAlert extends BaseEntity {

    public enum AlertType { AML, PEP, SANCTIONS, STRUCTURING }
    public enum Severity { LOW, MEDIUM, HIGH }
    public enum AlertStatus { OPEN, INVESTIGATING, RESOLVED, DISMISSED }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String detail;

    private UUID relatedTransactionId;
    private UUID relatedUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertStatus status = AlertStatus.OPEN;
}