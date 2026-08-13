package co.ke.pesabank.teller.service;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.customer.service.TransactionService;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.shared.error.ApiException;
import co.ke.pesabank.shared.util.MoneyUtils;
import co.ke.pesabank.teller.domain.Till;
import co.ke.pesabank.teller.repo.TillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TellerService {

    private final UserRepository users;
    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final TransactionService txService;
    private final TillRepository tills;

    public Account lookupAccount(String number) {
        return accounts.findByAccountNumber(number)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "No account found with that number."));
    }

    public List<Map<String, Object>> searchCustomers(String query) {
        if (query == null || query.isBlank()) return List.of();
        String q = query.trim();

        // Match by phone, email, or account number
        List<User> matchedUsers = users.findAll().stream()
                .filter(u -> u.getRole().name().equals("CUSTOMER"))
                .filter(u -> q.equalsIgnoreCase(u.getPhone())
                        || q.equalsIgnoreCase(u.getEmail())
                        || u.getFullName().toLowerCase().contains(q.toLowerCase()))
                .toList();

        // Also match directly by account number
        Account byNumber = accounts.findByAccountNumber(q).orElse(null);

        java.util.Set<UUID> userIds = new java.util.HashSet<>();
        matchedUsers.forEach(u -> userIds.add(u.getId()));
        if (byNumber != null) userIds.add(byNumber.getUserId());

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (UUID id : userIds) {
            User u = users.findById(id).orElse(null);
            if (u == null) continue;

            List<Account> userAccounts = accounts.findAllByUserId(u.getId());
            List<Map<String, Object>> accountList = userAccounts.stream()
                    .map(a -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id", a.getId());
                        m.put("accountNumber", a.getAccountNumber());
                        m.put("type", a.getType().name());
                        m.put("balance", a.getBalance());
                        m.put("currency", a.getCurrency());
                        m.put("status", a.getStatus().name());
                        return m;
                    })
                    .toList();

            Map<String, Object> row = new HashMap<>();
            row.put("customerId", u.getId());
            row.put("fullName", u.getFullName());
            row.put("email", u.getEmail());
            row.put("phone", u.getPhone());
            row.put("accounts", accountList);
            result.add(row);
        }

        return result;
    }

    @Transactional
    public Transaction deposit(User teller, UUID accountId, BigDecimal rawAmount, String note) {
        Till till = requireOpenTill(teller);
        Account account = accounts.findById(accountId)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));

        BigDecimal amount = MoneyUtils.scale(rawAmount);
        String description = (note != null && !note.isBlank())
                ? "Cash deposit · " + note
                : "Cash deposit";

        Transaction tx = txService.deposit(account, amount, description, teller.getId(), "TELLER");

        till.setDeposits(till.getDeposits().add(amount));
        tills.save(till);

        return tx;
    }

    @Transactional
    public Transaction withdraw(User teller, UUID accountId, BigDecimal rawAmount, String note) {
        Till till = requireOpenTill(teller);
        Account account = accounts.findById(accountId)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));

        BigDecimal amount = MoneyUtils.scale(rawAmount);

        // Check till cash position — cannot pay out more than you have
        BigDecimal available = expectedCash(till);
        if (available.compareTo(amount) < 0) {
            throw ApiException.badRequest("TILL_INSUFFICIENT_CASH",
                    "Your till doesn't have enough cash for this withdrawal.");
        }

        String description = (note != null && !note.isBlank())
                ? "Cash withdrawal · " + note
                : "Cash withdrawal";

        Transaction tx = txService.withdraw(account, amount, description, teller.getId(), "TELLER");

        till.setWithdrawals(till.getWithdrawals().add(amount));
        tills.save(till);

        return tx;
    }

    @Transactional
    public Transaction transfer(User teller, UUID fromAccountId, String toAccountNumber,
                                BigDecimal rawAmount, String note) {
        requireOpenTill(teller);

        Account from = accounts.findById(fromAccountId)
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Source account not found."));
        Account to = accounts.findByAccountNumber(toAccountNumber)
                .orElseThrow(() -> ApiException.notFound("DESTINATION_NOT_FOUND", "Destination account not found."));

        if (from.getId().equals(to.getId())) {
            throw ApiException.badRequest("SAME_ACCOUNT", "Source and destination cannot be the same.");
        }

        BigDecimal amount = MoneyUtils.scale(rawAmount);
        String description = (note != null && !note.isBlank())
                ? "Teller transfer · " + note
                : "Teller transfer to " + to.getAccountNumber();

        return txService.transfer(from, to, amount, description, teller.getId(), "TELLER");
    }

    public Map<String, Object> dashboardStats(User teller) {
        Till till = tills.findByTellerIdAndOpenTrue(teller.getId()).orElse(null);

        Instant dayStart = LocalDate.now(ZoneId.of("Africa/Nairobi"))
                .atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();
        Instant dayEnd = LocalDate.now(ZoneId.of("Africa/Nairobi"))
                .plusDays(1).atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();

        List<Transaction> today = transactions
                .findAllByPerformedByAndCreatedAtBetweenOrderByCreatedAtDesc(teller.getId(), dayStart, dayEnd);

        BigDecimal deposits = today.stream()
                .filter(t -> t.getType() == co.ke.pesabank.customer.domain.TransactionType.DEPOSIT)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal withdrawals = today.stream()
                .filter(t -> t.getType() == co.ke.pesabank.customer.domain.TransactionType.WITHDRAWAL)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> body = new HashMap<>();
        body.put("tillBalance", till != null ? expectedCash(till) : BigDecimal.ZERO);
        body.put("depositsToday", deposits);
        body.put("withdrawalsToday", withdrawals);
        body.put("transactionsToday", today.size());
        body.put("pendingReversals", 0);
        return body;
    }

    public List<Transaction> todayTransactions(User teller, Instant from, Instant to) {
        return transactions.findAllByPerformedByAndCreatedAtBetweenOrderByCreatedAtDesc(teller.getId(), from, to);
    }

    private Till requireOpenTill(User teller) {
        return tills.findByTellerIdAndOpenTrue(teller.getId())
                .orElseThrow(() -> ApiException.badRequest("TILL_NOT_OPEN",
                        "Open your till before processing transactions."));
    }

    private BigDecimal expectedCash(Till till) {
        BigDecimal opening = till.getOpeningBalance() == null ? BigDecimal.ZERO : till.getOpeningBalance();
        BigDecimal dep = till.getDeposits() == null ? BigDecimal.ZERO : till.getDeposits();
        BigDecimal wd = till.getWithdrawals() == null ? BigDecimal.ZERO : till.getWithdrawals();
        return opening.add(dep).subtract(wd);
    }
}