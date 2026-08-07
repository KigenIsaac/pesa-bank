package co.ke.pesabank.payee.repo;

import co.ke.pesabank.payee.domain.PaymentRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, UUID> {}