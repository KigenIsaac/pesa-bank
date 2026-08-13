package co.ke.pesabank.teller.service;

import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.domain.TransactionType;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.shared.error.ApiException;
import co.ke.pesabank.shared.util.MoneyUtils;
import co.ke.pesabank.teller.domain.EodReport;
import co.ke.pesabank.teller.domain.Till;
import co.ke.pesabank.teller.repo.EodRepository;
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

@Service
@RequiredArgsConstructor
public class EodService {

    private final TillRepository tills;
    private final TransactionRepository transactions;
    private final EodRepository reports;

    public Map<String, Object> summary(User teller) {
        Till till = tills.findByTellerIdAndOpenTrue(teller.getId())
                .orElseThrow(() -> ApiException.badRequest("TILL_NOT_OPEN", "You don't have an open till."));

        Instant dayStart = LocalDate.now(ZoneId.of("Africa/Nairobi"))
                .atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();
        Instant dayEnd = LocalDate.now(ZoneId.of("Africa/Nairobi"))
                .plusDays(1).atStartOfDay(ZoneId.of("Africa/Nairobi")).toInstant();

        List<Transaction> today = transactions
                .findAllByPerformedByAndCreatedAtBetweenOrderByCreatedAtDesc(teller.getId(), dayStart, dayEnd);

        BigDecimal deposits = BigDecimal.ZERO;
        BigDecimal withdrawals = BigDecimal.ZERO;
        BigDecimal transfersOut = BigDecimal.ZERO;
        int depCount = 0;
        int wdCount = 0;

        for (Transaction t : today) {
            if (t.getType() == TransactionType.DEPOSIT) {
                deposits = deposits.add(t.getAmount());
                depCount++;
            } else if (t.getType() == TransactionType.WITHDRAWAL) {
                withdrawals = withdrawals.add(t.getAmount());
                wdCount++;
            } else if (t.getType() == TransactionType.TRANSFER) {
                transfersOut = transfersOut.add(t.getAmount());
            }
        }

        BigDecimal opening = till.getOpeningBalance() == null ? BigDecimal.ZERO : till.getOpeningBalance();
        BigDecimal expected = opening.add(deposits).subtract(withdrawals);

        Map<String, Object> body = new HashMap<>();
        body.put("openingBalance", opening);
        body.put("deposits", deposits);
        body.put("withdrawals", withdrawals);
        body.put("transfersOut", transfersOut);
        body.put("expectedCash", expected);
        body.put("depositsCount", depCount);
        body.put("withdrawalsCount", wdCount);
        body.put("transactionsCount", today.size());
        return body;
    }

    @Transactional
    public EodReport submit(User teller, BigDecimal rawCounted, String note) {
        Till till = tills.findByTellerIdAndOpenTrue(teller.getId())
                .orElseThrow(() -> ApiException.badRequest("TILL_NOT_OPEN", "You don't have an open till."));

        Map<String, Object> summary = summary(teller);
        BigDecimal expected = (BigDecimal) summary.get("expectedCash");
        BigDecimal counted = MoneyUtils.scale(rawCounted);

        EodReport report = new EodReport();
        report.setTellerId(teller.getId());
        report.setTellerName(teller.getFullName());
        report.setBusinessDate(Instant.now());
        report.setOpeningBalance((BigDecimal) summary.get("openingBalance"));
        report.setDeposits((BigDecimal) summary.get("deposits"));
        report.setWithdrawals((BigDecimal) summary.get("withdrawals"));
        report.setExpectedCash(expected);
        report.setCountedCash(counted);
        report.setVariance(counted.subtract(expected));
        report.setNote(note);
        reports.save(report);

        // Close the till
        till.setOpen(false);
        till.setClosedAt(Instant.now());
        till.setCountedCash(counted);
        till.setExpectedCash(expected);
        tills.save(till);

        return report;
    }
}