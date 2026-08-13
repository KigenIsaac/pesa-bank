package co.ke.pesabank.admin.repo;

import co.ke.pesabank.admin.domain.ComplianceAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ComplianceAlertRepository extends JpaRepository<ComplianceAlert, UUID> {
    List<ComplianceAlert> findAllByOrderByCreatedAtDesc();
}