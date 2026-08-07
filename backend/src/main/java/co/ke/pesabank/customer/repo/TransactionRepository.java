package co.ke.pesabank.customer.repo;

import co.ke.pesabank.customer.domain.Transaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findAllByAccountIdOrderByCreatedAtDesc(UUID accountId, Pageable pageable);
    List<Transaction> findAllByAccountIdAndCreatedAtBetweenOrderByCreatedAtAsc(UUID accountId, Instant from, Instant to);
    Optional<Transaction> findByReference(String reference);
    List<Transaction> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Transaction> findAllByPerformedByAndCreatedAtBetweenOrderByCreatedAtDesc(UUID performedBy, Instant from, Instant to);
    List<Transaction> findAllByCreatedAtBetweenOrderByCreatedAtAsc(Instant from, Instant to);
    List<Transaction> findAllByAccountIdInOrderByCreatedAtDesc(List<UUID> accountIds, Pageable pageable);
    long countByCreatedAtBetween(Instant from, Instant to);
}