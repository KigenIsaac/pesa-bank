package co.ke.pesabank.payee.repo;

import co.ke.pesabank.payee.domain.Payee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PayeeRepository extends JpaRepository<Payee, UUID> {}