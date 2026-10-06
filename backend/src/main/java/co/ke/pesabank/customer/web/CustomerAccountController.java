package co.ke.pesabank.customer.web;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.customer.service.StatementService;
import co.ke.pesabank.customer.service.AccountService;
import co.ke.pesabank.customer.domain.AccountType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.error.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CustomerAccountController {

    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final StatementService statements;
    private final AccountService accountService;

    @PostMapping("/accounts")
    public ResponseEntity<AccountDto> openAccount(@Valid @RequestBody OpenAccountRequest request) {
        User user = CurrentUser.get();
        Account account = accountService.openAccount(user, request.type());
        return ResponseEntity.ok(AccountDto.from(account));
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        User user = CurrentUser.get();
        List<Account> list = accounts.findAllByUserId(user.getId());
        BigDecimal total = list.stream().map(Account::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> body = new HashMap<>();
        body.put("totalBalance", total);
        body.put("currency", "KES");
        body.put("accountsCount", list.size());
        return body;
    }

    @GetMapping("/accounts")
    public List<AccountDto> listAccounts() {
        User user = CurrentUser.get();
        return accounts.findAllByUserId(user.getId()).stream().map(AccountDto::from).toList();
    }

    @GetMapping("/accounts/{id}")
    public AccountDto getAccount(@PathVariable UUID id) {
        User user = CurrentUser.get();
        Account account = accounts.findById(id)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));
        if (!account.getUserId().equals(user.getId())) {
            throw ApiException.forbidden("NOT_YOUR_ACCOUNT", "You don't have access to this account.");
        }
        return AccountDto.from(account);
    }

    @GetMapping("/accounts/{id}/transactions")
    public List<TransactionDto> accountTransactions(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "20") int limit) {
        User user = CurrentUser.get();
        Account account = accounts.findById(id)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));
        if (!account.getUserId().equals(user.getId())) {
            throw ApiException.forbidden("NOT_YOUR_ACCOUNT", "You don't have access to this account.");
        }
        return transactions.findAllByAccountIdOrderByCreatedAtDesc(id, PageRequest.of(0, Math.min(limit, 200)))
                .stream().map(t -> TransactionDto.from(t, account)).toList();
    }

    @GetMapping("/transactions")
    public List<TransactionDto> recentTransactions(@RequestParam(defaultValue = "10") int limit) {
        User user = CurrentUser.get();
        List<Account> userAccounts = accounts.findAllByUserId(user.getId());
        if (userAccounts.isEmpty()) return List.of();
        Map<UUID, Account> byId = new HashMap<>();
        userAccounts.forEach(a -> byId.put(a.getId(), a));

        List<UUID> ids = userAccounts.stream().map(Account::getId).toList();
        return transactions.findAllByAccountIdInOrderByCreatedAtDesc(ids, PageRequest.of(0, Math.min(limit, 100)))
                .stream()
                .map(t -> TransactionDto.from(t, byId.get(t.getAccountId())))
                .toList();
    }

    @GetMapping("/accounts/{id}/statement")
    public ResponseEntity<byte[]> statement(
            @PathVariable UUID id,
            @RequestParam("from") String fromStr,
            @RequestParam("to") String toStr,
            @RequestParam(defaultValue = "pdf") String format) {
        User user = CurrentUser.get();
        Account account = accounts.findById(id)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));
        if (!account.getUserId().equals(user.getId())) {
            throw ApiException.forbidden("NOT_YOUR_ACCOUNT", "You don't have access to this account.");
        }

        Instant from = LocalDate.parse(fromStr).atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();
        Instant to = LocalDate.parse(toStr).plusDays(1).atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();

        byte[] body;
        MediaType type;
        String filename;
        if ("csv".equalsIgnoreCase(format)) {
            body = statements.csv(account, from, to);
            type = MediaType.parseMediaType("text/csv");
            filename = "statement-" + account.getAccountNumber() + "-" + fromStr + "-to-" + toStr + ".csv";
        } else {
            body = statements.pdf(account, from, to);
            type = MediaType.APPLICATION_PDF;
            filename = "statement-" + account.getAccountNumber() + "-" + fromStr + "-to-" + toStr + ".pdf";
        }

        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(body);
    }

    public record OpenAccountRequest(@NotNull AccountType type) {}

    public record AccountDto(UUID id, String accountNumber, String type, BigDecimal balance,
                             String currency, String status, Instant openedAt) {
        static AccountDto from(Account a) {
            return new AccountDto(a.getId(), a.getAccountNumber(), a.getType().name(),
                    a.getBalance(), a.getCurrency(), a.getStatus().name(), a.getOpenedAt());
        }
    }

    public record TransactionDto(UUID id, String reference, String type, BigDecimal amount,
                                 BigDecimal balanceAfter, String description, String direction,
                                 Instant createdAt) {
        static TransactionDto from(Transaction t, Account owner) {
            String direction = switch (t.getType()) {
                case DEPOSIT -> "IN";
                case WITHDRAWAL, TRANSFER -> "OUT";
            };
            return new TransactionDto(t.getId(), t.getReference(), t.getType().name(),
                    t.getAmount(), t.getBalanceAfter(), t.getDescription(), direction, t.getCreatedAt());
        }
    }
}