package co.ke.pesabank.config;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.AccountType;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.service.AccountNumberGenerator;
import co.ke.pesabank.kyc.domain.*;
import co.ke.pesabank.kyc.repo.KycRepository;
import co.ke.pesabank.payee.domain.Payee;
import co.ke.pesabank.payee.domain.PayeeCategory;
import co.ke.pesabank.payee.repo.PayeeRepository;
import co.ke.pesabank.security.domain.Role;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.domain.UserStatus;
import co.ke.pesabank.security.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final UserRepository users;
    private final AccountRepository accounts;
    private final KycRepository kyc;
    private final PayeeRepository payees;
    private final PasswordEncoder encoder;
    private final AccountNumberGenerator accountNumbers;

    @Value("${pesabank.seed.enabled:false}")
    private boolean enabled;

    @Value("${pesabank.seed.password:}")
    private String seedPassword;

    @Bean
    public ApplicationRunner seedData() {
        return args -> {
            if (!enabled) return;
            if (users.count() > 0) {
                log.info("Seed skipped — users already exist");
                return;
            }

            if (seedPassword == null || seedPassword.isBlank()) {
                throw new IllegalStateException("SEED_ENABLED=true requires SEED_PASSWORD to be configured.");
            }
            String hash = encoder.encode(seedPassword);

            User customer = createUser("Asha Wanjiru", "customer@pesabank.co.ke", "+254712345678", Role.CUSTOMER, hash);
            User teller = createUser("Brian Otieno", "teller@pesabank.co.ke", "+254723456789", Role.TELLER, hash);
            User admin = createUser("Faith Kamau", "admin@pesabank.co.ke", "+254734567890", Role.ADMIN, hash);

            // Customer account + approved KYC
            Account savings = new Account();
            savings.setUserId(customer.getId());
            savings.setAccountNumber(accountNumbers.generate());
            savings.setType(AccountType.SAVINGS);
            savings.setBalance(new BigDecimal("125000.00"));
            accounts.save(savings);

            Account current = new Account();
            current.setUserId(customer.getId());
            current.setAccountNumber(accountNumbers.generate());
            current.setType(AccountType.CURRENT);
            current.setBalance(new BigDecimal("48000.00"));
            accounts.save(current);

            KycRecord kycRecord = new KycRecord();
            kycRecord.setUserId(customer.getId());
            kycRecord.setStatus(KycStatus.APPROVED);
            kycRecord.setFullName(customer.getFullName());
            kycRecord.setDateOfBirth(LocalDate.of(1994, 3, 12));
            kycRecord.setGender("FEMALE");
            kycRecord.setMaritalStatus("SINGLE");
            kycRecord.setNationality("Kenyan");
            kycRecord.setIdType(IdType.NATIONAL_ID);
            kycRecord.setIdNumber("34567890");
            kycRecord.setKraPin("A012345678Z");
            kycRecord.setPhysicalAddress("Kilimani, Argwings Kodhek Road");
            kycRecord.setTown("Nairobi");
            kycRecord.setCounty("Nairobi");
            kycRecord.setEmploymentStatus(EmploymentStatus.EMPLOYED);
            kycRecord.setEmployerName("Safaricom PLC");
            kycRecord.setOccupation("Software Engineer");
            kycRecord.setMonthlyIncome("200001-500000");
            kycRecord.setSourceOfFunds("EMPLOYMENT");
            kycRecord.setAccountPurpose(AccountPurpose.SALARY);
            kycRecord.setNokName("Grace Wanjiru");
            kycRecord.setNokRelationship("PARENT");
            kycRecord.setNokPhone("+254798765432");
            kycRecord.setPep(false);
            kycRecord.setReviewedAt(java.time.Instant.now());
            kycRecord.setReviewerName("Faith Kamau");
            kycRecord.setReviewedBy(admin.getId());
            kyc.save(kycRecord);

            // Payees
            savePayee("KPLC Prepaid", PayeeCategory.UTILITIES, "888880");
            savePayee("Nairobi Water", PayeeCategory.WATER, "444440");
            savePayee("Safaricom Airtime", PayeeCategory.AIRTIME, "555550");
            savePayee("DStv Kenya", PayeeCategory.TV, "666660");
            savePayee("Zuku Internet", PayeeCategory.INTERNET, "777770");
            savePayee("Faulu Loan", PayeeCategory.LOAN, "999990");

            log.info("Seeded demo accounts — customer: {} | teller: {} | admin: {}",
                    customer.getEmail(), teller.getEmail(), admin.getEmail());
        };
    }

    private User createUser(String name, String email, String phone, Role role, String hash) {
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setPhone(phone);
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        u.setPasswordHash(hash);
        return users.save(u);
    }

    private void savePayee(String name, PayeeCategory category, String number) {
        Payee p = new Payee();
        p.setName(name);
        p.setCategory(category);
        p.setAccountNumber(number);
        payees.save(p);
    }
}