package co.ke.pesabank.teller.repo;

import co.ke.pesabank.teller.domain.EodReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EodRepository extends JpaRepository<EodReport, UUID> {
    Optional<EodReport> findByTellerIdAndBusinessDateBetween(UUID tellerId, Instant from, Instant to);
}