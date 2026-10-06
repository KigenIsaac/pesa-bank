package co.ke.pesabank.customer.service;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.AccountType;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.kyc.domain.KycStatus;
import co.ke.pesabank.kyc.repo.KycRepository;
import co.ke.pesabank.notification.domain.NotificationType;
import co.ke.pesabank.notification.service.NotificationService;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.shared.error.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accounts;
    private final AccountNumberGenerator accountNumbers;
    private final KycRepository kyc;
    private final NotificationService notifications;

    @Transactional
    public Account openAccount(User user, AccountType type) {
        if (type == null || type == AccountType.FIXED_DEPOSIT) {
            throw ApiException.badRequest("INVALID_ACCOUNT_TYPE",
                    "Choose a supported account type: SAVINGS or CURRENT.");
        }

        var verification = kyc.findByUserId(user.getId())
                .orElseThrow(() -> ApiException.badRequest("KYC_REQUIRED",
                        "Complete KYC before opening a bank account."));

        if (verification.getStatus() != KycStatus.APPROVED) {
            throw ApiException.badRequest("KYC_NOT_APPROVED",
                    "Your KYC must be approved before opening a bank account.");
        }

        Account account = new Account();
        account.setUserId(user.getId());
        account.setAccountNumber(accountNumbers.generate());
        account.setType(type);
        account.setBalance(BigDecimal.ZERO);
        account.setCurrency("KES");

        Account saved = accounts.save(account);
        notifications.notify(user.getId(), NotificationType.ACCOUNT,
                "Account opened",
                "Your " + type.name().toLowerCase() + " account " + saved.getAccountNumber() + " is now active.",
                "/customer/accounts/" + saved.getId());

        return saved;
    }
}
