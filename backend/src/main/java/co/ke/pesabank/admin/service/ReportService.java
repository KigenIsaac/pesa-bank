package co.ke.pesabank.admin.service;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.kyc.repo.KycRepository;
import co.ke.pesabank.security.repo.UserRepository;
import co.ke.pesabank.shared.error.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final TransactionRepository transactions;
    private final AccountRepository accounts;
    private final UserRepository users;
    private final KycRepository kyc;

    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            .withZone(ZoneId.of("Africa/Nairobi"));

    public byte[] generate(String reportId, String format, Instant from, Instant to) {
        String csv = switch (reportId) {
            case "daily-transactions" -> dailyTransactions(from, to);
            case "customer-balances" -> customerBalances();
            case "aml-transactions" -> aml();
            case "teller-activity" -> tellerActivity(from, to);
            case "kyc-summary" -> kycSummary(from, to);
            case "branch-summary" -> branchSummary();
            default -> throw ApiException.notFound("REPORT_NOT_FOUND", "Unknown report: " + reportId);
        };
        return csv.getBytes(StandardCharsets.UTF_8);
    }

    private String dailyTransactions(Instant from, Instant to) {
        StringBuilder sb = new StringBuilder("Reference,Date,Type,Amount,Description,Status\n");
        List<Transaction> txs = transactions.findAllByCreatedAtBetweenOrderByCreatedAtAsc(from, to);
        for (Transaction t : txs) {
            sb.append(t.getReference()).append(',')
              .append(DF.format(t.getCreatedAt())).append(',')
              .append(t.getType()).append(',')
              .append(t.getAmount()).append(',')
              .append(escape(t.getDescription())).append(',')
              .append(t.getStatus()).append('\n');
        }
        return sb.toString();
    }

    private String customerBalances() {
        StringBuilder sb = new StringBuilder("Account Number,Holder,Balance,Currency,Status\n");
        for (Account a : accounts.findAll()) {
            String holder = users.findById(a.getUserId()).map(u -> u.getFullName()).orElse("—");
            sb.append(a.getAccountNumber()).append(',')
              .append(escape(holder)).append(',')
              .append(a.getBalance()).append(',')
              .append(a.getCurrency()).append(',')
              .append(a.getStatus()).append('\n');
        }
        return sb.toString();
    }

    private String aml() {
        // Simple heuristic: single transactions above 1,000,000 KES.
        StringBuilder sb = new StringBuilder("Reference,Date,Amount,Account,Flag\n");
        for (Transaction t : transactions.findAll()) {
            if (t.getAmount().doubleValue() >= 1_000_000) {
                sb.append(t.getReference()).append(',')
                  .append(DF.format(t.getCreatedAt())).append(',')
                  .append(t.getAmount()).append(',')
                  .append(t.getAccountId()).append(',')
                  .append("HIGH_VALUE\n");
            }
        }
        return sb.toString();
    }

    private String tellerActivity(Instant from, Instant to) {
        StringBuilder sb = new StringBuilder("Teller,Date,Type,Amount,Reference\n");
        for (Transaction t : transactions.findAllByCreatedAtBetweenOrderByCreatedAtAsc(from, to)) {
            if (t.getPerformedBy() == null) continue;
            String name = users.findById(t.getPerformedBy()).map(u -> u.getFullName()).orElse("—");
            if (!users.findById(t.getPerformedBy()).map(u -> u.getRole().name()).orElse("").equals("TELLER")) {
                continue;
            }
            sb.append(escape(name)).append(',')
              .append(DF.format(t.getCreatedAt())).append(',')
              .append(t.getType()).append(',')
              .append(t.getAmount()).append(',')
              .append(t.getReference()).append('\n');
        }
        return sb.toString();
    }

    private String kycSummary(Instant from, Instant to) {
        StringBuilder sb = new StringBuilder("Record ID,Status,Full Name,Submitted\n");
        kyc.findAll().forEach(k -> sb.append(k.getId()).append(',')
                .append(k.getStatus()).append(',')
                .append(escape(k.getFullName())).append(',')
                .append(k.getSubmittedAt() != null ? DF.format(k.getSubmittedAt()) : "")
                .append('\n'));
        return sb.toString();
    }

    private String branchSummary() {
        StringBuilder sb = new StringBuilder("Branch,Accounts,Total Balance\n");
        sb.append("Head Office").append(',')
          .append(accounts.count()).append(',')
          .append(accounts.findAll().stream()
                  .map(Account::getBalance)
                  .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add))
          .append('\n');
        return sb.toString();
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace(",", " ");
    }
}