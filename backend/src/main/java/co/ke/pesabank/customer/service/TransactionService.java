package co.ke.pesabank.customer.service;

import co.ke.pesabank.customer.domain.*;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.shared.error.ApiException;
import co.ke.pesabank.shared.util.ReferenceGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final ReferenceGenerator referenceGenerator;

    @Transactional
    public Transaction deposit(Account account, BigDecimal amount, String description,
                               UUID performedBy, String channel) {
        requireActive(account);
        requirePositive(amount);

        account.setBalance(account.getBalance().add(amount));
        account.setLastTransactionAt(Instant.now());
        accounts.save(account);

        return saveTransaction(account, TransactionType.DEPOSIT, amount, description, performedBy, channel, "TXN");
    }

    @Transactional
    public Transaction withdraw(Account account, BigDecimal amount, String description,
                                UUID performedBy, String channel) {
        requireActive(account);
        requirePositive(amount);

        if (account.getBalance().compareTo(amount) < 0) {
            throw ApiException.badRequest("INSUFFICIENT_FUNDS", "Insufficient funds in the account.");
        }

        account.setBalance(account.getBalance().subtract(amount));
        account.setLastTransactionAt(Instant.now());
        accounts.save(account);

        return saveTransaction(account, TransactionType.WITHDRAWAL, amount, description, performedBy, channel, "TXN");
    }

    @Transactional
    public Transaction transfer(Account from, Account to, BigDecimal amount, String description,
                                UUID performedBy, String channel) {
        requireActive(from);
        requireActive(to);
        requirePositive(amount);

        if (from.getBalance().compareTo(amount) < 0) {
            throw ApiException.badRequest("INSUFFICIENT_FUNDS", "Insufficient funds in the source account.");
        }

        from.setBalance(from.getBalance().subtract(amount));
        from.setLastTransactionAt(Instant.now());
        accounts.save(from);

        to.setBalance(to.getBalance().add(amount));
        to.setLastTransactionAt(Instant.now());
        accounts.save(to);

        Transaction out = saveTransaction(from, TransactionType.TRANSFER, amount, description,
                performedBy, channel, "TRF");
        saveTransaction(to, TransactionType.DEPOSIT, amount, "Transfer from " + from.getAccountNumber(),
                performedBy, channel, "TXN");
        return out;
    }

    @Transactional
    public Transaction reverse(Transaction original, String reason, UUID performedBy) {
        if (original.getStatus() == TransactionStatus.REVERSED) {
            throw ApiException.badRequest("ALREADY_REVERSED", "This transaction has already been reversed.");
        }

        Account account = accounts.findById(original.getAccountId())
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));

        // Compensating entry
        BigDecimal amount = original.getAmount();
        switch (original.getType()) {
            case DEPOSIT -> {
                if (account.getBalance().compareTo(amount) < 0) {
                    throw ApiException.badRequest("INSUFFICIENT_FUNDS_FOR_REVERSAL",
                            "The account does not have enough balance to reverse this deposit.");
                }
                account.setBalance(account.getBalance().subtract(amount));
            }
            case WITHDRAWAL, TRANSFER -> account.setBalance(account.getBalance().add(amount));
        }

        account.setLastTransactionAt(Instant.now());
        accounts.save(account);

        original.setStatus(TransactionStatus.REVERSED);
        original.setReversalReason(reason);
        transactions.save(original);

        Transaction reversal = new Transaction();
        reversal.setReference(referenceGenerator.generate("REV"));
        reversal.setAccountId(account.getId());
        reversal.setType(original.getType());
        reversal.setAmount(amount);
        reversal.setBalanceAfter(account.getBalance());
        reversal.setDescription("Reversal of " + original.getReference());
        reversal.setStatus(TransactionStatus.COMPLETED);
        reversal.setPerformedBy(performedBy);
        reversal.setChannel("ADMIN");
        reversal.setReversalReason(reason);
        return transactions.save(reversal);
    }

    private Transaction saveTransaction(Account account, TransactionType type, BigDecimal amount,
                                        String description, UUID performedBy, String channel, String prefix) {
        Transaction tx = new Transaction();
        tx.setReference(referenceGenerator.generate(prefix));
        tx.setAccountId(account.getId());
        tx.setType(type);
        tx.setAmount(amount);
        tx.setBalanceAfter(account.getBalance());
        tx.setDescription(description);
        tx.setPerformedBy(performedBy);
        tx.setChannel(channel);
        return transactions.save(tx);
    }

    private void requireActive(Account account) {
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw ApiException.badRequest("ACCOUNT_NOT_ACTIVE", "This account is not active.");
        }
    }

    private void requirePositive(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_AMOUNT", "Amount must be greater than zero.");
        }
    }
}