package co.ke.pesabank.customer.web;

import co.ke.pesabank.customer.domain.Account;
import co.ke.pesabank.customer.domain.Transaction;
import co.ke.pesabank.customer.repo.AccountRepository;
import co.ke.pesabank.customer.service.TransactionService;
import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.shared.error.ApiException;
import co.ke.pesabank.shared.util.MoneyUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CustomerTransferController {

    private final AccountRepository accounts;
    private final TransactionService transactions;
    private final AuditService audit;

    @PostMapping("/transfer")
    public ResponseEntity<Map<String, Object>> transfer(@Valid @RequestBody TransferRequest req) {
        User user = CurrentUser.get();

        Account from = accounts.findById(req.fromAccountId())
                .orElseThrow(() -> ApiException.notFound("ACCOUNT_NOT_FOUND", "Source account not found."));
        if (!from.getUserId().equals(user.getId())) {
            throw ApiException.forbidden("NOT_YOUR_ACCOUNT", "You don't have access to that account.");
        }

        BigDecimal amount = MoneyUtils.scale(req.amount());
        String description = switch (req.destination()) {
            case "OWN" -> "Transfer to own account";
            case "PESABANK" -> "Transfer to " + safe(req.toName(), req.toAccountNumber());
            case "MOBILE" -> "Mobile transfer to " + req.toAccountNumber();
            case "OTHER_BANK" -> "Transfer to " + safe(req.toBank(), "external bank")
                    + " · " + req.toAccountNumber();
            default -> "Transfer";
        };

        Transaction tx;
        switch (req.destination()) {
            case "OWN", "PESABANK" -> {
                Account to = accounts.findByAccountNumber(req.toAccountNumber())
                        .orElseThrow(() -> ApiException.notFound("DESTINATION_NOT_FOUND",
                                "Destination account not found."));
                if (to.getId().equals(from.getId())) {
                    throw ApiException.badRequest("SAME_ACCOUNT", "Source and destination cannot be the same.");
                }
                tx = transactions.transfer(from, to, amount, description, user.getId(), "CUSTOMER_APP");
            }
            case "MOBILE", "OTHER_BANK" -> {
                // External outflow — recorded as a transfer out of the source account.
                tx = transactions.withdraw(from, amount, description, user.getId(), "CUSTOMER_APP");
                // Cast to transfer type for reporting
            }
            default -> throw ApiException.badRequest("INVALID_DESTINATION", "Unknown destination type.");
        }

        audit.record(user, "TRANSFER_INITIATED", tx.getReference(),
                "Amount " + amount + " via " + req.destination());

        return ResponseEntity.ok(Map.of(
                "reference", tx.getReference(),
                "amount", amount,
                "status", tx.getStatus().name()));
    }

    private String safe(String primary, String fallback) {
        return (primary == null || primary.isBlank()) ? fallback : primary;
    }

    public record TransferRequest(
            @NotNull UUID fromAccountId,
            @NotBlank String destination,
            @NotBlank String toAccountNumber,
            String toName,
            String toBank,
            @NotNull BigDecimal amount,
            String note) {}
}