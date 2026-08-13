package co.ke.pesabank.admin.service;

import co.ke.pesabank.admin.repo.ComplianceAlertRepository;
import co.ke.pesabank.customer.domain.AccountStatus;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.domain.TransactionType;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.kyc.domain.KycStatus;
import co.ke.pesabank.kyc.repo.KycRepository;
import co.ke.pesabank.security.domain.Role;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.teller.domain.ReversalStatus;
import co.ke.pesabank.teller.repo.ReversalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final UserRepository users;
    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final KycRepository kyc;
    private final ReversalRepository reversals;
    private final ComplianceAlertRepository alerts;

    public Map<String, Object> stats() {
        Instant dayStart = LocalDate.now(ZoneId.of("Africa/Nairobi"))
                .atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();
        Instant dayEnd = LocalDate.now(ZoneId.of("Africa/Nairobi"))
                .plusDays(1).atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();

        List<Transaction> today = transactions.findAllByCreatedAtBetweenOrderByCreatedAtAsc(dayStart, dayEnd);

        BigDecimal deposits = BigDecimal.ZERO;
        BigDecimal withdrawals = BigDecimal.ZERO;
        for (Transaction t : today) {
            if (t.getType() == TransactionType.DEPOSIT) deposits = deposits.add(t.getAmount());
            else if (t.getType() == TransactionType.WITHDRAWAL) withdrawals = withdrawals.add(t.getAmount());
        }

        Map<String, Object> body = new HashMap<>();
        body.put("totalCustomers", users.countByRole(Role.CUSTOMER));
        body.put("activeAccounts", accounts.countByStatus(AccountStatus.ACTIVE));
        body.put("pendingKyc", kyc.countByStatus(KycStatus.PENDING));
        body.put("pendingReversals", reversals.countByStatus(ReversalStatus.PENDING));
        body.put("todayDeposits", deposits);
        body.put("todayWithdrawals", withdrawals);
        body.put("totalBalance", accounts.findAll().stream()
                .map(a -> a.getBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        body.put("activeTellers", users.countByRole(Role.TELLER));
        return body;
    }

    public List<Map<String, Object>> activity() {
        List<Map<String, Object>> list = new ArrayList<>();

        // Recent transactions
        for (Transaction t : transactions.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 6))) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("type", "TRANSACTION");
            m.put("title", t.getType().name() + " · " + t.getAmount());
            m.put("detail", t.getReference() + " — " + t.getDescription());
            m.put("createdAt", t.getCreatedAt());
            list.add(m);
        }

        list.sort((a, b) -> ((Instant) b.get("createdAt")).compareTo((Instant) a.get("createdAt")));
        return list.stream().limit(10).toList();
    }
}