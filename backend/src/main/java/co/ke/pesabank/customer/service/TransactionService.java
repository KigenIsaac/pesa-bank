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
        to.setBalance(to.getBalance().add(amount));
        to.setLastTransactionAt(Instant.now());

        accounts.save(from);
        accounts.save(to);

        Transaction out = saveTransaction(from, TransactionType.TRANSFER, amount, description,
                performedBy, channel, "TRF");
        Transaction in = saveTransaction(to, TransactionType.DEPOSIT,
                amount, "Transfer from " + from.getAccountNumber(),
                performedBy, channel, "TXN");

        out.setRelatedTransactionId(in.getId());
        in.setRelatedTransactionId(out.getId());
        transactions.save(out);
        transactions.save(in);

        return out;
    }

    @Transactional
    public Transaction reverse(Transaction original, String reason, UUID performedBy) {
        if (original.getStatus() == TransactionStatus.REVERSED) {
            throw ApiException.badRequest("ALREADY_REVERSED", "This transaction has already been reversed.");
        }

        if (original.getType() == TransactionType.TRANSFER || original.getRelatedTransactionId() != null) {
            return reverseTransferPair(original, reason, performedBy);
        }

        Account account = accounts.findById(original.getAccountId())
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Account not found."));

        BigDecimal amount = original.getAmount();
        if (original.getType() == TransactionType.DEPOSIT) {
            if (account.getBalance().compareTo(amount) < 0) {
                throw ApiException.badRequest("INSUFFICIENT_FUNDS_FOR_REVERSAL",
                        "The account does not have enough balance to reverse this deposit.");
            }
            account.setBalance(account.getBalance().subtract(amount));
        } else if (original.getType() == TransactionType.WITHDRAWAL) {
            account.setBalance(account.getBalance().add(amount));
        } else {
            throw ApiException.badRequest("UNSUPPORTED_REVERSAL", "This transaction type cannot be reversed.");
        }

        account.setLastTransactionAt(Instant.now());
        accounts.save(account);

        original.setStatus(TransactionStatus.REVERSED);
        original.setReversalReason(reason);
        transactions.save(original);

        return saveReversal(account, original, amount, performedBy, reason, "REV");
    }

    private Transaction reverseTransferPair(Transaction original, String reason, UUID performedBy) {
        UUID relatedId = original.getRelatedTransactionId();
        if (relatedId == null) {
            throw ApiException.badRequest("TRANSFER_LINK_MISSING",
                    "This transfer cannot be safely reversed because its paired ledger entry is missing.");
        }

        Transaction related = transactions.findById(relatedId)
                .orElseThrow(() -> ApiException.notFound("RELATED_TRANSACTION_NOT_FOUND",
                        "The paired transfer entry could not be found."));

        if (related.getStatus() == TransactionStatus.REVERSED) {
            throw ApiException.badRequest("ALREADY_REVERSED", "This transfer has already been reversed.");
        }

        Transaction transferEntry = original.getType() == TransactionType.TRANSFER ? original : related;
        Transaction depositEntry = transferEntry == original ? related : original;

        Account source = accounts.findById(transferEntry.getAccountId())
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Source account not found."));
        Account destination = accounts.findById(depositEntry.getAccountId())
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Destination account not found."));

        BigDecimal amount = transferEntry.getAmount();
        if (destination.getBalance().compareTo(amount) < 0) {
            throw ApiException.badRequest("INSUFFICIENT_FUNDS_FOR_REVERSAL",
                    "The destination account does not have enough balance to reverse this transfer.");
        }

        source.setBalance(source.getBalance().add(amount));
        source.setLastTransactionAt(Instant.now());
        destination.setBalance(destination.getBalance().subtract(amount));
        destination.setLastTransactionAt(Instant.now());
        accounts.save(source);
        accounts.save(destination);

        transferEntry.setStatus(TransactionStatus.REVERSED);
        transferEntry.setReversalReason(reason);
        depositEntry.setStatus(TransactionStatus.REVERSED);
        depositEntry.setReversalReason(reason);
        transactions.save(transferEntry);
        transactions.save(depositEntry);

        Transaction sourceReversal = saveReversal(source, transferEntry, amount, performedBy, reason, "REV");
        Transaction destinationReversal = saveReversal(destination, depositEntry, amount, performedBy, reason, "REV");
        sourceReversal.setRelatedTransactionId(destinationReversal.getId());
        destinationReversal.setRelatedTransactionId(sourceReversal.getId());
        transactions.save(sourceReversal);
        transactions.save(destinationReversal);

        return sourceReversal;
    }

    private Transaction saveReversal(Account account, Transaction original, BigDecimal amount,
                                      UUID performedBy, String reason, String prefix) {
        Transaction reversal = new Transaction();
        reversal.setReference(referenceGenerator.generate(prefix));
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
