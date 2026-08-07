package co.ke.pesabank.customer.service;

import co.ke.pesabank.customer.repo.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
@RequiredArgsConstructor
public class AccountNumberGenerator {

    private final AccountRepository accountRepository;
    private static final SecureRandom RANDOM = new SecureRandom();

    public String generate() {
        for (int i = 0; i < 30; i++) {
            String number = String.format("%010d", RANDOM.nextInt(1_000_000_000));
            if (accountRepository.findByAccountNumber(number).isEmpty()) {
                return number;
            }
        }
        throw new IllegalStateException("Could not generate a unique account number");
    }
}