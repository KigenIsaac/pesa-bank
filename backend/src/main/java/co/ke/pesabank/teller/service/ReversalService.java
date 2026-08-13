package co.ke.pesabank.teller.service;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.customer.service.TransactionService;
import co.ke.pesabank.notification.domain.NotificationType;
import co.ke.pesabank.notification.service.NotificationService;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.shared.error.ApiException;
import co.ke.pesabank.teller.domain.ReversalRequest;
import co.ke.pesabank.teller.domain.ReversalStatus;
import co.ke.pesabank.teller.repo.ReversalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReversalService {

    private final ReversalRepository repo;
    private final TransactionRepository transactions;
    private final AccountRepository accounts;
    private final TransactionService txService;
    private final NotificationService notifications;

    @Transactional
    public ReversalRequest request(User teller, String reference, String reason) {
        Transaction tx = transactions.findByReference(reference)
                .orElseThrow(() -> ApiException.notFound("TXN_NOT_FOUND", "Transaction not found."));

        if (tx.getStatus() == co.ke.pesabank.customer.domain.TransactionStatus.REVERSED) {
            throw ApiException.badRequest("ALREADY_REVERSED", "This transaction is already reversed.");
        }

        Account account = accounts.findById(tx.getAccountId()).orElse(null);

        ReversalRequest r = new ReversalRequest();
        r.setTransactionId(tx.getId());
        r.setTransactionReference(tx.getReference());
        r.setAccountNumber(account != null ? account.getAccountNumber() : null);
        r.setAmount(tx.getAmount());
        r.setRequestedBy(teller.getId());
        r.setRequestedByName(teller.getFullName());
        r.setReason(reason.trim());
        r.setStatus(ReversalStatus.PENDING);
        return repo.save(r);
    }

    @Transactional
    public ReversalRequest approve(UUID id, User admin) {
        ReversalRequest r = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("REVERSAL_NOT_FOUND", "Reversal request not found."));

        if (r.getStatus() != ReversalStatus.PENDING) {
            throw ApiException.badRequest("ALREADY_DECIDED", "This reversal has already been decided.");
        }

        Transaction original = transactions.findById(r.getTransactionId())
                .orElseThrow(() -> ApiException.notFound("TXN_NOT_FOUND", "Original transaction not found."));

        txService.reverse(original, r.getReason(), admin.getId());

        r.setStatus(ReversalStatus.APPROVED);
        r.setDecidedAt(Instant.now());
        r.setDecidedBy(admin.getId());
        r.setDecidedByName(admin.getFullName());
        repo.save(r);

        notifications.notify(r.getRequestedBy(), NotificationType.TRANSACTION,
                "Reversal approved", "Your reversal request for " + r.getTransactionReference() + " was approved.",
                "/teller/reversals");

        return r;
    }

    @Transactional
    public ReversalRequest reject(UUID id, User admin) {
        ReversalRequest r = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("REVERSAL_NOT_FOUND", "Reversal request not found."));

        if (r.getStatus() != ReversalStatus.PENDING) {
            throw ApiException.badRequest("ALREADY_DECIDED", "This reversal has already been decided.");
        }

        r.setStatus(ReversalStatus.REJECTED);
        r.setDecidedAt(Instant.now());
        r.setDecidedBy(admin.getId());
        r.setDecidedByName(admin.getFullName());
        repo.save(r);

        notifications.notify(r.getRequestedBy(), NotificationType.TRANSACTION,
                "Reversal rejected", "Your reversal request for " + r.getTransactionReference() + " was rejected.",
                "/teller/reversals");

        return r;
    }
}