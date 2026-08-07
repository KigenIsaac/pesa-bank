package co.ke.pesabank.payee.web;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.service.TransactionService;
import co.ke.pesabank.payee.domain.Payee;
import co.ke.pesabank.payee.domain.PaymentRecord;
import co.ke.pesabank.payee.repo.PayeeRepository;
import co.ke.pesabank.payee.repo.PaymentRecordRepository;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.error.ApiException;
import co.ke.pesabank.shared.util.MoneyUtils;
import co.ke.pesabank.shared.util.ReferenceGenerator;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CustomerPaymentController {

    private final AccountRepository accounts;
    private final PayeeRepository payees;
    private final PaymentRecordRepository payments;
    private final TransactionService transactions;
    private final ReferenceGenerator referenceGenerator;
    private final AuditService audit;

    @GetMapping("/payees")
    public List<PayeeDto> listPayees() {
        return payees.findAll().stream()
                .map(p -> new PayeeDto(p.getId(), p.getName(), p.getCategory().name(), p.getAccountNumber()))
                .toList();
    }

    @PostMapping("/payments")
    @Transactional
    public ResponseEntity<Map<String, Object>> pay(@Valid @RequestBody PaymentRequest req) {
        User user = CurrentUser.get();

        Account from = accounts.findById(req.fromAccountId())
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));
        if (!from.getUserId().equals(user.getId())) {
            throw ApiException.forbidden("NOT_YOUR_ACCOUNT", "You don't have access to that account.");
        }

        Payee payee = payees.findById(req.payeeId())
                .orElseThrow(() -> ApiException.notFound("PAYEE_NOT_FOUND", "Payee not found."));

        BigDecimal amount = MoneyUtils.scale(req.amount());
        String description = "Payment to " + payee.getName()
                + (req.accountRef() != null && !req.accountRef().isBlank()
                    ? " · " + req.accountRef() : "");

        Transaction tx = transactions.withdraw(from, amount, description, user.getId(), "CUSTOMER_APP");

        PaymentRecord record = new PaymentRecord();
        record.setReference(tx.getReference());
        record.setUserId(user.getId());
        record.setAccountId(from.getId());
        record.setPayeeId(payee.getId());
        record.setAmount(amount);
        record.setAccountRef(req.accountRef());
        payments.save(record);

        audit.record(user, "PAYMENT_MADE", tx.getReference(),
                "Paid " + payee.getName() + " " + amount);

        return ResponseEntity.ok(Map.of(
                "reference", tx.getReference(),
                "amount", amount,
                "status", tx.getStatus().name()));
    }

    public record PayeeDto(UUID id, String name, String category, String accountNumber) {}

    public record PaymentRequest(
            @NotNull UUID fromAccountId,
            @NotNull UUID payeeId,
            String accountRef,
            @NotNull BigDecimal amount) {}
}