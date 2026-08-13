package co.ke.pesabank.support.domain;

import co.ke.pesabank.shared.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "ticket_messages")
@Getter
@Setter
public class TicketMessage extends BaseEntity {

    @Column(nullable = false)
    private UUID ticketId;

    @Column(nullable = false)
    private UUID authorId;

    @Column(nullable = false)
    private String author;

    @Column(nullable = false, length = 4000)
    private String body;

    @Column(nullable = false)
    private boolean fromStaff;
}