package co.ke.pesabank.teller.repo;

import co.ke.pesabank.teller.domain.ReversalRequest;
import co.ke.pesabank.teller.domain.ReversalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReversalRepository extends JpaRepository<ReversalRequest, UUID> {
    List<ReversalRequest> findAllByRequestedByOrderByCreatedAtDesc(UUID requestedBy);
    List<ReversalRequest> findAllByOrderByCreatedAtDesc();
    List<ReversalRequest> findAllByStatusOrderByCreatedAtAsc(ReversalStatus status);
    long countByStatus(ReversalStatus status);
}