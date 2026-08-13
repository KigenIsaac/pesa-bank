package co.ke.pesabank.teller.repo;

import co.ke.pesabank.teller.domain.Till;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TillRepository extends JpaRepository<Till, UUID> {
    Optional<Till> findByTellerIdAndOpenTrue(UUID tellerId);
    Optional<Till> findFirstByTellerIdOrderByCreatedAtDesc(UUID tellerId);
}