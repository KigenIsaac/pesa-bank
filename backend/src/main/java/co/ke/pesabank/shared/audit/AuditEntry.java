package co.ke.pesabank.shared.audit;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "audit_entries", indexes = {
        @Index(name = "idx_audit_actor", columnList = "actorId"),
        @Index(name = "idx_audit_created", columnList = "createdAt")
})
@Getter
@Setter
public class AuditEntry extends BaseEntity {

    @Column(nullable = false)
    private UUID actorId;

    @Column(nullable = false)
    private String actorName;

    @Column(nullable = false)
    private String actorRole;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String target;

    private String ip;

    @Column(length = 2000)
    private String details;
}