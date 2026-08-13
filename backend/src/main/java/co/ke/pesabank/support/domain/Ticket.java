package co.ke.pesabank.support.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "tickets")
@Getter
@Setter
public class Ticket extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketPriority priority = TicketPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status = TicketStatus.OPEN;
}