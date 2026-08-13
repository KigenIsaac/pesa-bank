package co.ke.pesabank.admin.web;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.AccountStatus;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.error.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
public class AdminAccountController {

    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final UserRepository users;
    private final AuditService audit;

    @GetMapping
    public List<Map<String, Object>> list() {
        return accounts.findAll().stream().map(this::row).toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id) {
        Account account = accounts.findById(id)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));
        Map<String, Object> row = new HashMap<>(row(account));
        User holder = users.findById(account.getUserId()).orElse(null);
        if (holder != null) {
            row.put("holderId", holder.getId());
            row.put("holderEmail", holder.getEmail());
        }
        return row;
    }

    @GetMapping("/{id}/transactions")
    public List<Map<String, Object>> txList(@PathVariable UUID id,
                                            @RequestParam(defaultValue = "20") int limit) {
        Account account = accounts.findById(id)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));
        return transactions.findAllByAccountIdOrderByCreatedAtDesc(id, PageRequest.of(0, Math.min(limit, 200)))
                .stream()
                .map(t -> txRow(t, account))
                .toList();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable UUID id,
                                                            @RequestBody StatusRequest req) {
        User actor = CurrentUser.get();
        Account account = accounts.findById(id)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));
        account.setStatus(req.status());
        accounts.save(account);
        audit.record(actor, "ACCOUNT_" + req.status().name(), account.getAccountNumber(), null);
        return ResponseEntity.ok(Map.of("status", account.getStatus().name()));
    }

    private Map<String, Object> row(Account a) {
        User holder = users.findById(a.getUserId()).orElse(null);
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.getId());
        m.put("accountNumber", a.getAccountNumber());
        m.put("holderName", holder != null ? holder.getFullName() : "—");
        m.put("holderId", a.getUserId());
        m.put("type", a.getType().name());
        m.put("balance", a.getBalance());
        m.put("currency", a.getCurrency());
        m.put("status", a.getStatus().name());
        m.put("openedAt", a.getOpenedAt());
        m.put("lastTransactionAt", a.getLastTransactionAt());
        return m;
    }

    private Map<String, Object> txRow(Transaction t, Account a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", t.getId());
        m.put("type", t.getType().name());
        m.put("amount", t.getAmount());
        m.put("balanceAfter", t.getBalanceAfter());
        m.put("description", t.getDescription());
        m.put("createdAt", t.getCreatedAt());
        return m;
    }

    public record StatusRequest(AccountStatus status) {}
}