package co.ke.pesabank.support.repo;

import co.ke.pesabank.support.domain.TicketMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TicketMessageRepository extends JpaRepository<TicketMessage, UUID> {
    List<TicketMessage> findAllByTicketIdOrderByCreatedAtAsc(UUID ticketId);
}