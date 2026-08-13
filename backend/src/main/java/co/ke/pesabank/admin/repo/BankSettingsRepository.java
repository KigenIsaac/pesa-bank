package co.ke.pesabank.admin.repo;

import co.ke.pesabank.admin.domain.BankSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BankSettingsRepository extends JpaRepository<BankSettings, UUID> {}