package co.ke.pesabank.customer.repo;

import co.ke.pesabank.customer.domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {
    List<Account> findAllByUserId(UUID userId);
    Optional<Account> findByAccountNumber(String accountNumber);
    Optional<Account> findByAccountNumberAndUserId(String accountNumber, UUID userId);
    long countByStatus(co.ke.pesabank.customer.domain.AccountStatus status);
}