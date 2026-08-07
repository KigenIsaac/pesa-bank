package co.ke.pesabank.shared.audit;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditRepository extends JpaRepository<AuditEntry, UUID> {
    List<AuditEntry> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<AuditEntry> findAllByActorIdOrderByCreatedAtDesc(UUID actorId, Pageable pageable);
}