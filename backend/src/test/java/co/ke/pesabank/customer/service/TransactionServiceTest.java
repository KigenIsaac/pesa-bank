package co.ke.pesabank.customer.service;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.AccountStatus;
import co.ke.pesabank.customer.domain.Transaction;\nimport co.ke.pesabank.customer.domain.TransactionStatus;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.repo.TransactionRepository;
import co.ke.pesabank.shared.error.ApiException;
import co.ke.pesabank.shared.util.ReferenceGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock AccountRepository accounts;
    @Mock TransactionRepository transactions;
    @Mock ReferenceGenerator references;

    private TransactionService service;

    @BeforeEach
    void setUp() {
        service = new TransactionService(accounts, transactions, references);
        when(references.generate(any())).thenReturn("TXN-TEST");
        when(transactions.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void depositIncreasesBalanceAndRecordsTransaction() {
        Account account = accountWithBalance("100.00");

        Transaction tx = service.deposit(account, new BigDecimal("25.00"),
                "Cash deposit", UUID.randomUUID(), "TEST");

        assertEquals(new BigDecimal("125.00"), account.getBalance());
        assertEquals(new BigDecimal("125.00"), tx.getBalanceAfter());
        verify(accounts).save(account);
        verify(transactions).save(tx);
    }

    @Test
    void withdrawalRejectsInsufficientFunds() {
        Account account = accountWithBalance("10.00");

        ApiException ex = assertThrows(ApiException.class, () ->
                service.withdraw(account, new BigDecimal("25.00"),
                        "Cash withdrawal", UUID.randomUUID(), "TEST"));

        assertEquals("INSUFFICIENT_FUNDS", ex.getCode());
        assertEquals(new BigDecimal("10.00"), account.getBalance());
        verify(accounts, never()).save(any(Account.class));
    }

    @Test
    void transferUpdatesBothAccountsAtomically() {
        Account from = accountWithBalance("100.00");
        Account to = accountWithBalance("40.00");

        Transaction tx = service.transfer(from, to, new BigDecimal("25.00"),
                "Transfer", UUID.randomUUID(), "TEST");

        assertEquals(new BigDecimal("75.00"), from.getBalance());
        assertEquals(new BigDecimal("65.00"), to.getBalance());
        assertNotNull(tx);
        verify(accounts).save(from);
        verify(accounts).save(to);
        verify(transactions, times(4)).save(any(Transaction.class));
        assertEquals(tx.getId(), null == tx.getRelatedTransactionId() ? null : tx.getRelatedTransactionId());
    }

    @Test
    void transferReversalRestoresSourceAndDebitsDestination() {
        Account from = accountWithBalance("75.00");
        Account to = accountWithBalance("125.00");

        Transaction transfer = service.transfer(from, to, new BigDecimal("25.00"),
                "Transfer", UUID.randomUUID(), "TEST");
        Transaction incoming = new Transaction();
        incoming.setAccountId(to.getId());
        incoming.setAmount(new BigDecimal("25.00"));
        incoming.setRelatedTransactionId(transfer.getId());
        incoming.setStatus(TransactionStatus.COMPLETED);
        when(transactions.findById(transfer.getRelatedTransactionId()))
                .thenReturn(java.util.Optional.of(incoming));

        Transaction reversal = service.reverse(transfer, "Test reversal", UUID.randomUUID());

        assertEquals(new BigDecimal("100.00"), from.getBalance());
        assertEquals(new BigDecimal("100.00"), to.getBalance());
        assertEquals(TransactionStatus.REVERSED, transfer.getStatus());
        assertEquals(TransactionStatus.REVERSED, incoming.getStatus());
        assertNotNull(reversal);
    }

    private Account accountWithBalance(String balance) {
        Account account = new Account();
        account.setAccountNumber("10000001");
        account.setBalance(new BigDecimal(balance));
        account.setStatus(AccountStatus.ACTIVE);
        return account;
    }
}
