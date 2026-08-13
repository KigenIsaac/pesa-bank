package co.ke.pesabank.teller.web;

import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.security.web.CurrentUser;
import co.ke.pesabank.shared.audit.AuditService;
import co.ke.pesabank.teller.domain.ReversalRequest;
import co.ke.pesabank.teller.repo.ReversalRepository;
import co.ke.pesabank.teller.service.ReversalService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teller/reversals")
@RequiredArgsConstructor
public class TellerReversalController {

    private final ReversalService service;
    private final ReversalRepository repo;
    private final AuditService audit;

    @GetMapping
    public List<Map<String, Object>> list() {
        User teller = CurrentUser.get();
        return repo.findAllByRequestedByOrderByCreatedAtDesc(teller.getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateRequest req) {
        User teller = CurrentUser.get();
        ReversalRequest r = service.request(teller, req.transactionReference(), req.reason());
        audit.record(teller, "REVERSAL_REQUESTED", r.getTransactionReference(), req.reason());
        return ResponseEntity.ok(toDto(r));
    }

    private Map<String, Object> toDto(ReversalRequest r) {
        return Map.ofEntries(
                Map.entry("id", r.getId()),
                Map.entry("transactionId", r.getTransactionId()),
                Map.entry("transactionReference", r.getTransactionReference()),
                Map.entry("accountNumber", r.getAccountNumber() != null ? r.getAccountNumber() : ""),
                Map.entry("amount", r.getAmount() != null ? r.getAmount() : 0),
                Map.entry("currency", "KES"),
                Map.entry("reason", r.getReason()),
                Map.entry("status", r.getStatus().name()),
                Map.entry("requestedAt", r.getCreatedAt()),
                Map.entry("decidedAt", r.getDecidedAt() != null ? r.getDecidedAt() : ""),
                Map.entry("decidedBy", r.getDecidedByName() != null ? r.getDecidedByName() : "")
        );
    }

    public record CreateRequest(
            @NotBlank String transactionReference,
            @NotBlank String reason) {}
}