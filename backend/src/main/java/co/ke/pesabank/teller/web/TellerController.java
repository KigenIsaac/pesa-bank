package co.ke.pesabank.teller.web;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.util.MoneyUtils;
import co.ke.pesabank.teller.service.TellerService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/teller")
@RequiredArgsConstructor
public class TellerController {

    private final TellerService service;
    private final AccountRepository accounts;
    private final UserRepository users;
    private final AuditService audit;

    @GetMapping("/dashboard/stats")
    public Map<String, Object> stats() {
        return service.dashboardStats(CurrentUser.get());
    }

    @GetMapping("/accounts/lookup")
    public Map<String, Object> lookup(@RequestParam("number") String number) {
        Account account = service.lookupAccount(number);
        Map<String, Object> body = new HashMap<>();
        body.put("accountId", account.getId());
        body.put("accountNumber", account.getAccountNumber());
        body.put("holderName", holderName(account.getUserId()));
        body.put("currency", account.getCurrency());
        body.put("balance", account.getBalance());
        body.put("status", account.getStatus().name());
        return body;
    }

    @GetMapping("/customers/search")
    public List<Map<String, Object>> search(@RequestParam("q") String query) {
        return service.searchCustomers(query);
    }

    @PostMapping("/deposit")
    public ResponseEntity<Map<String, Object>> deposit(@Valid @RequestBody CashRequest req) {
        User teller = CurrentUser.get();
        Transaction tx = service.deposit(teller, req.accountId(), MoneyUtils.scale(req.amount()), req.note());
        audit.record(teller, "TELLER_DEPOSIT", tx.getReference(), "Amount " + tx.getAmount());
        return ResponseEntity.ok(Map.of(
                "reference", tx.getReference(),
                "amount", tx.getAmount(),
                "status", tx.getStatus().name()));
    }

    @PostMapping("/withdrawal")
    public ResponseEntity<Map<String, Object>> withdraw(@Valid @RequestBody CashRequest req) {
        User teller = CurrentUser.get();
        Transaction tx = service.withdraw(teller, req.accountId(), MoneyUtils.scale(req.amount()), req.note());
        audit.record(teller, "TELLER_WITHDRAWAL", tx.getReference(), "Amount " + tx.getAmount());
        return ResponseEntity.ok(Map.of(
                "reference", tx.getReference(),
                "amount", tx.getAmount(),
                "status", tx.getStatus().name()));
    }

    @PostMapping("/transfer")
    public ResponseEntity<Map<String, Object>> transfer(@Valid @RequestBody TransferRequest req) {
        User teller = CurrentUser.get();
        Transaction tx = service.transfer(teller, req.fromAccountId(), req.toAccountNumber(),
                MoneyUtils.scale(req.amount()), req.note());
        audit.record(teller, "TELLER_TRANSFER", tx.getReference(), "Amount " + tx.getAmount());
        return ResponseEntity.ok(Map.of(
                "reference", tx.getReference(),
                "amount", tx.getAmount(),
                "status", tx.getStatus().name()));
    }

    @GetMapping("/transactions")
    public List<Map<String, Object>> transactions(
            @RequestParam(value = "date", required = false) String date,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "limit", defaultValue = "50") int limit) {

        User teller = CurrentUser.get();
        LocalDate day = date != null ? LocalDate.parse(date) : LocalDate.now(ZoneId.of("Africa/Nairobi"));
        Instant from = day.atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();

        List<Transaction> txs = service.todayTransactions(teller, from, to);

        return txs.stream()
                .filter(t -> type == null || type.isBlank() || "ALL".equalsIgnoreCase(type)
                        || t.getType().name().equalsIgnoreCase(type))
                .limit(Math.min(limit, 300))
                .map(t -> {
                    Account acc = accounts.findById(t.getAccountId()).orElse(null);
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", t.getId());
                    m.put("reference", t.getReference());
                    m.put("type", t.getType().name());
                    m.put("amount", t.getAmount());
                    m.put("currency", acc != null ? acc.getCurrency() : "KES");
                    m.put("description", t.getDescription());
                    m.put("note", t.getDescription());
                    m.put("createdAt", t.getCreatedAt());
                    m.put("customerName", acc != null ? holderName(acc.getUserId()) : "—");
                    m.put("accountNumber", acc != null ? acc.getAccountNumber() : "—");
                    return m;
                })
                .toList();
    }

    private String holderName(UUID userId) {
        return users.findById(userId).map(User::getFullName).orElse("Customer");
    }

    public record CashRequest(
            @NotNull UUID accountId,
            @NotNull BigDecimal amount,
            String note) {}

    public record TransferRequest(
            @NotNull UUID fromAccountId,
            @NotNull String toAccountNumber,
            @NotNull BigDecimal amount,
            String note) {}
}