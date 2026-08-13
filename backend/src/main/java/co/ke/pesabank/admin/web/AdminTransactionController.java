package co.ke.pesabank.admin.web;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.domain.TransactionStatus;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.customer.service.TransactionService;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.error.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/transactions")
@RequiredArgsConstructor
public class AdminTransactionController {

    private final TransactionRepository transactions;
    private final AccountRepository accounts;
    private final UserRepository users;
    private final TransactionService txService;
    private final AuditService audit;

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "100") int limit) {
        return transactions.findAllByOrderByCreatedAtDesc(PageRequest.of(0, Math.min(limit, 300)))
                .stream().map(this::row).toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id) {
        Transaction t = transactions.findById(id)
                .orElseThrow(() -> ApiException.notFound("TXN_NOT_FOUND", "Transaction not found."));
        Map<String, Object> m = new HashMap<>(row(t));
        Account a = accounts.findById(t.getAccountId()).orElse(null);
        if (a != null) {
            m.put("accountId", a.getId());
            m.put("accountNumber", a.getAccountNumber());
            m.put("holderId", a.getUserId());
            m.put("holderName", users.findById(a.getUserId()).map(User::getFullName).orElse("—"));
        }
        m.put("balanceAfter", t.getBalanceAfter());
        m.put("channel", t.getChannel() != null ? t.getChannel() : "—");
        m.put("performedBy", t.getPerformedBy() != null
                ? users.findById(t.getPerformedBy()).map(User::getFullName).orElse("—")
                : "—");
        m.put("reversalReason", t.getReversalReason() != null ? t.getReversalReason() : "");
        return m;
    }

    @PostMapping("/{id}/reverse")
    public ResponseEntity<Map<String, Object>> reverse(@PathVariable UUID id,
                                                       @Valid @RequestBody ReverseRequest req) {
        User admin = CurrentUser.get();
        Transaction original = transactions.findById(id)
                .orElseThrow(() -> ApiException.notFound("TXN_NOT_FOUND", "Transaction not found."));

        Transaction reversed = txService.reverse(original, req.reason(), admin.getId());
        audit.record(admin, "TRANSACTION_REVERSED", original.getReference(), req.reason());

        return ResponseEntity.ok(Map.of(
                "status", TransactionStatus.REVERSED.name(),
                "reference", original.getReference(),
                "reversalReference", reversed.getReference()));
    }

    private Map<String, Object> row(Transaction t) {
        Account a = accounts.findById(t.getAccountId()).orElse(null);
        Map<String, Object> m = new HashMap<>();
        m.put("id", t.getId());
        m.put("reference", t.getReference());
        m.put("accountNumber", a != null ? a.getAccountNumber() : "—");
        m.put("holderName", a != null
                ? users.findById(a.getUserId()).map(User::getFullName).orElse("—")
                : "—");
        m.put("type", t.getType().name());
        m.put("amount", t.getAmount());
        m.put("currency", a != null ? a.getCurrency() : "KES");
        m.put("status", t.getStatus().name());
        m.put("createdAt", t.getCreatedAt());
        return m;
    }

    public record ReverseRequest(@NotBlank String reason) {}
}