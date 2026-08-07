package co.ke.pesabank.kyc.repo;

import co.ke.pesabank.kyc.domain.KycRecord;
import co.ke.pesabank.kyc.domain.KycStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface KycRepository extends JpaRepository<KycRecord, UUID> {
    Optional<KycRecord> findByUserId(UUID userId);
    List<KycRecord> findAllByOrderBySubmittedAtDesc();
    List<KycRecord> findAllByStatusOrderBySubmittedAtAsc(KycStatus status);
    long countByStatus(KycStatus status);
}