package co.ke.pesabank.teller.service;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.teller.domain.Till;
import co.ke.pesabank.teller.repo.TillRepository;
import co.ke.pesabank.shared.error.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TillService {

    private final TillRepository repo;
    private final AccountRepository accounts;

    public Till current(UUID tellerId) {
        return repo.findByTellerIdAndOpenTrue(tellerId).orElse(null);
    }

    @Transactional
    public Till open(UUID tellerId, BigDecimal openingBalance) {
        repo.findByTellerIdAndOpenTrue(tellerId).ifPresent(t -> {
            throw ApiException.badRequest("TILL_ALREADY_OPEN", "You already have an open till.");
        });
        if (openingBalance == null || openingBalance.signum() < 0) {
            throw ApiException.badRequest("INVALID_OPENING_BALANCE", "Opening balance must be zero or positive.");
        }
        Till till = new Till();
        till.setTellerId(tellerId);
        till.setOpen(true);
        till.setOpenedAt(Instant.now());
        till.setOpeningBalance(openingBalance);
        till.setExpectedCash(openingBalance);
        return repo.save(till);
    }

    @Transactional
    public Till close(UUID tellerId) {
        Till till = repo.findByTellerIdAndOpenTrue(tellerId)
                .orElseThrow(() -> ApiException.badRequest("TILL_NOT_OPEN", "You don't have an open till."));
        till.setOpen(false);
        till.setClosedAt(Instant.now());
        till.setExpectedCash(expectedCash(till));
        return repo.save(till);
    }

    public BigDecimal expectedCash(Till till) {
        // Cash in = opening + teller-cash deposits - teller-cash withdrawals.
        // Deposits increase drawer cash, withdrawals reduce it. Transfers do not touch cash.
        // The cash flows are stored against the teller via transactions performed in this window.
        // For simplicity in this service we compute from the till's own ledger:
        return till.getOpeningBalance()
                .add(nvl(till.getDeposits()))
                .subtract(nvl(till.getWithdrawals()));
    }

    private BigDecimal nvl(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}