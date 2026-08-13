package co.ke.pesabank.support.repo;

import co.ke.pesabank.support.domain.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    List<Ticket> findAllByUserIdOrderByUpdatedAtDescCreatedAtDesc(UUID userId);
    List<Ticket> findAllByOrderByCreatedAtDesc();
}